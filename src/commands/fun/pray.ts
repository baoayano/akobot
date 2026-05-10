import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { discordTimestamp } from '../../utils/number.js';

interface CooldownData {
    expiresAt: number;
    messageId: string | null;
}

const cooldown = new Map<string, CooldownData>();

export default {
    data: new SlashCommandBuilder()
        .setName('pray')
        .setDescription('Cầu nguyện may mắn để tăng tỉ lệ thắng trong các trò chơi giải trí.'),
    async execute(context: CommandContext, _client: BotClient, args: any[]) {
        const emojis = formatEmojis([
            { id: '1411227532459638875', name: 'chocolaglare', animated: false },
            { id: '1411224849535205398', name: 'SpinFaster', animated: true },
            { id: '1411225431436296233', name: 'Nydanceblack', animated: true }
        ]);

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

        cooldown.set(userId, { expiresAt: Date.now() + 300000, messageId: null }); // đặt cooldown 5 phút
        setTimeout(() => cooldown.delete(userId), 300000); // cooldown 5 phút
        const userData = await getData(userId);

        if (!userData) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể lấy dữ liệu người dùng.`);
            return;
        }

        const { user } = userData;
        user.pray_luck = (user.pray_luck ?? 0) + 1;
        await user.save();

        await context.reply(`${emojis[1]} **| Onii-chan <@${userId}>** đã cầu nguyện... và cảm thấy thật may mắn ${emojis[2]}\nAnh hiện đang có **${user.pray_luck}** điểm may mắn >.<\nTích cực **cầu may**, **vận may** sẽ đến!!`);
    }
};