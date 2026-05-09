import { pathToFileURL } from 'node:url';
import { collectFiles } from '../utils/collectFiles.js';
import type { BotClient, BotCommand } from '../types.js';

export async function loadCommands(client: BotClient, directory: string): Promise<void> {
  const files = collectFiles(directory);

  for (const file of files) {
    const commandFile = await import(pathToFileURL(file).href);
    const command = (commandFile.default ?? commandFile) as Partial<BotCommand>;

    if (!command?.data?.name || typeof command.execute !== 'function') {
      continue;
    }

    client.commands.set(command.data.name, command as BotCommand);
    client.prefixCommands.set(command.data.name, command as BotCommand);
  }
}