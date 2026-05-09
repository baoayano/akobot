import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmoji } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { formatNumber } from '../../utils/number.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ruby')
        .setDescription('Hiển thị số ruby hiện có của bạn.'),
    async execute(context: CommandContext, _client: BotClient) {
        if (!('member' in context) || !context.member) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        const username = context.member.user.username;
        const ruby = formatNumber((await getData(context.member.user.id))?.ruby ?? 0);
        
        await context.reply(`${formatEmoji('1411226090067857548', 'emojigg_XD', false)} **| Hihi,** onii-chan **@${username}** đang có **${ruby} ruby**! Siêu hiếm luôn đó nha >.<`);
    },
};