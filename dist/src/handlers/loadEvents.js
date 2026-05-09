import { pathToFileURL } from 'node:url';
import { collectFiles } from '../utils/collectFiles.js';
export async function loadEvents(client, directory) {
    const files = collectFiles(directory);
    for (const file of files) {
        const eventFile = await import(pathToFileURL(file).href);
        const event = (eventFile.default ?? eventFile);
        const execute = event.execute;
        if (!event?.name || typeof execute !== 'function') {
            continue;
        }
        const handler = (...args) => execute(...args, client);
        if (event.once) {
            client.once(event.name, handler);
            continue;
        }
        client.on(event.name, handler);
    }
}
