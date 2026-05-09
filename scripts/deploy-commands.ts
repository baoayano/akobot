import { REST, Routes } from 'discord.js';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config, requireConfig } from '../src/config.js';
import { collectFiles } from '../src/utils/collectFiles.js';

const missing = requireConfig();

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const commandsDirectory = join(scriptDirectory, '..', 'src', 'commands');
const commandFiles = collectFiles(commandsDirectory);
const commands = [];

for (const file of commandFiles) {
  const commandFile = await import(pathToFileURL(file).href);
  const command = commandFile.default ?? commandFile;

  if (command?.data?.toJSON) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);
const route = config.guildId
  ? Routes.applicationGuildCommands(config.clientId, config.guildId)
  : Routes.applicationCommands(config.clientId);

await rest.put(route, { body: commands });

console.log(`Deployed ${commands.length} slash commands.`);