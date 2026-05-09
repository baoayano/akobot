import { Events } from 'discord.js';
export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) {
            return;
        }
        const prefix = client.prefix ?? 'ako';
        if (!message.content.startsWith(prefix)) {
            return;
        }
        const raw = message.content.slice(prefix.length).trim();
        if (!raw) {
            return;
        }
        const [commandName, ...args] = raw.split(/\s+/);
        const command = client.prefixCommands.get(commandName.toLowerCase());
        if (!command) {
            return;
        }
        try {
            await command.execute(message, client, args);
        }
        catch (error) {
            console.error(`Prefix command error in ${commandName}:`, error);
            await message.reply('Đã xảy ra lỗi khi chạy command prefix.');
        }
    },
};
