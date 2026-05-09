import { Events } from 'discord.js';
import { userExists } from '../utils/user.js';
import { showRegistrationEmbed } from './registration.js';
export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle button interactions
        if (interaction.isButton()) {
            return;
        }
        // Handle slash commands
        if (!interaction.isChatInputCommand()) {
            return;
        }
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            await interaction.reply({
                content: 'Không tìm thấy command này.',
                ephemeral: true,
            });
            return;
        }
        // Check if user is registered
        const exists = await userExists(interaction.user.id);
        if (!exists) {
            await showRegistrationEmbed(interaction);
            return;
        }
        try {
            await command.execute(interaction, client);
        }
        catch (error) {
            console.error(`Command error in ${interaction.commandName}:`, error);
            const payload = {
                content: 'Đã xảy ra lỗi khi chạy command.',
                ephemeral: true,
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
                return;
            }
            await interaction.reply(payload);
        }
    },
};
