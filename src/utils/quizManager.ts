import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message } from 'discord.js';
import { dbManager } from './db.js';

export interface QuizSession {
    userId: string;
    channelId: string;
    topic: string;
    difficulty: string;
    questions: any[];
    currentIndex: number;
    score: number;
    startTime: number;
}

const activeSessions = new Map<string, QuizSession>();

export const quizManager = {
    hasActiveSession: (userId: string, channelId: string) => {
        for (const session of activeSessions.values()) {
            if (session.userId === userId && session.channelId === channelId) {
                return true;
            }
        }
        return false;
    },

    async startSession(interaction: any, topic: string, difficulty: string, length: number) {
        if (this.hasActiveSession(interaction.user.id, interaction.channelId)) {
            return interaction.reply({ content: '❌ You already have an active quiz in this channel!', ephemeral: true });
        }

        const questions = dbManager.getCuratedQuestions(topic, difficulty);
        
        if (questions.length === 0) {
            return interaction.reply({ content: `❌ No curated questions found for ${topic} at ${difficulty} difficulty.`, ephemeral: true });
        }

        // Shuffle and slice to the desired length
        const selectedQuestions = questions
            .sort(() => Math.random() - 0.5)
            .slice(0, length);

        const session: QuizSession = {
            userId: interaction.user.id,
            channelId: interaction.channelId,
            topic,
            difficulty,
            questions: selectedQuestions,
            currentIndex: 0,
            score: 0,
            startTime: Date.now(),
        };

        activeSessions.set(interaction.user.id, session);
        return this.sendQuestion(interaction, session);
    },

    async sendQuestion(interaction: any, session: QuizSession) {
        const question = session.questions[session.currentIndex];
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📚 ${session.topic} Quiz (${session.difficulty})`)
            .setDescription(`**Question ${session.currentIndex + 1}/${session.questions.length}**\n\n${question.question}`)
            .addFields(
                { name: 'A', value: question.option_a, inline: true },
                { name: 'B', value: question.option_b, inline: true },
                { name: 'C', value: question.option_c, inline: true },
                { name: 'D', value: question.option_d, inline: true },
            )
            .setFooter({ text: `Current Score: ${session.score}` });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`q_${session.userId}_${session.currentIndex}_a`).setLabel('A').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`q_${session.userId}_${session.currentIndex}_b`).setLabel('B').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`q_${session.userId}_${session.currentIndex}_c`).setLabel('C').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`q_${session.userId}_${session.currentIndex}_d`).setLabel('D').setStyle(ButtonStyle.Primary),
        );

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [embed], components: [row] });
        } else {
            await interaction.reply({ embeds: [embed], components: [row] });
        }
    },

    async handleAnswer(interaction: any) {
        const [prefix, userId, indexStr, answer] = interaction.customId.split('_');
        if (prefix !== 'q') return;

        const session = activeSessions.get(userId);
        if (!session) return interaction.reply({ content: '❌ Session expired or not found.', ephemeral: true });
        if (session.userId !== interaction.user.id) return interaction.reply({ content: '❌ This is not your quiz!', ephemeral: true });
        
        const index = parseInt(indexStr);
        if (index !== session.currentIndex) {
            return interaction.reply({ content: '❌ This answer is for a previous question!', ephemeral: true });
        }

        const question = session.questions[session.currentIndex];
        const isCorrect = answer.toUpperCase() === question.correct.toUpperCase();

        // Disable buttons to prevent re-clicking
        await interaction.message.edit({ components: [] });

        if (isCorrect) {
            session.score++;
            
            // Formula: (BaseDifficultyPoints * Multiplier) / TimeTakenSeconds
            const timeTaken = Math.max(1, (Date.now() - session.startTime) / 1000); // Minimum 1s to avoid infinity
            const basePoints = { 'Easy': 50, 'Medium': 100, 'Hard': 200 }[session.difficulty] || 50;
            const multiplier = { 'Easy': 1, 'Medium': 1.5, 'Hard': 2 }[session.difficulty] || 1;
            
            const earnedXp = Math.round((basePoints * multiplier) / (timeTaken / 10)); // Normalized time (per 10s)
            
            dbManager.addUserXp(interaction.user.id, session.topic, earnedXp, interaction.user.username);
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(isCorrect ? '#57F287' : '#ED4245')
            .setTitle(isCorrect ? '✅ Correct!' : '❌ Incorrect')
            .setDescription(`**Explanation:** ${question.explanation}`)
            .addFields({ name: 'Correct Answer', value: `${question.correct}) ${this.getOptionText(question, question.correct)}` });

        await interaction.reply({ embeds: [resultEmbed], ephemeral: true });

        session.currentIndex++;

        if (session.currentIndex < session.questions.length) {
            setTimeout(() => this.sendQuestion(interaction, session), 2000);
        } else {
            const totalTime = Math.floor((Date.now() - session.startTime) / 1000);
            const finalEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎉 Quiz Completed!')
                .setDescription(`You finished the **${session.topic}** quiz!`)
                .addFields(
                    { name: 'Score', value: `${session.score}/${session.questions.length}`, inline: true },
                    { name: 'Time Taken', value: `${totalTime}s`, inline: true }
                );

            await interaction.channel.send({ embeds: [finalEmbed] });
            activeSessions.delete(userId);
        }
    },

    getOptionText(question: any, key: string) {
        const map: any = { 'A': question.option_a, 'B': question.option_b, 'C': question.option_c, 'D': question.option_d };
        return map[key.toUpperCase()] || 'N/A';
    }
};
