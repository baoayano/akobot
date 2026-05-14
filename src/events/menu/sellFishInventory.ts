import {
    ActionRowBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    StringSelectMenuInteraction,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { formatEmojis } from '../../utils/emoji.js';
import { formatNumber } from '../../utils/number.js';
import { getData } from '../../utils/user.js';
import { getFishRewardCatalog } from '../../utils/fishInventory.js';
import { formatSellLabel, type FishSellEntry } from '../buttons/sellFishInventoryButtons.js';

export async function handleFishSellSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const [action, userId] = interaction.customId.split(':');

    if (action !== 'fish_sell_select') {
        return;
    }

    if (interaction.user.id !== userId) {
        await interaction.reply({
            content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Bạn không thể tương tác với menu này.`,
            ephemeral: false,
        });
        return;
    }

    const fishName = interaction.values[0];
    const catalog = await getFishRewardCatalog();
    const reward = catalog.find((entry) => entry.name === fishName);

    if (!reward) {
        await interaction.reply({
            content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Cá được chọn không tồn tại.`,
            ephemeral: false,
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(`fish_sell_modal:${interaction.user.id}:${encodeURIComponent(fishName)}`)
        .setTitle(`Bán ${formatSellLabel({ name: fishName, quantity: 1, rarity: reward.rarity, unitPrice: reward.price } as FishSellEntry)}`);

    const quantityInput = new TextInputBuilder()
        .setCustomId('sell_quantity')
        .setLabel('Số lượng cá muốn bán')
        .setPlaceholder('Ví dụ: 1 hoặc max')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(3);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(quantityInput));

    await interaction.showModal(modal);
}

export async function handleFishSellModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const [action, userId, encodedFishName] = interaction.customId.split(':');

    if (action !== 'fish_sell_modal') {
        return;
    }

    if (interaction.user.id !== userId) {
        await interaction.reply({
            content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Bạn không thể tương tác với modal này.`,
            ephemeral: true,
        });
        return;
    }

    let fishName: string;
    try {
        fishName = decodeURIComponent(encodedFishName);
    } catch {
        await interaction.reply({
            content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Cá được chọn không hợp lệ.`,
            ephemeral: true,
        });
        return;
    }

    const quantityRaw = interaction.fields.getTextInputValue('sell_quantity').trim();
    let quantity: number;

    const data = await getData(interaction.user.id);
    if (!data) {
        await interaction.reply({
            content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Không thể lấy dữ liệu người dùng.`,
            ephemeral: true,
        });
        return;
    }

    const catalog = await getFishRewardCatalog();
    const reward = catalog.find((entry) => entry.name === fishName);

    if (!reward) {
        await interaction.reply({
            content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Cá được chọn không tồn tại trong bảng giá.`,
            ephemeral: true,
        });
        return;
    }

    const inventoryItem = data.user.fish_inventory.find((item: { name: string; quantity: number }) => item.name === fishName);

    if (!inventoryItem) {
        await interaction.reply({
            content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Bạn không còn loại cá này trong inventory.`,
            ephemeral: true,
        });
        return;
    }

    if (quantityRaw.toLowerCase() === 'max') {
        quantity = inventoryItem.quantity;
    } else {
        quantity = Number.parseInt(quantityRaw, 10);
        if (!Number.isInteger(quantity) || quantity <= 0) {
            await interaction.reply({
                content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Số lượng phải là số nguyên lớn hơn 0.`,
                ephemeral: true,
            });
            return;
        }
    }

    if (quantity > inventoryItem.quantity) {
        await interaction.reply({
            content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Onii-chan không đủ cá để bán đâu >.< \nAnh chỉ có **${formatNumber(inventoryItem.quantity)}** con thôii, đừng tham lam quá nhé!`,
            ephemeral: true,
        });
        return;
    }

    const totalCash = reward.price * quantity;
    inventoryItem.quantity -= quantity;

    if (inventoryItem.quantity <= 0) {
        data.user.fish_inventory = data.user.fish_inventory.filter((item: { name: string; quantity: number }) => item.name !== fishName);
    }

    data.user.cash += totalCash;
    await data.user.save();

    await interaction.reply({
        ephemeral: false,
        content: `${formatEmojis([{ id: '1411224000444498023', name: 'Happy', animated: true }])[0]} **| Bán cá thành công!** Onii-chan **@${interaction.user.username}** đã bán **${quantity}x ${fishName}** và nhận **${formatNumber(totalCash)} xu**.`,
    });
}
