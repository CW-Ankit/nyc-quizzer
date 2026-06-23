import type { Interaction } from 'discord.js';
import { quizManager } from '../utils/quizManager.js';
import { broadcastService } from '../services/broadcastService.js';
import { bossService } from '../services/bossService.js';

export default {
    name: 'interactionCreate',
    async execute(interaction: Interaction) {
        // 1. Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const client = interaction.client as any;
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: 'There was an error while executing this command!', 
                    ephemeral: true 
                });
            }
        } 
        
        // 2. Handle Button Interactions
        else if (interaction.isButton()) {
            const customId = interaction.customId;

            // Route to Curated Quiz Manager
            if (customId.startsWith('q_')) {
                await quizManager.handleAnswer(interaction);
            } 
            // Route to Boss Service
            else if (customId.startsWith('boss_')) {
                await bossService.handleInteraction(interaction);
            }
            // Route to Broadcast Service (AI Trivia)
            else if (customId.startsWith('broadcast_')) {
                await broadcastService.handleInteraction(interaction);
            } 
            else {
                await interaction.reply({ content: 'Unknown interaction.', ephemeral: true });
            }
        }
    },
};
