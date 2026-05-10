import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { formatNumber } from '../../utils/number.js';

export async function handleConfirmRubyExchange(interaction: ButtonInteraction, amount: number) {
    const emojis = formatEmojis([
        { id: '1502962116385181767', name: 'dorovide', animated: true },
        { id: '1411227532459638875', name: 'chocolaglare' }
    ]);

    try {
        if (!('member' in interaction) || !interaction.member) {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }

            await interaction.editReply({
                content: `${emojis[1]} **| Lỗi:** Không thể xác định thành viên.`
            });
            return;
        }

        const rubiesToAdd = amount;
        const cashToDeduct = amount * 100000;
        const userData = await getData(interaction.member.user.id);

        if (!userData || (userData.cash ?? 0) < cashToDeduct) return;

        const { user } = userData;
        user.ruby = (user.ruby ?? 0) + rubiesToAdd;
        user.cash = (user.cash ?? 0) - cashToDeduct;
        await user.save();

        const message = interaction.message;
        if (message && Array.isArray(message.components)) {
            const embed = new EmbedBuilder()
                .setTitle(`${emojis[0]} Giao dịch thành công!`)
                .setDescription(`Onii-chan đã đổi **${formatNumber(cashToDeduct)} xu** lấy **${formatNumber(amount)} ruby** thành công!`)
                .setColor(0xe36b91)
                .setFooter({ text: 'Cảm ơn anh đã giao dịch, chúc anh một ngày tốt lành!' });
            await message.edit({ embeds: [embed], components: [] });
        } else {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }

            await interaction.editReply({
                content: `${emojis[0]} **| Giao dịch thành công!** Onii-chan đã đổi **${formatNumber(cashToDeduct)} xu** lấy **${formatNumber(amount)} ruby** thành công!`
            });
        }
    } catch (error) {
        console.error('Error processing ruby exchange:', error);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        await interaction.reply({
            content: `${emojis[1]} **| Lỗi:** Đã có lỗi xảy ra khi xử lý giao dịch. Vui lòng thử lại sau.`,
            ephemeral: true,
        });
        return;
    }
}

export async function handleCancelRubyExchange(interaction: ButtonInteraction) {
    const emojis = formatEmojis([
        { id: '1411225562336198737', name: 'PoiBaka', animated: false }
    ]);

    const message = interaction.message;
    if (message && Array.isArray(message.components)) {
        const embed = new EmbedBuilder()
            .setTitle(`${emojis[0]} Giao dịch đã bị hủy!`)
            .setDescription(`Onii-chan đã **hủy giao dịch chuyển đổi ruby** của mình.`)
            .setColor(0x888888)
            .setFooter({ text: 'Nếu anh muốn đổi ruby, hãy thử lại nhé!' });
        await message.edit({ embeds: [embed], components: [] });
    } else {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        await interaction.editReply({
            content: `${emojis[0]} **| Giao dịch đã bị hủy!** Onii-chan đã **hủy giao dịch chuyển đổi ruby** của mình.`
        });
    }
}