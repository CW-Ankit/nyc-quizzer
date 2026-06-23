import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { quizManager } from '../utils/quizManager.js';
import { dbManager } from '../utils/db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('quiz')
        .setDescription('Technical Knowledge Ecosystem Commands')
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a curated quiz (Restricted)')
                .addStringOption(opt => 
                    opt.setName('topic')
                        .setDescription('Select topic')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Web Development', value: 'webdev' },
                            { name: 'Databases', value: 'databases' },
                            { name: 'Operating Systems', value: 'os' },
                            { name: 'Networking', value: 'networking' },
                            { name: 'Cybersecurity', value: 'cybersecurity' },
                        )
                )
                .addStringOption(opt =>
                    opt.setName('difficulty')
                        .setDescription('Select difficulty')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Easy', value: 'Easy' },
                            { name: 'Medium', value: 'Medium' },
                            { name: 'Hard', value: 'Hard' },
                        )
                )
                .addIntegerOption(opt => 
                    opt.setName('length')
                        .setDescription('Number of questions')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('leaderboard')
                .setDescription('View the K-XP Leaderboard')
                .addStringOption(opt =>
                    opt.setName('timeframe')
                        .setDescription('Time period')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Daily', value: 'daily' },
                            { name: 'Weekly', value: 'weekly' },
                            { name: 'Monthly', value: 'monthly' },
                            { name: 'All-Time', value: 'alltime' },
                        )
                )
                .addStringOption(opt =>
                    opt.setName('topic')
                        .setDescription('Filter by topic')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Web Development', value: 'webdev' },
                            { name: 'Databases', value: 'databases' },
                            { name: 'Operating Systems', value: 'os' },
                            { name: 'Networking', value: 'networking' },
                            { name: 'Cybersecurity', value: 'cybersecurity' },
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('View your personal knowledge stats')
        )
        .addSubcommand(sub =>
            sub.setName('admin')
                .setDescription('Administrative tools')
                .addStringOption(opt =>
                    opt.setName('action')
                        .setDescription('Admin action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add Question', value: 'add' },
                            { name: 'Clear Scores', value: 'clear' },
                        )
                )
        ),

    async execute(interaction: any) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            // 1. Role Check
            const roleId = process.env.NOT_YOUR_PAL_ROLE_ID;
            if (!roleId) {
                console.error('NOT_YOUR_PAL_ROLE_ID is not defined in .env');
                return interaction.reply({ content: '❌ Server configuration error. Please contact an admin.', ephemeral: true });
            }
            if (!interaction.member.roles.cache.has(roleId)) {
                return interaction.reply({ content: '❌ Only users with the **Not your Pal** role can start a quiz.', ephemeral: true });
            }

            // 2. Channel Check
            const allowedChannels = process.env.ALLOWED_QUIZ_CHANNELS?.split(',') || [];
            if (!allowedChannels.includes(interaction.channelId)) {
                return interaction.reply({ content: '❌ Quizzes can only be started in designated quiz channels.', ephemeral: true });
            }

            // 3. Anti-Spam Check
            if (quizManager.hasActiveSession(interaction.user.id, interaction.channelId)) {
                return interaction.reply({ content: '❌ You already have an active quiz session in this channel!', ephemeral: true });
            }

            const topic = interaction.options.getString('topic');
            const difficulty = interaction.options.getString('difficulty');
            const length = interaction.options.getInteger('length') || 5;

            await quizManager.startSession(interaction, topic, difficulty, length);
        }

        if (subcommand === 'leaderboard') {
            const timeframe = interaction.options.getString('timeframe') || 'alltime';
            const topic = interaction.options.getString('topic');
            
            const data = dbManager.getLeaderboard(timeframe as any, topic);
            
            if (data.length === 0) {
                return interaction.reply({ content: 'No scores found for this criteria!', ephemeral: true });
            }

            let page = 0;
            const pageSize = 10;
            const totalPages = Math.ceil(data.length / pageSize);

            const generateEmbed = (currentPage: number) => {
                const start = currentPage * pageSize;
                const end = start + pageSize;
                const slicedData = data.slice(start, end);

                let description = slicedData.map((entry: any, index: number) => {
                    const rank = start + index + 1;
                    return `**${rank}.** ${entry.username} — \`${entry.total} K-XP\``;
                }).join('\n');

                return new EmbedBuilder()
                    .setTitle(`🏆 Knowledge Leaderboard (${timeframe.toUpperCase()})`)
                    .setDescription(topic ? `Topic: **${topic}**\n\n${description}` : description)
                    .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` })
                    .setColor('#FFD700');
            };

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(totalPages <= 1)
            );

            const response = await interaction.reply({ embeds: [generateEmbed(page)], components: [row] });

            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async (collected) => {
                if (collected.customId === 'prev') page--;
                if (collected.customId === 'next') page++;

                const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                    new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
                );

                await collected.update({ embeds: [generateEmbed(page)], components: [updatedRow] });
            });

            collector.on('end', async () => {
                await interaction.editReply({ components: [] });
            });
        }

        if (subcommand === 'stats') {
            dbManager.ensureUser(interaction.user.id, interaction.user.username);
            const { user, topicStats } = dbManager.getUserStats(interaction.user.id);

            const embed = new EmbedBuilder()
                .setTitle(`📊 Knowledge Stats: ${interaction.user.username}`)
                .setColor('#5865F2')
                .addFields({ name: 'Total K-XP', value: `\`${user?.totalKxp || 0}\``, inline: false });

            if (topicStats.length > 0) {
                const topTopics = topicStats.slice(0, 5).map((t: any) => `**${t.topic}**: ${t.total} XP`).join('\n');
                embed.addFields({ name: 'Top Expertise', value: topTopics, inline: false });
            } else {
                embed.addFields({ name: 'Top Expertise', value: 'No expertise data yet. Start a quiz!', inline: false });
            }

            await interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'admin') {
            const action = interaction.options.getString('action');
            
            // Admin check (e.g. Administrator permission)
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: '❌ Only server administrators can use this command.', ephemeral: true });
            }

            if (action === 'clear') {
                // Implementation for clearing scores
                await interaction.reply({ content: '⚠️ Feature coming soon: Score reset.' });
            } else if (action === 'add') {
                await interaction.reply({ content: '🛠️ Use the bot dashboard or specific admin commands to add curated questions.' });
            }
        }
    },
};
