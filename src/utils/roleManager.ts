import { Client, GuildMember } from 'discord.js';
import fs from 'fs';
import path from 'path';

const ROLES_FILE = path.join(process.cwd(), 'data', 'roles.json');

interface TopicRole {
    roleId: string;
    threshold: number;
}

type RolesConfig = Record<string, TopicRole>;

export const roleManager = {
    async checkAndGrantRole(client: Client, userId: string, topic: string, currentXp: number) {
        try {
            const config: RolesConfig = JSON.parse(fs.readFileSync(ROLES_FILE, 'utf-8'));
            const topicConfig = config[topic];

            if (!topicConfig) return;

            if (currentXp >= topicConfig.threshold) {
                const guild = client.guilds.cache.first(); // Assumes single guild bot
                if (!guild) return;

                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member) return;

                if (!member.roles.cache.has(topicConfig.roleId)) {
                    await member.roles.add(topicConfig.roleId);
                    console.log(`Granted ${topic} expert role to ${member.user.username}`);
                }
            }
        } catch (error) {
            console.error('Error in roleManager:', error);
        }
    },

    isQuizMaster: (member: any) => {
        const roleId = process.env.NOT_YOUR_QUIZ_MASTER_ROLE_ID;
        return roleId ? member.roles.cache.has(roleId) : false;
    }
};
