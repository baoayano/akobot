import { SlashCommandBuilder, Message } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { formatNumber, discordTimestamp } from '../../utils/number.js';
import { coinflip } from '../../utils/fun.js';
import { processLevelIncrease } from '../../events/increaseLevel.js';

const cooldown = new Map<string, number>();

export default {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Đoán mặt của đồng xu (ngửa hoặc sấp).')
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Số xu bạn muốn đặt cược (nếu đặt là 0, sẽ đặt cược toàn bộ xu).')
                .setRequired(true)
                .setMinValue(0)
        )
        .addStringOption(option =>
            option.setName('side')
                .setDescription('Mặt bạn muốn đoán (ngửa hoặc sấp).')
                .setRequired(false)
                .addChoices(
                    { name: 'Ngửa', value: 'heads' },
                    { name: 'Sấp', value: 'tails' }
                )
        ),
    aliases: ['cf'],
    async execute(context: CommandContext, _client: BotClient, args: any[]) {
        const emojis = formatEmojis([
            { id: '1411227532459638875', name: 'chocolaglare', animated: false },
            { id: '1411196789914206238', name: 'CatgirlChenHyper', animated: true },
            { id: '1502882394074779728', name: 'coinflip', animated: true },
            { id: '1502884007078002778', name: 'coinflip_head', animated: false },
            { id: '1502884040712261792', name: 'coinflip_tail', animated: false }
        ])
        if (!('member' in context) || !context.member) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        const userId = context.member.user.id;

        if (cooldown.has(userId)) {
            const timeFormat = discordTimestamp(cooldown.get(userId), "R");
            const msgCooldown = await context.reply(`${emojis[0]} **| Lỗi:** Onii-chan đang trong thời gian chờ **${timeFormat}**, vui lòng đợi một chút rồi thử lại nhé **>.<**`);
            setTimeout(() => msgCooldown.delete(), cooldown.get(userId)! - Date.now()); // xóa tin nhắn sau khi thời gian chờ kết thúc
            return;
        }

        cooldown.set(userId, Date.now() + 10000); // đặt cooldown 10 giây
        setTimeout(() => cooldown.delete(userId), 10000); // cooldown 10 giây

        const username = context.member.user.username;
        const userData = await getData(userId);

        if (!userData) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể lấy dữ liệu người dùng.`);
            return;
        }

        let amount, side;
        if (('options' in context) && context.options) {
            amount = context.options.getNumber('amount', true);
            side = context.options.getString('side') || 'heads';

            if (amount === 0) {
                amount = userData.cash > 1000000 ? 1000000 : userData.cash;
            }
        } else {
            const [amountArg, sideArg] = args;
            if (amountArg !== "all") {
                if (!amountArg || isNaN(Number(amountArg)) || Number(amountArg) <= 0) {
                    await context.reply(`${emojis[0]} **| Lỗi:** Số lượng xu không hợp lệ.`);
                    return;
                }
            }

            amount = amountArg === "all" ? (userData.cash > 1000000 ? 1000000 : userData.cash) : parseInt(amountArg);
            side = ['tails', 't'].includes(sideArg?.toLowerCase()) ? 'tails' : 'heads';
        }

        if (userData.cash < amount) {
            await context.reply(`${emojis[0]} **| Lỗi:** Onii-chan **@${username}** không đủ xu để đặt cược.`);
            return;
        }

        const msg = await context.reply(`${emojis[1]} **| Onii-chan @${username}** đã đặt cược **${formatNumber(amount)} xu** vào mặt **${side === 'heads' ? 'Ngửa' : 'Sấp'}**.\nĐang tung đồng xu... ${emojis[2]}`);

        // sleep 1-3 seconds
        await new Promise(resolve => setTimeout(resolve, [1000, 1500, 2000, 2500, 3000][Math.floor(Math.random() * 5)]));

        // coin flip tùy vào số tiền cược
        const { result, win, jackpotWin } = coinflip(side, amount);

        if (win) {
            const winCoins = amount * 2;
            userData.user.cash -= amount; // trừ tiền cược
            userData.user.cash += winCoins;
            await userData.user.save();

            if (jackpotWin) {
                await msg.edit(`${emojis[1]} **| Onii-chan @${username}** đã đặt cược **${formatNumber(amount)} xu** vào mặt **${side === 'heads' ? 'Ngửa' : 'Sấp'}**.\nĐang tung đồng xu... ${result === 'heads' ? emojis[3] : emojis[4]} và anh đã thắng **${formatNumber(winCoins)} xu**! Pha này là **trời cứu** đó!! >.<`);
            } else {
                await msg.edit(`${emojis[1]} **| Onii-chan @${username}** đã đặt cược **${formatNumber(amount)} xu** vào mặt **${side === 'heads' ? 'Ngửa' : 'Sấp'}**.\nĐang tung đồng xu... ${result === 'heads' ? emojis[3] : emojis[4]} và anh đã thắng **${formatNumber(winCoins)} xu**! Chúc mừng onii-chan nhé >.<`);
            }
        } else {
            userData.user.cash -= amount;
            await userData.user.save();

            await msg.edit(`${emojis[1]} **| Onii-chan @${username}** đã đặt cược **${formatNumber(amount)} xu** vào mặt **${side === 'heads' ? 'Ngửa' : 'Sấp'}**.\nĐang tung đồng xu... ${result === 'heads' ? emojis[3] : emojis[4]} và anh đã thua mất rồi! Đừng buồn nhé >.<`);
        }

        await processLevelIncrease(context, _client, true);
    }
};