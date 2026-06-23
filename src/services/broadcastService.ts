import cron from 'node-cron';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    EmbedBuilder,
    type ButtonInteraction,
    type GuildTextBasedChannel
} from 'discord.js';
import { generateAIQuestion } from '../utils/aiGenerator.js';
import { dbManager } from '../utils/db.js';

type Topic = 'webdev' | 'databases' | 'os' | 'networking' | 'cybersecurity';
type Answer = 'a' | 'b' | 'c' | 'd';

type QuizData = {
    topic: Topic;
    question: string;
    options: Record<Answer, string>;
    correct: Answer;
    explanation: string;
};

type LiveQuestion = {
    questionId: string;
    correctAnswer: Answer;
    messageId: string;
    answers: Map<string, { answer: Answer, timestamp: number }>;
    isExpired: boolean;
};

function isAnswer(value: string | undefined): value is Answer {
    return value === 'a' || value === 'b' || value === 'c' || value === 'd';
}

class BroadcastService {
    private client: Client | null = null;
    private currentQuestion: LiveQuestion | null = null;
    private lastQuizData: QuizData | null = null;
    private topics: Topic[] = ['webdev', 'databases', 'os', 'networking', 'cybersecurity'];
    private dynamicDuration = 60000; // Default to 60s

    public init(client: Client) {
        this.client = client;
        
        const intervalCron = process.env.DROP_INTERVAL || '*/30 * * * *';
        const minutePart = intervalCron.split(' ')[0];

        // Calculate dynamic duration based on interval
        this.calculateDuration(minutePart);

        console.log(`Broadcast Service initialized.`);
        console.log(`Active Windows: 08:00-14:00 and 15:00-23:00`);
        console.log(`Frequency: ${minutePart} minutes`);
        console.log(`Auto-Reveal Duration: ${this.dynamicDuration / 1000} seconds`);

        cron.schedule(`${minutePart} 8-13 * * *`, () => {
            void this.dropQuestion();
        });

        cron.schedule(`${minutePart} 15-22 * * *`, () => {
            void this.dropQuestion();
        });
    }

    private calculateDuration(minutePart: string) {
        let intervalMinutes = 30; // Default

        if (minutePart === '*') {
            intervalMinutes = 1;
        } else if (minutePart.startsWith('*/')) {
            const val = parseInt(minutePart.substring(2));
            if (!isNaN(val)) intervalMinutes = val;
        } else {
            // Specific minute (e.g., "0"), treat as 60m for duration logic
            intervalMinutes = 60;
        }

        // Rule: 50% of the interval, capped between 30s and 120s
        const calculated = intervalMinutes * 60 * 0.5;
        this.dynamicDuration = Math.max(30000, Math.min(120000, calculated));
    }

