import { SlashCommandBuilder } from 'discord.js';
import { formatEmoji } from '../../utils/emoji.js';
export default {
    data: new SlashCommandBuilder()
        .setName('cash')
        .setDescription('Hiển thị số xu hiện có của bạn.'),
    async execute(context, _client) {
        const username = context.member?.user.username;
        await context.reply(`${formatEmoji('1495655764344311808', 'KannaPog', false)} **| Hehe,** onii-chan **@${username}** đang có **100 xu**!`);
    },
};
