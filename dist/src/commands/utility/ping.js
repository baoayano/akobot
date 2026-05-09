import { SlashCommandBuilder } from 'discord.js';
import { formatEmoji } from '../../utils/emoji.js';
export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Kiểm tra độ trễ của bot.'),
    async execute(context, _client) {
        const emoji = formatEmoji('1411194602601451540', 'reimu_spin', true);
        const wsPing = context.client.ws.ping;
        const reply = `${emoji} **| Pong! Ping hiện tại của em nè >.<:** ${wsPing}ms`;
        await context.reply(reply);
    },
};