    private async getBroadcastChannel(): Promise<GuildTextBasedChannel | null> {
        if (!this.client) return null;
        const channelId = process.env.BROADCAST_CHANNEL_ID;
        if (!channelId) return null;

        const channel = await this.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased() || channel.isDMBased()) return null;
        return channel as GuildTextBasedChannel;
    }

    private async dropQuestion() {
        const channel = await this.getBroadcastChannel();
        if (!channel) return;

        try {
            const topic = this.topics[Math.floor(Math.random() * this.topics.length)];
            const quizData = await generateAIQuestion(topic);
            const questionId = `bc_${Date.now()}`;

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('⚡ LIVE KNOWLEDGE DROP!')
                .setDescription(`**Topic: ${topic.toUpperCase()}**\n\n${quizData.question}\n\n⏱️ **You have ${this.dynamicDuration / 1000} seconds to lock in your answer!**`)
                .addFields(
                    { name: 'A', value: quizData.options.a, inline: true },
                    { name: 'B', value: quizData.options.b, inline: true },
                    { name: 'C', value: quizData.options.c, inline: true },
                    { name: 'D', value: quizData.options.d, inline: true }
                )
                .setFooter({ text: 'Lock in your answer using the buttons below!' })
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId(`broadcast_${questionId}_a`).setLabel('A').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`broadcast_${questionId}_b`).setLabel('B').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`broadcast_${questionId}_c`).setLabel('C').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`broadcast_${questionId}_d`).setLabel('D').setStyle(ButtonStyle.Secondary)
            );

            const message = await channel.send({ embeds: [embed], components: [row] });

            this.currentQuestion = {
                questionId,
                correctAnswer: quizData.correct,
                messageId: message.id,
                answers: new Map(),
                isExpired: false,
            };
            this.lastQuizData = { ...quizData, topic };

            // Start the expiration timer
            setTimeout(() => this.finalizeQuestion(channel), this.dynamicDuration);

        } catch (error) {
            console.error('Error dropping broadcast question:', error);
        }
    }

    private async finalizeQuestion(channel: GuildTextBasedChannel) {
        if (!this.currentQuestion || !this.lastQuizData) return;

        this.currentQuestion.isExpired = true;
        const { questionId, correctAnswer, answers, messageId } = this.currentQuestion;
        const { topic, options, explanation } = this.lastQuizData;

        // 1. Remove buttons from the original message
        try {
            const message = await channel.messages.fetch(messageId);
            await message.edit({ components: [] });
        } catch (e) {
            console.error('Could not edit original broadcast message:', e);
        }

        // 2. Determine winners
        const winners: string[] = [];
        for (const [userId, data] of answers.entries()) {
            if (data.answer === correctAnswer) {
                winners.push(`<@${userId}>`);
                
                // Award K-XP to winners
                dbManager.ensureUser(userId, 'User'); // Update username later if needed
                dbManager.addUserXp(userId, topic, 25, 'User');
            }
        }

        // 3. Create the reveal embed
        const revealEmbed = new EmbedBuilder()
            .setColor(winners.length > 0 ? '#57F287' : '#ED4245')
            .setTitle('🏁 TIME IS UP!')
            .setDescription(`**Topic: ${topic.toUpperCase()}**\n\n${this.lastQuizData?.question}`)
            .addFields(
                { name: 'Correct Answer', value: `**${correctAnswer.toUpperCase()}) ${options[correctAnswer]}**`, inline: false },
                { name: 'Explanation', value: explanation, inline: false }
            )
            .setTimestamp();

        if (winners.length > 0) {
            revealEmbed.addFields({ 
                name: '🏆 Winners', 
                value: winners.join(', '), 
                inline: false 
            });
            revealEmbed.setFooter({ text: `Congrats to the ${winners.length} winners! +25 K-XP each.` });
        } else {
            revealEmbed.addFields({ 
                name: '❌ Results', 
                value: 'No one got the correct answer this time!', 
                inline: false 
            });
            revealEmbed.setFooter({ text: 'Better luck next time!' });
        }

        await channel.send({ embeds: [revealEmbed] });

        // Clear state for next question
        this.currentQuestion = null;
        this.lastQuizData = null;
    }

    public async handleInteraction(interaction: ButtonInteraction) {
        if (!this.currentQuestion) {
            return interaction.reply({ content: 'This question has already expired!', ephemeral: true });
        }

        if (this.currentQuestion.isExpired) {
            return interaction.reply({ content: 'Too late! The answer has already been revealed.', ephemeral: true });
        }

        const parts = interaction.customId.split('_');
        const answer = parts.at(-1);
        const questionId = parts.slice(1, -1).join('_');

        if (questionId !== this.currentQuestion.questionId) {
            return interaction.reply({ content: 'This question has already expired!', ephemeral: true });
        }

        if (!isAnswer(answer)) {
            return interaction.reply({ content: 'Invalid answer.', ephemeral: true });
        }

        // Lock in the answer
        this.currentQuestion.answers.set(interaction.user.id, {
            answer: answer,
            timestamp: Date.now(),
        });

        await interaction.reply({ 
            content: `Answer **${answer.toUpperCase()}** locked in! 🔒 Wait for the reveal...`, 
            ephemeral: true 
        });
    }
}

export const broadcastService = new BroadcastService();
