import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, requireConfig } from './config.js';
import { loadCommands } from './handlers/loadCommands.js';
import { loadEvents } from './handlers/loadEvents.js';
import type { BotClient, BotCommand } from './types.js';
import { connectMongo } from './utils/mongoose.js';

await connectMongo();

const missing = requireConfig();

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages],
}) as BotClient;

client.commands = new Collection<string, BotCommand>();
client.prefixCommands = new Collection<string, BotCommand>();
client.prefix = config.prefix;

const currentDirectory = dirname(fileURLToPath(import.meta.url));

await loadCommands(client, join(currentDirectory, 'commands'));
await loadEvents(client, join(currentDirectory, 'events'));

try {
  await client.login(config.token);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Used disallowed intents')) {
    console.error([
      'Bot cannot start because one or more privileged intents are disabled.',
      'Enable Message Content Intent in the Discord Developer Portal for this bot, then try again.',
    ].join(' '));
    process.exit(1);
  }

  console.error('Bot failed to start:', error);
  process.exit(1);
}