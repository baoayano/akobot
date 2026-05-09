import { pathToFileURL } from 'node:url';
import { collectFiles } from '../utils/collectFiles.js';
import type { BotClient, BotEvent } from '../types.js';

export async function loadEvents(client: BotClient, directory: string): Promise<void> {
  const files = collectFiles(directory);

  for (const file of files) {
    const eventFile = await import(pathToFileURL(file).href);
    const event = (eventFile.default ?? eventFile) as Partial<BotEvent>;
    const execute = event.execute;

    if (!event?.name || typeof execute !== 'function') {
      continue;
    }

    const handler = (...args: unknown[]) => execute(...args, client);

    if (event.once) {
      client.once(event.name, handler);
      continue;
    }

    client.on(event.name, handler);
  }
}