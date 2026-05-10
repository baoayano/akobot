import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmoji } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { getMaxLevelExp, getSendLimit, getReceiveLimit } from '../../utils/economy.js';
import { formatNumber } from '../../utils/number.js';

export default {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Hiển thị cấp độ hiện tại của bạn.'),
    aliases: ['lvl'],
    async execute(context: CommandContext, _client: BotClient) {
        if (!('member' in context) || !context.member) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }
        
        const userData = await getData(context.member.user.id);

        if (!userData) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể lấy dữ liệu người dùng.`);
            return;
        }

        const level = userData.level;
        const maxExp = getMaxLevelExp(level);
        const limitSend = getSendLimit(level);
        const limitReceive = getReceiveLimit(level);
        await context.reply(`${formatEmoji('1495655488610631680', 'Shinobu_Drink', false)} **| Thông tin cấp độ:**\nOnii-chan hiện đang ở cấp độ **${formatNumber(level)}** (EXP: **${formatNumber(userData.exp)}/${formatNumber(maxExp)}**).\n\n**Giới hạn giao dịch hàng ngày ${formatEmoji('1411226300487565363', 'emojigg_Pat', false)}:**\n- Gửi: **${formatNumber(limitSend)} xu**\n- Nhận: **${formatNumber(limitReceive)} xu**\n**Cấp độ càng cao** thì giới hạn giao dịch **càng lớn** đó >.<`);
    }
};