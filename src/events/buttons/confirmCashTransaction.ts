import { formatEmojis } from '../../utils/emoji.js';
import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import { recordAndApplyTransaction } from '../../utils/transactions.js';
import { formatNumber } from '../../utils/number.js';

export async function handleConfirmCashTransaction(interaction: ButtonInteraction, targetUser: string, amount: string) {
    const emojis = formatEmojis([
        { id: '1411198604965843034', name: 'Scared' },
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

        await recordAndApplyTransaction({
            type: 'give',
            from: interaction.member?.user.id ?? null,
            to: targetUser,
            amount: Number(amount),
            reason: `Giao dịch từ ${interaction.member.user.id} đến ${targetUser}`,
        })

        const message = interaction.message;
        if (message && Array.isArray(message.components)) {
            // new embed
            const embed = new EmbedBuilder()
                .setTitle(`${emojis[0]} Giao dịch thành công!`)
                .setDescription(`Onii-chan đã giao dịch **${formatNumber(Number(amount))} xu** với <@${targetUser}> thành công!`)
                .setColor(0x8860cc)
                .setFooter({ text: 'Cảm ơn anh đã giao dịch, chúc anh một ngày tốt lành!' });
            // Update the message with the new embed
            await message.edit({ embeds: [embed], components: [] });
        } else {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }

            await interaction.editReply({
                content: `${emojis[0]} **| Giao dịch thành công!** Onii-chan đã giao dịch **${formatNumber(Number(amount))} xu** với <@${targetUser}> thành công!`
            });
        }
    } catch (error) {
        console.error('Error processing cash transaction:', error);
        await interaction.reply({
            content: `${emojis[1]} **| Lỗi:** Đã có lỗi xảy ra khi xử lý giao dịch. Vui lòng thử lại sau.`,
            ephemeral: true,
        });
        return;
    }
}

export async function handleCancelCashTransaction(interaction: ButtonInteraction, targetUser: string) {
    const emojis = formatEmojis([
        { id: '1495649278297641060', name: 'Disgust', animated: false }
    ]);

    const message = interaction.message;
    if (message && Array.isArray(message.components)) {
        const embed = new EmbedBuilder()
            .setTitle(`${emojis[0]} Giao dịch đã bị hủy!`)
            .setDescription(`Onii-chan đã **hủy giao dịch** của mình với <@${targetUser}>.`)
            .setColor(0xf1566d)
            .setFooter({ text: 'Chúc anh một ngày tốt lành!' });
        await message.edit({ embeds: [embed], components: [] });
    } else {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        await interaction.editReply({
            content: `${emojis[0]} **| Giao dịch đã bị hủy!** Onii-chan đã hủy giao dịch của mình với <@${targetUser}>.`
        });
    }
}