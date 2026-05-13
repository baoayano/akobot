import { handleRegistrationConfirm } from '../registration.js';
import { formatEmojis } from '../../utils/emoji.js';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle } from 'discord.js';

export async function handleRegisterConfirm(interaction: ButtonInteraction) {
    const emojis = formatEmojis([
        { id: '1411198604965843034', name: 'Scared' },
        { id: '1411227532459638875', name: 'chocolaglare' }
    ])

    try {
        // Defer the interaction to get more time to process and keep the token valid
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        const success = await handleRegistrationConfirm(interaction.user.id);

        const content = success
            ? `${emojis[0]} **| Đăng ký thành công! Chúc bạn có những trải nghiệm tuyệt vời với Rinne!**`
            : `${emojis[1]} **| Đăng ký thất bại. Vui lòng thử lại sau.**`;

        // Disable the original buttons in the message so they can't be clicked again
        try {
            const message = interaction.message;
            if (message && Array.isArray(message.components)) {
                const disabledRows = message.components.map((row: any) => {
                    const action = new ActionRowBuilder<ButtonBuilder>();
                    for (const comp of row.components) {
                        const btn = new ButtonBuilder()
                            .setCustomId(comp.customId ?? comp.custom_id ?? '')
                            .setLabel(comp.label ?? '')
                            .setStyle((comp.style ?? ButtonStyle.Primary) as any)
                            .setDisabled(true);

                        if (comp.emoji) btn.setEmoji(comp.emoji);

                        action.addComponents(btn);
                    }
                    return action;
                });

                try {
                    // Edit the original message to disable components
                    // Use message.edit which works for message components
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    await message.edit({ components: disabledRows });
                } catch (err) {
                    console.error('Failed to disable original buttons:', err);
                }
            }
        } catch (err) {
            console.error('Error while attempting to disable buttons:', err);
        }

        // Use editReply after deferring (safer for component interactions)
        await interaction.editReply({ content });
    } catch (error) {
        console.error('Registration confirm error:', error);
        try {
            const fallback = `${emojis[1]} **| Có lỗi xảy ra. Vui lòng thử lại sau.**`;

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: fallback });
            } else {
                await interaction.reply({ content: fallback, ephemeral: true });
            }
        } catch (err) {
            console.error('Failed to send error response for registration confirm:', err);
        }
    }
}
