import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { userExists, getData } from '../../utils/user.js';
import { formatNumber } from '../../utils/number.js';
import {
    getTodaySentTotal,
    getTodayReceivedTotal,
} from '../../utils/transactions.js';
import { getSendLimit, getReceiveLimit } from '../../utils/economy.js';

export default {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Cho phép bạn giao dịch xu với người khác.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người bạn muốn giao dịch xu cùng.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số lượng xu bạn muốn giao dịch.')
                .setRequired(true)
                .setMinValue(1)
        ),
    async execute(context: CommandContext, _client: BotClient, args: any[]) {
        const emojis = formatEmojis([
            { id: '1411227532459638875', name: 'chocolaglare', animated: false },
            { id: '1495655764344311808', name: 'KannaPog', animated: false },
            { id: '1411226046438834187', name: 'Smug2', animated: false },
            { id: '1411226370322993193', name: 'RoNom', animated: false },
            { id: '1411225479784038440', name: 'PoiNom', animated: false }
        ]);
        if (!('member' in context) || !context.member) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        let targetUser, amount;

        if (!('options' in context)) {
            const [userId, amountArg] = args;

            if (!/^(?:<@!?(\d+)>|(\d+))$/.test(userId)) {
                await context.reply(`${emojis[0]} **| Lỗi:** Định dạng người dùng không hợp lệ.`);
                return;
            }

            if (!amountArg || isNaN(Number(amountArg)) || Number(amountArg) <= 0) {
                await context.reply(`${emojis[0]} **| Lỗi:** Số lượng xu không hợp lệ.`);
                return;
            }

            targetUser = userId.replace(/^(?:<@!?(\d+)>|(\d+))$/, '$1$2');
            amount = parseInt(amountArg);
        } else {
            targetUser = context.options.getUser('user', true).id;
            amount = context.options.getInteger('amount', true);
        }

        if (targetUser === context.member.user.id) {
            await context.reply(`${emojis[0]} **| Lỗi:** Bạn không thể giao dịch xu với chính mình.`);
            return;
        }

        if (amount <= 0) {
            await context.reply(`${emojis[0]} **| Lỗi:** Số lượng xu phải lớn hơn 0.`);
            return;
        }

        if (amount > 1e9) {
            await context.reply(`${emojis[0]} **| Lỗi:** Số lượng xu quá lớn, vui lòng nhập số lượng nhỏ hơn.`);
            return;
        }

        const validateUser = await userExists(targetUser);
        if (!validateUser) {
            await context.reply(`${emojis[0]} **| Lỗi:** Người dùng bạn giao dịch chưa đăng ký tài khoản **AkoBot**.`);
            return;
        }

        const myData = await getData(context.member.user.id);
        const myCash = myData?.cash ?? 0;
        const myLevel = myData?.level ?? 1;

        if (myCash < amount) {
            await context.reply(`${emojis[0]} **| Lỗi:** Onii-chan không có đủ xu để giao dịch đâu. Hiện tại anh chỉ có **${formatNumber(myCash)} xu** thuii >.<`);
            return;
        }

        const totalSent = await getTodaySentTotal(context.member.user.id);
        const dailyLimit = getSendLimit(myLevel);

        if (totalSent + amount > dailyLimit) {
            await context.reply(`${emojis[0]} **| Lỗi:** Onii-chan đã vượt quá giới hạn giao dịch trong ngày rồi.\nHôm nay anh chỉ có thể giao dịch thêm **${formatNumber(dailyLimit - totalSent)} xu** thôi >.<`);
            return;
        }

        const targetData = await getData(targetUser);
        const targetLevel = targetData?.level ?? 1;

        const totalReceived = await getTodayReceivedTotal(targetUser);
        const receiveLimit = getReceiveLimit(targetLevel);

        if (totalReceived + amount > receiveLimit) {
            await context.reply(`${emojis[0]} **| Lỗi:** Người dùng <@${targetUser}> giao dịch chỉ nhận được **${formatNumber(receiveLimit - totalReceived)} xu** nữa trong ngày hôm nay thuii >.<`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${emojis[2]} Xác nhận giao dịch`)
            .setDescription(`Onii-chan, anh có chắc muốn giao dịch **${formatNumber(amount)} xu** cho <@${targetUser}> không?`)
            .setColor(0xa5c0d4)
            .addFields([
                {
                    name: `Lưu ý quan trọng ${emojis[3]}`,
                    value: `- Anh hoàn toàn **tự chịu trách nhiệm** trong giao dịch này.\n- Vui lòng đảm bảo rằng anh **tin tưởng** người mà anh đang giao dịch cùng.\n- Nếu có bất kỳ vấn đề nào **nghiêm trọng** phát sinh từ giao dịch này, vui lòng liên hệ với **bộ phận hỗ trợ** của em để được giải quyết.`
                },
                {
                    name: `Liên hệ hỗ trợ ${emojis[4]}`,
                    value: "Nếu anh gặp bất kỳ vấn đề nào liên quan đến giao dịch, vui lòng liên hệ với bộ phận hỗ trợ của em qua server **Discord**: https://discord.gg/kSTM8B86eA"
                }
            ])
            .setFooter({ text: 'Giao dịch sẽ được thực hiện sau khi bạn xác nhận.' });

        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_give:' + context.member.user.id + ':' + targetUser + ':' + amount)
            .setLabel('Xác nhận giao dịch')
            .setStyle(ButtonStyle.Success)
            .setEmoji('1411224598326018088');

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_give:' + context.member.user.id + ':' + targetUser)
            .setLabel('Hủy giao dịch')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('1411226636875071539');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

        const msg = await context.reply({ embeds: [embed], components: [row] });

        setTimeout(async () => {
            try {
                const message = await msg.fetch();
                const components = message.components;
                if (!components || components.length === 0) return;
                confirmButton.setDisabled(true);
                cancelButton.setDisabled(true);
                const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);
                await msg.edit({ components: [disabledRow] });
            } catch (error) {
                console.error('Error disabling give buttons:', error);
            }
        }, 60000); // Disable buttons after 60 seconds
    }
}