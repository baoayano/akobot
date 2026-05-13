import { Events, Interaction } from 'discord.js';
import type { BotClient } from '../types.js';
import { userExists } from '../utils/user.js';
import { showRegistrationEmbed } from './registration.js';
import { handleButtonInteraction } from './buttonHandler.js';
import { handleBuyModalSubmit, handleBuySelectMenu } from './buttons/buyModal.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: BotClient) {
    // Handle button interactions
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleBuySelectMenu(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleBuyModalSubmit(interaction);
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
    } catch (error) {
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