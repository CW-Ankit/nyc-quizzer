import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { quizManager } from '../utils/quizManager.js';
import { dbManager } from '../utils/db.js';
import { roleManager } from '../utils/roleManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('quiz')
        .setDescription('Technical Knowledge Ecosystem Commands')
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a quiz')
                .addStringOption(opt => 
                    opt.setName('type')
                        .setDescription('Choose between curated set or custom AI quiz')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Curated Set', value: 'set' },
                            { name: 'Custom AI', value: 'custom' },
                        )
                )
                .addIntegerOption(opt => 
                    opt.setName('set_id')
                        .setDescription('The ID of the curated set')
                        .setRequired(false)
                )
                .addStringOption(opt => 
                    opt.setName('set_name')
                        .setDescription('The name of the curated set')
                        .setRequired(false)
                )
                .addStringOption(opt => 
                    opt.setName('topic')
                        .setDescription('Topic for custom quiz')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Web Development', value: 'webdev' },
                            { name: 'Databases', value: 'databases' },
                            { name: 'Operating Systems', value: 'os' },
                            { name: 'Networking', value: 'networking' },
                            { name: 'Cybersecurity', value: 'cybersecurity' },
                            { name: 'Artificial Intelligence', value: 'ai' },
                            { name: 'Machine Learning', value: 'ml' },
                            { name: 'Deep Learning', value: 'deeplearning' },
                            { name: 'Large Language Models', value: 'llm' },
                        )
                )
                .addStringOption(opt =>
                    opt.setName('difficulty')
                        .setDescription('Difficulty for custom quiz')
                        .setRequired(false)
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
                .addIntegerOption(opt => 
                    opt.setName('duration')
                        .setDescription('Seconds per question')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('sets')
                .setDescription('List all available curated quiz sets')
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
                            { name: 'Artificial Intelligence', value: 'ai' },
                            { name: 'Machine Learning', value: 'ml' },
                            { name: 'Deep Learning', value: 'deeplearning' },
                            { name: 'Large Language Models', value: 'llm' },
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
                            { name: 'Create Set', value: 'create_set' },
                            { name: 'Add Question', value: 'add_question' },
                            { name: 'Update Visibility', value: 'update_visibility' },
                            { name: 'Archive/Unarchive', value: 'archive' },
                            { name: 'Delete Set', value: 'delete_set' },
                            { name: 'Clear Scores', value: 'clear_scores' },
                        )
                )
                .addStringOption(opt =>
                    opt.setName('name')
                        .setDescription('Name of the set')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('description')
                        .setDescription('Set description')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('visibility')
                        .setDescription('Visibility (public/event)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Public', value: 'public' },
                            { name: 'Event', value: 'event' },
                        )
                )
                .addStringOption(opt =>
                    opt.setName('topic')
                        .setDescription('Topic of the question')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Web Development', value: 'webdev' },
                            { name: 'Databases', value: 'databases' },
                            { name: 'Operating Systems', value: 'os' },
                            { name: 'Networking', value: 'networking' },
                            { name: 'Cybersecurity', value: 'cybersecurity' },
                            { name: 'Artificial Intelligence', value: 'ai' },
                            { name: 'Machine Learning', value: 'ml' },
                            { name: 'Deep Learning', value: 'deeplearning' },
                            { name: 'Large Language Models', value: 'llm' },
                        )
                )
                .addStringOption(opt =>
                    opt.setName('difficulty')
                        .setDescription('Difficulty')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Easy', value: 'Easy' },
                            { name: 'Medium', value: 'Medium' },
                            { name: 'Hard', value: 'Hard' },
                        )
                )
                .addStringOption(opt =>
                    opt.setName('question')
                        .setDescription('The question text')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('option_a')
                        .setDescription('Option A')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('option_b')
                        .setDescription('Option B')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('option_c')
                        .setDescription('Option C')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('option_d')
                        .setDescription('Option D')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('correct')
                        .setDescription('Correct option (a/b/c/d)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'A', value: 'a' },
                            { name: 'B', value: 'b' },
                            { name: 'C', value: 'c' },
                            { name: 'D', value: 'd' },
                        )
                )
                .addStringOption(opt =>
                    opt.setName('explanation')
                        .setDescription('Explanation')
                        .setRequired(false)
                )
                .addBooleanOption(opt =>
                    opt.setName('status')
                        .setDescription('Archive status (true = archive, false = unarchive)')
                        .setRequired(false)
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

            const type = interaction.options.getString('type');
            
            if (type === 'set') {
                const setId = interaction.options.getInteger('set_id');
                const setName = interaction.options.getString('set_name');
                
                if (!setId && !setName) {
                    return interaction.reply({ content: '❌ Please provide either a set ID or a set name.', ephemeral: true });
                }

                const identifier = setId || setName;
                await quizManager.startSetSession(interaction, identifier);
            } else if (type === 'custom') {
                const topic = interaction.options.getString('topic');
                const difficulty = interaction.options.getString('difficulty') || 'Medium';
                const length = interaction.options.getInteger('length') || 5;
                const duration = interaction.options.getInteger('duration') || 30;
                
                if (!topic) return interaction.reply({ content: '❌ Please provide a topic for your custom quiz.', ephemeral: true });
                await quizManager.startCustomSession(interaction, topic, difficulty, length, duration);
            }
        }

        if (subcommand === 'sets') {
            const sets = dbManager.getAvailableSets();
            if (sets.length === 0) {
                return interaction.reply({ content: 'No curated quiz sets available yet.', ephemeral: true });
            }

            const list = sets.map((s: any) => `**${s.name}**\n📝 ${s.description || 'No description'}`).join('\n\n');
            await interaction.reply({
                content: `📚 **Available Quiz Sets:**\n\n${list}\n\nUse \`/quiz start type:Curated Set setName:<name>\` to begin!`,
                ephemeral: false,
            });
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
                    let medal = '';
                    if (rank === 1) medal = '🥇 ';
                    else if (rank === 2) medal = '🥈 ';
                    else if (rank === 3) medal = '🥉 ';
                    else medal = '';

                    return `${medal}**${rank}.** ${entry.username} — \`${entry.total} K-XP\``;
                }).join('\n');

                return new EmbedBuilder()
                    .setTitle(`🏆 Knowledge Leaderboard (${timeframe.toUpperCase()})`)
                    .setDescription(topic ? `Topic: **${topic}**\n\n${description}` : description)
                    .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` })
                    .setColor('#FFD700');
            };

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(totalPages <= 1)
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
            // 1. Role Check: Must be "Not your Quiz Master"
            if (!roleManager.isQuizMaster(interaction.member)) {
                return interaction.reply({ content: '❌ Only users with the **Not your Quiz Master** role can manage quizzes.', ephemeral: true });
            }

            const action = interaction.options.getString('action');
            const name = interaction.options.getString('name');
            const description = interaction.options.getString('description');
            const visibility = interaction.options.getString('visibility') || 'public';
            const topic = interaction.options.getString('topic');
            const difficulty = interaction.options.getString('difficulty');
            const question = interaction.options.getString('question');
            const a = interaction.options.getString('option_a');
            const b = interaction.options.getString('option_b');
            const c = interaction.options.getString('option_c');
            const d = interaction.options.getString('option_d');
            const correct = interaction.options.getString('correct');
            const explanation = interaction.options.getString('explanation');
            const status = interaction.options.getBoolean('status');

            try {
                if (action === 'create_set') {
                    if (!name) return interaction.reply({ content: '❌ Name is required to create a set.', ephemeral: true });
                    dbManager.createSet(name, description || '', interaction.user.id, visibility);
                    return interaction.reply({ content: `✅ Created set **${name}** (${visibility})!`, ephemeral: true });
                }

                if (action === 'add_question') {
                    if (!name || !topic || !difficulty || !question || !a || !b || !c || !d || !correct || !explanation) {
                        return interaction.reply({ content: '❌ All question fields are required for add_question.', ephemeral: true });
                    }
                    const set = dbManager.getSetDetails(name);
                    if (!set) return interaction.reply({ content: '❌ Set not found.', ephemeral: true });
                    
                    dbManager.addCuratedQuestion({
                        set_id: set.id,
                        topic, difficulty, question, a, b, c, d, correct, explanation
                    });
                    return interaction.reply({ content: `✅ Question added to set **${name}**!`, ephemeral: true });
                }

                if (action === 'update_visibility') {
                    if (!name) return interaction.reply({ content: '❌ Name is required.', ephemeral: true });
                    dbManager.updateSetVisibility(name, visibility);
                    return interaction.reply({ content: `✅ Set **${name}** visibility updated to **${visibility}**.`, ephemeral: true });
                }

                if (action === 'archive') {
                    if (name === undefined || status === undefined) return interaction.reply({ content: '❌ Name and status are required.', ephemeral: true });
                    dbManager.archiveSet(name, status);
                    return interaction.reply({ content: `✅ Set **${name}** ${status ? 'archived' : 'unarchived'}.`, ephemeral: true });
                }

                if (action === 'delete_set') {
                    if (!name) return interaction.reply({ content: '❌ Name is required.', ephemeral: true });
                    dbManager.deleteSet(name);
                    return interaction.reply({ content: `✅ Set **${name}** and its questions have been deleted.`, ephemeral: true });
                }

                if (action === 'clear_scores') {
                    dbManager.clearScores();
                    return interaction.reply({ content: '✅ All K-XP scores have been reset.', ephemeral: true });
                }

                return interaction.reply({ content: '❌ Invalid admin action.', ephemeral: true });
            } catch (error) {
                console.error(error);
                return interaction.reply({ content: '❌ An error occurred while processing the admin request.', ephemeral: true });
            }
        }
    },
};
