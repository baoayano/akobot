import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmoji } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { formatNumber } from '../../utils/number.js';

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Nhận phần thưởng hàng ngày của bạn.'),
    async execute(context: CommandContext, _client: BotClient) {
        if (!('member' in context) || !context.member) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        const username = context.member.user.username;
        const userData = await getData(context.member.user.id);
        const now = new Date();
        const lastDaily = userData?.lastDaily ? new Date(userData.lastDaily) : null;
        const canClaim = !lastDaily || (now.getTime() - lastDaily.getTime()) >= 24 * 60 * 60 * 1000;

        if (!userData) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể lấy dữ liệu người dùng.`);
            return;
        }

        if (canClaim) {
            const randomCash = Math.floor(Math.random() * 1000) + 500; // Phần thưởng ngẫu nhiên từ 500 đến 1500 xu
            const newCash = (userData?.cash ?? 0) + randomCash;

            userData.user.cash = newCash;
            userData.user.lastDaily = now;
            await userData.user.save();

            await context.reply(`${formatEmoji('1411224795990851587', 'emojigg_Ok', false)} **| Chúc mừng onii-chan @${username}!**\nAnh đã nhận được **${formatNumber(randomCash)} xu** từ phần thưởng hàng ngày!\nHãy quay lại sau **24 giờ** để nhận phần thưởng tiếp theo nhé >.<`);
        } else {
            const nextClaimTime = new Date(lastDaily!.getTime() + 24 * 60 * 60 * 1000);
            const timeRemaining = nextClaimTime.getTime() - now.getTime();
            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Oops!** Hihi, onii-chan **@${username}** đã nhận phần thưởng hàng ngày rồi!\nPhần thưởng tiếp theo sẽ có thể nhận được sau **${hours} giờ ${minutes} phút ${seconds} giây** nữa >.<`);
        }
    }
};