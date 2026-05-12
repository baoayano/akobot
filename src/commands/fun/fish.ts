import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { formatNumber, discordTimestamp } from '../../utils/number.js';
import { processLevelIncrease } from '../../events/increaseLevel.js';

interface CooldownData {
    expiresAt: number;
    messageId: string | null;
}

const cooldown = new Map<string, CooldownData>();

export default {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Đi câu cá và nhận phần thưởng ngẫu nhiên.'),
    async execute(context: CommandContext, _client: BotClient) {
        const emojis = formatEmojis([
            { id: '1411227532459638875', name: 'chocolaglare', animated: false },
            { id: '1481266420464484494', name: '67', animated: true }
        ])
        if (!('member' in context) || !context.member) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        const userId = context.member.user.id;

        if (cooldown.has(userId)) {
            const userCooldown = cooldown.get(userId);
            if (!userCooldown || userCooldown.messageId) return;
            const timeFormat = discordTimestamp(userCooldown.expiresAt, "R");
            const msgCooldown = await context.reply(`${emojis[0]} **| Lỗi:** Onii-chan đang trong thời gian chờ **${timeFormat}**, vui lòng đợi một chút rồi thử lại nhé **>.<**`);
            userCooldown.messageId = msgCooldown.id; // lưu messageId để có thể xóa sau
            setTimeout(() => msgCooldown.delete(), userCooldown.expiresAt - Date.now()); // xóa tin nhắn sau khi thời gian chờ kết thúc
            return;
        }

        cooldown.set(userId, { expiresAt: Date.now() + 10000, messageId: null }); // đặt cooldown 10 giây
        setTimeout(() => cooldown.delete(userId), 10000); // cooldown 10 giây

        // tạm thời chưa làm xong
        await context.reply(`${emojis[1]} **| Đang phát triển lệnh này, vui lòng chờ đợi trong thời gian tới nhé >.<**`);
    }
};