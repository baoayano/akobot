import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { formatNumber, discordTimestamp } from '../../utils/number.js';
import { processLevelIncrease } from '../../events/increaseLevel.js';
import { getConfig, setConfig } from '../../utils/config.js';
import { getRandomFish } from '../../utils/fun.js';
import { resolveFishRodName, getNextFishRodName } from '../../utils/fishInventory.js';

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
            { id: '1481266420464484494', name: '67', animated: true },
            { id: '1504104410383388753', name: 'fishing', animated: true },
            { id: '1411196789914206238', name: 'CatgirlChenHyper', animated: true },
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

        let listRewards = await getConfig('fish_rewards');
        if (!listRewards || !Array.isArray(listRewards) || listRewards.length === 0) {
            const defaultFish = [
                // Common (40%)
                { name: 'Cá thu nhỏ', rarity: 'Common', probability: 4.0, price: 100 },
                { name: 'Cá rô phi', rarity: 'Common', probability: 4.0, price: 100 },
                { name: 'Cá trê', rarity: 'Common', probability: 4.0, price: 100 },
                { name: 'Cá mè', rarity: 'Common', probability: 4.0, price: 100 },
                { name: 'Cá cơm', rarity: 'Common', probability: 4.0, price: 100 },
                { name: 'Cá vàng nhỏ', rarity: 'Common', probability: 4.0, price: 100 },
                { name: 'Cá chép', rarity: 'Common', probability: 4.0, price: 100 },
                { name: 'Cá mòi', rarity: 'Common', probability: 4.0, price: 100 },
                { name: 'Cá basa', rarity: 'Common', probability: 4.0, price: 100 },
                { name: 'Cá bống', rarity: 'Common', probability: 4.0, price: 100 },

                // Uncommon (25%)
                { name: 'Cá hồi', rarity: 'Uncommon', probability: 2.5, price: 500 },
                { name: 'Cá ngừ', rarity: 'Uncommon', probability: 2.5, price: 500 },
                { name: 'Cá kiếm', rarity: 'Uncommon', probability: 2.5, price: 500 },
                { name: 'Cá nóc', rarity: 'Uncommon', probability: 2.5, price: 500 },
                { name: 'Cá chim', rarity: 'Uncommon', probability: 2.5, price: 500 },
                { name: 'Cá tuyết', rarity: 'Uncommon', probability: 2.5, price: 500 },
                { name: 'Cá hồng', rarity: 'Uncommon', probability: 2.5, price: 500 },
                { name: 'Cá thu lớn', rarity: 'Uncommon', probability: 2.5, price: 500 },
                { name: 'Cá bống tượng', rarity: 'Uncommon', probability: 2.5, price: 500 },
                { name: 'Cá saba', rarity: 'Uncommon', probability: 2.5, price: 500 },

                // Rare (16%)
                { name: 'Cá mập con', rarity: 'Rare', probability: 2.0, price: 2000 },
                { name: 'Cá đuối', rarity: 'Rare', probability: 2.0, price: 2000 },
                { name: 'Cá barracuda', rarity: 'Rare', probability: 2.0, price: 2000 },
                { name: 'Cá marlin', rarity: 'Rare', probability: 2.0, price: 2000 },
                { name: 'Cá điện', rarity: 'Rare', probability: 2.0, price: 2000 },
                { name: 'Cá anglerfish', rarity: 'Rare', probability: 2.0, price: 2000 },
                { name: 'Cá koi vàng', rarity: 'Rare', probability: 2.0, price: 2000 },
                { name: 'Cá hải tượng', rarity: 'Rare', probability: 2.0, price: 2000 },

                // Epic (6%)
                { name: 'Cá rồng', rarity: 'Epic', probability: 1.0, price: 10000 },
                { name: 'Cá mập trắng', rarity: 'Epic', probability: 1.0, price: 10000 },
                { name: 'Cá abyss', rarity: 'Epic', probability: 1.0, price: 10000 },
                { name: 'Cá ghost', rarity: 'Epic', probability: 1.0, price: 10000 },
                { name: 'Cá crystal', rarity: 'Epic', probability: 1.0, price: 10000 },
                { name: 'Cá magma', rarity: 'Epic', probability: 1.0, price: 10000 },

                // Legendary (1.2%)
                { name: 'Ancient Koi', rarity: 'Legendary', probability: 0.3, price: 50000 },
                { name: 'Void Fish', rarity: 'Legendary', probability: 0.3, price: 50000 },
                { name: 'Celestial Whale', rarity: 'Legendary', probability: 0.3, price: 50000 },
                { name: 'Kraken Spawn', rarity: 'Legendary', probability: 0.3, price: 50000 },

                // Mythic / Secret (0.3%)
                { name: 'Glitched Fish', rarity: 'Mythic', probability: 0.1, price: 250000 },
                { name: 'Corrupted Leviathan', rarity: 'Mythic', probability: 0.1, price: 250000 },
                { name: 'Ethereal Koi', rarity: 'Mythic', probability: 0.1, price: 250000 },

                // Junk (9%)
                { name: 'Giày cũ', rarity: 'Junk', probability: 2.0, price: 10 },
                { name: 'Lon nước', rarity: 'Junk', probability: 2.0, price: 10 },
                { name: 'Túi nilon', rarity: 'Junk', probability: 2.0, price: 10 },
                { name: 'Cành cây', rarity: 'Junk', probability: 2.0, price: 10 },
                { name: 'Radio hỏng', rarity: 'Junk', probability: 1.0, price: 25 },

                // Treasure (2.5%)
                { name: 'Rương cổ', rarity: 'Treasure', probability: 1.0, price: 15000 },
                { name: 'Ngọc trai', rarity: 'Treasure', probability: 1.0, price: 12000 },
                { name: 'Ruby biển sâu', rarity: 'Treasure', probability: 0.5, price: 30000 },
            ];

            await setConfig('fish_rewards', defaultFish);
            listRewards = defaultFish;
        }

        const userData = await getData(userId);
        if (!userData) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể lấy dữ liệu người dùng.`);
            return;
        }

        const inventory = userData.fish_inventory || [];
        const fishingRod = inventory.filter((item: { name: string, quantity: number }) => item.name.toLowerCase().includes('rod') && item.quantity > 0);
        if (!fishingRod || fishingRod.length === 0) {
            await context.reply(`${emojis[0]} **| Lỗi:** Onii-chan không có cần câu để câu cá. Hãy mua cần câu để có thể đi câu cá nhé <3`);
            return;
        }

        const user = userData.user;
        const resolvedFishingRod = resolveFishRodName(inventory, user.fish_rod) || fishingRod[0].name;
        user.fish_rod = resolvedFishingRod;

        const reward = getRandomFish(listRewards, userData.pray_luck || 0, resolvedFishingRod);

        let updatedInventory = user.fish_inventory.map((item: { name: string, quantity: number }) => {
            if (item.name === resolvedFishingRod) {
                return { name: item.name, quantity: item.quantity - 1 };
            }
            return item;
        });

        const currentRodQuantity = updatedInventory.find((item: { name: string, quantity: number }) => item.name === resolvedFishingRod)?.quantity || 0;
        if (currentRodQuantity <= 0) {
            const nextFishingRod = getNextFishRodName(updatedInventory.filter((item: { name: string, quantity: number }) => item.quantity > 0), resolvedFishingRod);
            user.fish_rod = nextFishingRod || '';
        }

        updatedInventory = updatedInventory.filter((item: { name: string, quantity: number }) => item.quantity > 0);

        const existingFish = updatedInventory.find((item: { name: string, quantity: number }) => item.name === reward.name);
        if (existingFish) {
            updatedInventory = updatedInventory.map((item: { name: string, quantity: number }) => {
                if (item.name === reward.name) {
                    return { name: item.name, quantity: item.quantity + 1 };
                }
                return item;
            });
        } else {
            updatedInventory.push({ name: reward.name, quantity: 1 });
        }

        user.fish_inventory = updatedInventory;

        await user.save();

        const msg = await context.reply(`${emojis[2]} **| Onii-chan** đang câu cá...`);
        
        setTimeout(async () => {
            await msg.edit(`${emojis[3]} **| Onii-chan** đã câu được **${reward.name}** >.<\n**Độ hiếm:** ${reward.rarity}\n**Giá trị:** ${formatNumber(reward.price)} xu\n\n**🎣 Tích cực câu cá, vận may sẽ tới!**`);
            await processLevelIncrease(context, _client, true);
        }, 2000); // delay 2 giây để tạo cảm giác câu cá
    }
};