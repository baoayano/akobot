import { Events, Message } from 'discord.js';
import type { CommandContext, BotClient } from '../types.js';
import { userExists, getData } from '../utils/user.js';
import { getMaxLevelExp, getLevelUpCoins } from '../utils/economy.js';
import { formatEmojis } from '../utils/emoji.js';
import { formatNumber } from '../utils/number.js';

const cooldown = new Set<string>();
const cooldownTime = 5000;

export async function processLevelIncrease(message: Message | CommandContext, client?: BotClient, bypass: boolean = false) {
    const emojis = formatEmojis([
        { id: '1411227139440771102', name: 'AstolfoShake', animated: true },
        { id: '1411197349530701867', name: 'FancyCirno', animated: false },
        { id: '1411195667417665596', name: 'ReimuWink', animated: false }
    ]);

    if (message instanceof Message) {
        const prefix = client?.prefix ?? 'ako';
        if (message.content.toLowerCase().startsWith(prefix) && !bypass) {
            return;
        }

        if (cooldown.has(message.author.id)) return;
        const exists = await userExists(message.author.id);
        if (!exists) return;

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

                if ('send' in message.channel) {
                    await message.channel.send(`${emojis[0]} **| <@${message.author.id}>**, chúc mừng onii-chan đã lên cấp **${user.level}**!\n**Ngoài ra,** anh đã nhận được thêm **${formatNumber(receive)} xu** để thưởng cho việc lên cấp độ! ${emojis[1]}\nEm rất tự hào về anh! Hãy cố gắng lên cấp cao hơn nữa nhé ${emojis[2]}`);
                }
            }

            await user.save();
        }

        return;
    }

    if (!('member' in message) || !message.member) return;

    const member = message.member;

    if (cooldown.has(member.user.id)) return;
    const exists = await userExists(member.user.id);
    if (!exists) return;

    cooldown.add(member.user.id);
    setTimeout(() => cooldown.delete(member.user.id), cooldownTime);
    const userData = await getData(member.user.id);

    if (userData) {
        const { user } = userData;
        user.exp += Math.floor(Math.random() * 25) + 10;
        const maxExp = getMaxLevelExp(user.level);

        if (user.exp >= maxExp) {
            user.exp -= maxExp;
            user.level += 1;
            const receive = getLevelUpCoins(user.level);
            user.cash += receive;
            await message.reply(`${emojis[0]} **| Chúc mừng onii-chan @${member.user.username}** đã lên cấp **${user.level}**!\n**Ngoài ra,** anh đã nhận được thêm **${formatNumber(receive)} xu** để thưởng cho việc lên cấp độ! ${emojis[1]}\nEm rất tự hào về anh! Hãy cố gắng lên cấp cao hơn nữa nhé ${emojis[2]}`);
        }

        await user.save();
    }
}

export default {
    name: Events.MessageCreate,
    async execute(message: Message | CommandContext, client: BotClient) {
        await processLevelIncrease(message, client);
    },
};
