import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmoji } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { formatNumber } from '../../utils/number.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cash')
        .setDescription('Hiển thị số xu hiện có của bạn.'),
    aliases: ['balance', 'bal', 'money', 'coin'],
    async execute(context: CommandContext, _client: BotClient) {
        if (!('member' in context) || !context.member) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        const username = context.member.user.username;
        const cash = formatNumber((await getData(context.member.user.id))?.cash ?? 0);
        
        await context.reply(`${formatEmoji('1515200446338306168', 'KannaPog', false)} **| Hehe,** onii-chan **@${username}** đang có **${cash} xu**!`);
    },
};