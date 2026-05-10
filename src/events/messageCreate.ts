import { Events, Message } from 'discord.js';
import type { BotClient } from '../types.js';
import { userExists } from '../utils/user.js';
import { showRegistrationEmbed } from './registration.js';
import increaseLevel from './increaseLevel.js';

export default {
  name: Events.MessageCreate,
  async execute(message: Message, client: BotClient) {
    if (message.author.bot) {
      return;
    }

    const prefix = client.prefix ?? 'ako';

    if (!message.content.toLowerCase().startsWith(prefix)) {
      return;
    }

    const raw = message.content.slice(prefix.length).trim();

    if (!raw) {
      return;
    }

    const [commandName, ...args] = raw.split(/\s+/);
    const command = client.prefixCommands.get(commandName.toLowerCase());

    if (!command) {
      return;
    }

    // Check if user is registered
    const exists = await userExists(message.author.id);

    if (!exists) {
      await showRegistrationEmbed(message);
      return;
    }

    try {
      await command.execute(message, client, args);
    } catch (error) {
      console.error(`Prefix command error in ${commandName}:`, error);
      await message.reply('Đã xảy ra lỗi khi chạy command prefix.');
    }
  },
};