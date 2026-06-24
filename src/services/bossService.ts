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

type Answer = 'a' | 'b' | 'c' | 'd';

type BossQuestion = {
    questionId: string;
    correctAnswer: Answer;
    data: any;
    messageId: string;
};

class BossService {
    private client: Client | null = null;
    private currentBoss: BossQuestion | null = null;

    public init(client: Client) {
        this.client = client;
        // Schedule for every day at 12:00 PM (Midday)
        cron.schedule('0 12 * * *', () => {
            void this.dropBossQuestion();
        });
        console.log('Boss Service initialized. Daily Boss drops at 12:00 PM.');
    }

    private async getBossChannel(): Promise<GuildTextBasedChannel | null> {
        if (!this.client) return null;
        const channelId = process.env.BROADCAST_CHANNEL_ID;
        if (!channelId) return null;

        const channel = await this.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased() || channel.isDMBased()) return null;
        return channel as GuildTextBasedChannel;
    }

    private async dropBossQuestion() {
        const channel = await this.getBroadcastChannel();
        if (!channel) return;

        try {
            const topic = ['webdev', 'databases', 'os', 'networking', 'cybersecurity'][Math.floor(Math.random() * 5)];
            const quizData = await generateAIQuestion(topic, 'deep'); 

            const questionId = `boss_${Date.now()}`;
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('👹 THE DAILY BOSS HAS APPEARED!')
                .setDescription(`**Topic: ${topic.toUpperCase()}**\n\n${quizData.question}\n\n⚠️ **WARNING:** You only have ONE attempt. Choose wisely!`)
                .addFields(
                    { name: 'A', value: quizData.options.a, inline: true },
                    { name: 'B', value: quizData.options.b, inline: true },
                    { name: 'C', value: quizData.options.c, inline: true },
                    { name: 'D', value: quizData.options.d, inline: true },
                )
                .setFooter({ text: 'Massive K-XP Reward for the winners!' })
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId(`boss_${questionId}_a`).setLabel('A').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`boss_${questionId}_b`).setLabel('B').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`boss_${questionId}_c`).setLabel('C').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`boss_${questionId}_d`).setLabel('D').setStyle(ButtonStyle.Danger),
            );

            const message = await channel.send({ embeds: [embed], components: [row] });

            this.currentBoss = {
                questionId,
                correctAnswer: quizData.correct,
                data: quizData,
                messageId: message.id,
            };
        } catch (error) {
            console.error('Error dropping Boss question:', error);
        }
    }

    public async handleInteraction(interaction: ButtonInteraction) {
        if (!this.currentBoss) {
            return interaction.reply({ content: 'The Boss has already vanished!', ephemeral: true });
        }

        const parts = interaction.customId.split('_');
        const answer = parts.at(-1);
        const questionId = parts.slice(1, -1).join('_');

        if (questionId !== this.currentBoss.questionId) {
            return interaction.reply({ content: 'This Boss question is outdated!', ephemeral: true });
        }

        if (dbManager.hasAttemptedBoss(interaction.user.id)) {
            return interaction.reply({ content: '❌ You have already used your one attempt for today\'s Boss!', ephemeral: true });
        }

        dbManager.recordBossAttempt(interaction.user.id);

        if (answer === this.currentBoss.correctAnswer) {
            // Ensure user exists in the DB before adding points to avoid Foreign Key constraints
            dbManager.ensureUser(interaction.user.id, interaction.user.username);

            const bossXp = 100;
            dbManager.addUserXp(interaction.user.id, 'boss', bossXp, interaction.user.username);

            const winEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👑 BOSS SLAYER!')
                .setDescription(`Congratulations <@${interaction.user.id}>! You conquered the Daily Boss.`)
                .addFields(
                    { name: 'Correct Answer', value: `${answer?.toUpperCase()}) ${this.currentBoss.data.options[answer as Answer]}`, inline: false },
                    { name: 'Reward', value: `+${bossXp} K-XP`, inline: false }
                )
                .setTimestamp();

            const channel = interaction.channel as GuildTextBasedChannel;
            await channel.send({ embeds: [winEmbed] });
            await interaction.reply({ content: 'You defeated the Boss!' });
        } else {
            await interaction.reply({ content: '❌ Incorrect! Your one attempt for today is gone.', ephemeral: true });
        }
    }
}

export const bossService = new BossService();
