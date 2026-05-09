import { Events } from 'discord.js';
import type { BotClient } from '../types.js';
import { userExists, getData } from '../utils/user.js';
import { showRegistrationEmbed } from './registration.js';
import { getMaxLevelExp, getLevelUpCoins } from '../utils/economy.js';
import { formatEmoji } from '../utils/emoji.js';
import { formatNumber } from '../utils/number.js';

const cooldown = new Set<string>();
const cooldownTime = 5000;

export default {
  name: Events.MessageCreate,
  async execute(message: any, client: BotClient) {
    if (message.author.bot) {
      return;
    }

    const prefix = client.prefix ?? 'ako';

    if (!message.content.toLowerCase().startsWith(prefix)) {
      // level up system for messages that are not commands
      if (cooldown.has(message.author.id)) return;
      const exists = await userExists(message.author.id);
      if (exists) {
        cooldown.add(message.author.id);
        setTimeout(() => cooldown.delete(message.author.id), cooldownTime);
        const userData = await getData(message.author.id);

        if (userData) {
          const { user } = userData;
          user.exp += Math.floor(Math.random() * 15) + 10;
          const maxExp = getMaxLevelExp(user.level);

          if (user.exp >= maxExp) {
            user.exp -= maxExp;
            user.level += 1;
            const receive = getLevelUpCoins(user.level);
            user.cash += receive;

            await message.channel.send(`${formatEmoji('1411227139440771102', 'AstolfoShake', true)} **| <@${message.author.id}>**, chúc mừng onii-chan đã lên cấp **${user.level}**!\n**Ngoài ra,** anh đã nhận được thêm **${formatNumber(receive)} xu** để thưởng cho việc lên cấp độ! ${formatEmoji('1411197349530701867', 'FancyCirno', false)}\nEm rất tự hào về anh! Hãy cố gắng lên cấp cao hơn nữa nhé ${formatEmoji('1411195667417665596', 'ReimuWink')}`);
          }

          await user.save();
        }
      }
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