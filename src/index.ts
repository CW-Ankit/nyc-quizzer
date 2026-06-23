import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { broadcastService } from './services/broadcastService.js';
import { bossService } from './services/bossService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

(client as any).commands = new Collection();

(async () => {
    // Load commands
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    const commandsData: any[] = [];

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        const command = await import(fileUrl);

        if (command.default && command.default.data && command.default.execute) {
            (client as any).commands.set(command.default.data.name, command.default);
            commandsData.push(command.default.data.toJSON());
        }
    }

    // Load events
    const eventsPath = path.join(__dirname, 'events');
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const fileUrl = pathToFileURL(filePath).href;
            const event = await import(fileUrl);

            if (event.default) {
                if (event.default.once) {
                    client.once(event.default.name, (...args: any[]) => event.default.execute(...args));
                } else {
                    client.on(event.default.name, (...args: any[]) => event.default.execute(...args));
                }
            }
        }
    }

    // Register commands
    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!),
            { body: commandsData }
        );
        console.log('Successfully registered slash commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }

    await client.login(process.env.DISCORD_TOKEN);
    broadcastService.init(client);
    bossService.init(client);
})();
