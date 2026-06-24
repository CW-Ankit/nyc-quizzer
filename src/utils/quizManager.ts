import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Client } from 'discord.js';
import { dbManager } from './db.js';
import { roleManager } from './roleManager.js';
import { generateAIQuestions } from './aiGenerator.js';

export interface QuizSession {
    userId: string;
    channelId: string;
    topic: string;
    difficulty: string;
    questions: any[];
    currentIndex: number;
    score: number;
    startTime: number;
    perQuestionDuration: number; // in milliseconds
    timeoutId?: NodeJS.Timeout;
}

const activeSessions = new Map<string, QuizSession>();
let botClient: Client | null = null;

export const quizManager = {
    setClient: (client: Client) => {
        botClient = client;
    },

    getSessionKey: (userId: string, channelId: string) => `${userId}:${channelId}`,

    hasActiveSession: (userId: string, channelId: string) => {
        return activeSessions.has(quizManager.getSessionKey(userId, channelId));
    },

    async startSetSession(interaction: any, identifier: string | number) {
        let questions: any[];
        let setDetails: any;

        if (typeof identifier === 'number') {
            questions = dbManager.getQuestionsBySetId(identifier);
            // We might need a helper for getting set details by ID
            setDetails = dbManager.getSetDetails(identifier.toString()); 
        } else {
            questions = dbManager.getQuestionsBySet(identifier);
            setDetails = dbManager.getSetDetails(identifier);
        }

        if (!questions || questions.length === 0) {
            return interaction.reply({ content: `❌ Question set not found or is empty.`, ephemeral: true });
        }

        // Visibility Check
        if (setDetails?.visibility === 'event') {
            if (!roleManager.isQuizMaster(interaction.member)) {
                return interaction.reply({ content: '❌ This is an event set and can only be started by a Quiz Master.', ephemeral: true });
            }
        } else {
            const roleId = process.env.NOT_YOUR_PAL_ROLE_ID;
            if (!interaction.member.roles.cache.has(roleId)) {
                return interaction.reply({ content: '❌ You must be verified (Not your Pal) to start public sets.', ephemeral: true });
            }
        }

        const topic = questions[0].topic;
        const difficulty = questions[0].difficulty;

        const session: QuizSession = {
            userId: interaction.user.id,
            channelId: interaction.channelId,
            topic,
            difficulty,
            questions,
            currentIndex: 0,
            score: 0,
            startTime: Date.now(),
            perQuestionDuration: 30000,
        };

        activeSessions.set(this.getSessionKey(interaction.user.id, interaction.channelId), session);
        return this.sendQuestion(interaction, session);
    },

    async startCustomSession(interaction: any, topic: string, difficulty: string, length: number, durationSeconds: number) {
        await interaction.deferReply();
        try {
            const questions = await generateAIQuestions(topic, length, 'quick');
            
            const session: QuizSession = {
                userId: interaction.user.id,
                channelId: interaction.channelId,
                topic,
                difficulty,
                questions,
                currentIndex: 0,
                score: 0,
                startTime: Date.now(),
                perQuestionDuration: durationSeconds * 1000,
            };

            activeSessions.set(this.getSessionKey(interaction.user.id, interaction.channelId), session);
            return this.sendQuestion(interaction, session);
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '❌ Failed to generate custom AI quiz. Please try again later.' });
        }
    },

    async sendQuestion(interaction: any, session: QuizSession) {
        const question = session.questions[session.currentIndex];
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📚 ${session.topic} Quiz`)
            .setDescription(`**Question ${session.currentIndex + 1}/${session.questions.length}**\n\n${question.question}\n\n⏱️ **Time limit: ${session.perQuestionDuration / 1000}s**`)
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

        const response = interaction.replied || interaction.deferred 
            ? await interaction.followUp({ embeds: [embed], components: [row] })
            : await interaction.reply({ embeds: [embed], components: [row] });

        // Set up timeout for this question
        if (session.timeoutId) clearTimeout(session.timeoutId);
        session.timeoutId = setTimeout(() => this.handleTimeout(interaction, session), session.perQuestionDuration);
    },

    async handleTimeout(interaction: any, session: QuizSession) {
        const question = session.questions[session.currentIndex];
        
        const timeoutEmbed = new EmbedBuilder()
            .setColor('#B9BBBE') // Grey for skipped/neutral
            .setTitle('⏰ Time Out!')
            .setDescription(`Time is up for this question. It has been skipped.\n\n**Correct Answer:** ${question.correct.toUpperCase()}) ${this.getOptionText(question, question.correct)}\n\n**Explanation:** ${question.explanation}`)
            .setFooter({ text: `Current Score: ${session.score}` });

        await interaction.channel.send({ 
            content: `<@${session.userId}>, you ran out of time! This question was skipped.`, 
            embeds: [timeoutEmbed] 
        });

        session.currentIndex++;
        if (session.currentIndex < session.questions.length) {
            this.sendQuestionNewMessage(interaction, session);
        } else {
            this.completeQuiz(interaction, session);
        }
    },

    async sendQuestionNewMessage(interaction: any, session: QuizSession) {
        const question = session.questions[session.currentIndex];
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📚 ${session.topic} Quiz`)
            .setDescription(`**Question ${session.currentIndex + 1}/${session.questions.length}**\n\n${question.question}\n\n⏱️ **Time limit: ${session.perQuestionDuration / 1000}s**`)
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

        await interaction.channel.send({ embeds: [embed], components: [row] });
        
        if (session.timeoutId) clearTimeout(session.timeoutId);
        session.timeoutId = setTimeout(() => this.handleTimeout(interaction, session), session.perQuestionDuration);
    },

    async handleAnswer(interaction: any) {
        const [prefix, userId, indexStr, answer] = interaction.customId.split('_');
        if (prefix !== 'q') return;

        const sessionKey = this.getSessionKey(userId, interaction.channelId);
        const session = activeSessions.get(sessionKey);
        if (!session) return interaction.reply({ content: '❌ Session expired or not found.', ephemeral: true });
        if (session.userId !== interaction.user.id) return interaction.reply({ content: '❌ This is not your quiz!', ephemeral: true });
        
        const index = parseInt(indexStr);
        if (index !== session.currentIndex) {
            return interaction.reply({ content: '❌ This answer is for a previous question!', ephemeral: true });
        }

        if (session.timeoutId) clearTimeout(session.timeoutId);

        const question = session.questions[session.currentIndex];
        const isCorrect = answer.toUpperCase() === question.correct.toUpperCase();

        await interaction.message.edit({ components: [] });

        if (isCorrect) {
            session.score++;
            
            // Ensure user exists in the DB before adding points to avoid Foreign Key constraints
            dbManager.ensureUser(interaction.user.id, interaction.user.username);

            const timeTaken = Math.max(1, (Date.now() - session.startTime) / 1000);
            const basePoints = { 'Easy': 50, 'Medium': 100, 'Hard': 200 }[session.difficulty] || 50;
            const multiplier = { 'Easy': 1, 'Medium': 1.5, 'Hard': 2 }[session.difficulty] || 1;
            const earnedXp = Math.round((basePoints * multiplier) / (timeTaken / 10));
            
            const totalTopicXp = dbManager.addUserXp(interaction.user.id, session.topic, earnedXp, interaction.user.username);
            if (botClient) {
                await roleManager.checkAndGrantRole(botClient, interaction.user.id, session.topic, totalTopicXp);
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(isCorrect ? '#57F287' : '#ED4245')
            .setTitle(isCorrect ? '✅ Correct!' : '❌ Incorrect')
            .setDescription(`**Explanation:** ${question.explanation}`)
            .addFields({ name: 'Correct Answer', value: `${question.correct}) ${this.getOptionText(question, question.correct)}` });

        await interaction.reply({ embeds: [resultEmbed], ephemeral: true });

        session.currentIndex++;

        if (session.currentIndex < session.questions.length) {
            setTimeout(() => this.sendQuestionNewMessage(interaction, session), 2000);
        } else {
            this.completeQuiz(interaction, session);
        }
    },

    async completeQuiz(interaction: any, session: QuizSession) {
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
        activeSessions.delete(this.getSessionKey(session.userId, session.channelId));
    },

    getOptionText(question: any, key: string) {
        const map: any = { 'A': question.option_a, 'B': question.option_b, 'C': question.option_c, 'D': question.option_d };
        return map[key.toUpperCase()] || 'N/A';
    }
};
