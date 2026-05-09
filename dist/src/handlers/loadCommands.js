import { pathToFileURL } from 'node:url';
import { collectFiles } from '../utils/collectFiles.js';
export async function loadCommands(client, directory) {
    const files = collectFiles(directory);
    for (const file of files) {
        const commandFile = await import(pathToFileURL(file).href);
        const command = (commandFile.default ?? commandFile);
        if (!command?.data?.name || typeof command.execute !== 'function') {
            continue;
        }
        client.commands.set(command.data.name, command);
        client.prefixCommands.set(command.data.name, command);
    }
}
