import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { userExists, getData } from '../../utils/user.js';
import { formatNumber } from '../../utils/number.js';

export default {
    data: new SlashCommandBuilder()
        .setName('exchange')
        .setDescription('Cho phép bạn chuyển đổi xu sang ruby.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số lượng ruby bạn muốn nhận được.')
                .setRequired(false)
                .setMinValue(1)
        ),
    aliases: ['exch', 'convert', 'cv', 'ex'],
    async execute(context: CommandContext, _client: BotClient, args: any[]) {
        const emojis = formatEmojis([
            { id: '1411227532459638875', name: 'chocolaglare', animated: false },
            { id: '1411226977435910215', name: 'Excited', animated: true },
            { id: '1411224598326018088', name: 'Happy', animated: false },
            { id: '1481266721703596214', name: 'peace', animated: false },
            { id: '1411197020802252857', name: 'catgirl_marisa_thumbsup', animated: false }
        ])

        if (!('member' in context) || !context.member) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        let amount;

        if (('options' in context) && context.options) {
            amount = context.options.getInteger('amount') || 0;
            if (amount < 1 && amount !== 0) {
                await context.reply(`${emojis[0]} **| Lỗi:** Số lượng ruby tối thiểu để chuyển đổi là **1**.`);
                return;
            }
        } else {
            const [amountArg] = args;
            if (amountArg) {
                if (isNaN(Number(amountArg)) || Number(amountArg) < 1) {
                    await context.reply(`${emojis[0]} **| Lỗi:** Số lượng ruby tối thiểu để chuyển đổi là **1**.`);
                    return;
                }
                amount = parseInt(amountArg);
            }
        }

        // nếu amount chưa được gán, hiện embed thông tin về tỉ giá chuyển đổi
        if (!amount) {
            const embed = new EmbedBuilder()
                .setTitle('Tỉ giá chuyển đổi')
                .setThumbnail(context.client.user?.displayAvatarURL() || '')
                .setAuthor({
                    name: context.client.user?.username || 'Bot',
                    iconURL: `https://cdn.discordapp.com/avatars/${context.member?.user.id}/${context.member?.user.avatar}.png`
                })
                .setDescription(`**Lệnh sử dụng:** \`\`/exchange <số lượng ruby>\`\`\nDưới đây là tỉ giá chuyển đổi từ xu sang ruby ${emojis[1]}`)
                .addFields([
                    { name: `Giá cơ bản ${emojis[2]}`, value: '**100,000 Xu = 1 Ruby**' }
                ])
                .setColor(0xa59d82)
                .setFooter({
                    text: 'Sẽ cập nhật thêm các yếu tố ảnh hưởng đến tỉ giá trong tương lai >.<'
                })

            await context.reply({ embeds: [embed] });
            return;
        } else {
            if (amount > 1e9) {
                await context.reply(`${emojis[0]} **| Lỗi:** Số lượng ruby quá lớn, vui lòng nhập số lượng nhỏ hơn.`);
                return;
            }

            const userId = context.member.user.id;

            if (!await userExists(userId)) {
                await context.reply(`${emojis[0]} **| Lỗi:** Không thể lấy dữ liệu người dùng.`);
                return;
            }

            const userData = await getData(userId);
            const userCash = userData?.cash ?? 0;
            const requiredCash = amount * 100000;

            if (userCash < requiredCash) {
                await context.reply(`${emojis[0]} **| Lỗi:** Onii-chan không có đủ xu để chuyển đổi đâu. Anh cần **${formatNumber(requiredCash)} xu** nhưng chỉ có **${formatNumber(userCash)} xu** thuii >.<`);
                return;
            }

            // create embed
            const embed = new EmbedBuilder()
                .setTitle(`${emojis[3]} Xác nhận chuyển đổi`)
                .setDescription(`Onii-chan, anh có chắc muốn chuyển đổi **${formatNumber(requiredCash)} xu** sang **${formatNumber(amount)} ruby** không?`)
                .addFields([
                    { name: 'Số xu hiện có', value: `**${formatNumber(userCash)} xu**`, inline: true },
                    { name: 'Số xu sau khi chuyển đổi', value: `**${formatNumber(userCash - requiredCash)} xu**`, inline: true },
                    { name: 'Số ruby sẽ nhận được', value: `**${formatNumber(amount)} ruby**`, inline: true },
                    { name: `Liên hệ hỗ trợ ${emojis[4]}`, value: "Nếu anh gặp bất kỳ vấn đề nào liên quan đến giao dịch, vui lòng liên hệ với bộ phận hỗ trợ của em qua server **Discord**: https://discord.gg/kSTM8B86eA" }
                ])
                .setColor(0xd4bba5)
                .setFooter({ text: 'Giao dịch sẽ được thực hiện sau khi bạn xác nhận.' });

            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_exchange' + ':' + context.member.user.id + ':' + amount)
                .setLabel('Xác nhận')
                .setStyle(ButtonStyle.Success)
                .setEmoji('1411224160402673756');
            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_exchange' + ':' + context.member.user.id)
                .setLabel('Hủy')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('1411224598326018088');
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

            const msg = await context.reply({ embeds: [embed], components: [actionRow] });

            setTimeout(async () => {
                try {
                    const message = await msg.fetch();
                    const components = message.components;
                    if (!components || components.length === 0) return;
                    confirmButton.setDisabled(true);
                    cancelButton.setDisabled(true);
                    await msg.edit({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton)] });
                } catch (error) {
                    console.error('Lỗi khi cập nhật trạng thái nút:', error);
                }
            }, 60000); // disable buttons after 1 minute
        }
    }
};