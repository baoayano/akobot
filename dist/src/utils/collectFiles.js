import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
export function collectFiles(directory, extensions = ['.ts', '.js']) {
    const output = [];
    function walk(currentDirectory) {
        if (!currentDirectory)
            return;
        let entries = [];
        try {
            entries = readdirSync(currentDirectory, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = join(currentDirectory, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }
            if (extensions.includes(extname(entry.name))) {
                output.push(fullPath);
            }
        }
    }
    walk(directory);
    return output;
}
