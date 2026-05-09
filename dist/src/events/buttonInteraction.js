import { Events } from 'discord.js';
import { handleRegistrationConfirm } from './registration.js';
export default {
    name: Events.InteractionCreate,
    async execute(interaction, _client) {
        if (!interaction.isButton()) {
            return;
        }
        if (interaction.customId === 'register_confirm') {
            const success = await handleRegistrationConfirm(interaction.user.id);
            if (success) {
                await interaction.reply({
                    content: '✅ Đăng ký thành công! Bạn đã có thể sử dụng các command.',
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: '❌ Đăng ký thất bại. Vui lòng thử lại sau.',
                    ephemeral: true,
                });
            }
            return;
        }
        if (interaction.customId === 'register_decline') {
            await interaction.reply({
                content: '❌ Bạn đã từ chối đăng ký.',
                ephemeral: true,
            });
        }
    },
};
