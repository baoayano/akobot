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
import { getOrCreateUser } from '../../utils/user.js';
import { getInventoryQuantity, getShopItem } from '../../utils/shop.js';

export async function handleBuySelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
	const emojis = formatEmojis([
		{ id: '1411227532459638875', name: 'chocolaglare', animated: false },
		{ id: '1411198604965843034', name: 'Scared' },
	]);

	const [action, userId] = interaction.customId.split(':');

	if (action !== 'buy_select') {
		return;
	}

	if (interaction.user.id !== userId) {
		await interaction.reply({
			content: `${emojis[0]} **| Lỗi:** Bạn không thể mua hàng bằng menu của người khác.`,
			ephemeral: true,
		});
		return;
	}

	const itemId = interaction.values[0];
	const item = await getShopItem(itemId);

	if (!item) {
		await interaction.reply({
			content: `${emojis[1]} **| Lỗi:** Vật phẩm được chọn không tồn tại.`,
			ephemeral: true,
		});
		return;
	}

	const modal = new ModalBuilder()
		.setCustomId(`buy_modal:${interaction.user.id}:${item.id}`)
		.setTitle(`Mua ${item.label}`);

	const quantityInput = new TextInputBuilder()
		.setCustomId('buy_quantity')
		.setLabel('Số lượng muốn mua')
		.setPlaceholder('Nhập số lượng, ví dụ: 1')
		.setStyle(TextInputStyle.Short)
		.setRequired(true)
		.setMinLength(1)
		.setMaxLength(3);

	const row = new ActionRowBuilder<TextInputBuilder>().addComponents(quantityInput);
	modal.addComponents(row);

	await interaction.showModal(modal);
}

export async function handleBuyModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
	const emojis = formatEmojis([
		{ id: '1411227532459638875', name: 'chocolaglare', animated: false },
		{ id: '1411224646304534601', name: 'Giggle', animated: true },
	]);

	const [action, userId, itemId] = interaction.customId.split(':');

	if (action !== 'buy_modal') {
		return;
	}

	if (interaction.user.id !== userId) {
		await interaction.reply({
			content: `${emojis[1]} **| Lỗi:** Bạn không thể gửi modal của người khác.`,
			ephemeral: true,
		});
		return;
	}

	const item = await getShopItem(itemId);

	if (!item) {
		await interaction.reply({
			content: `${emojis[0]} **| Lỗi:** Vật phẩm được chọn không tồn tại.`,
			ephemeral: true,
		});
		return;
	}

	const rawQuantity = interaction.fields.getTextInputValue('buy_quantity').trim();
	const quantity = Number.parseInt(rawQuantity, 10);

	if (!Number.isInteger(quantity) || quantity <= 0) {
		await interaction.reply({
			content: `${emojis[0]} **| Lỗi:** Số lượng phải là số nguyên lớn hơn 0.`,
			ephemeral: true,
		});
		return;
	}

	const user = await getOrCreateUser(interaction.user.id);
	const totalPrice = item.price * quantity;

	if (user.cash < totalPrice) {
		await interaction.reply({
			content: `${emojis[0]} **| Lỗi:** Bạn không đủ xu để mua **${quantity} x ${item.label}**. Cần **${formatNumber(totalPrice)} xu** nhưng hiện chỉ có **${formatNumber(user.cash)} xu**.`,
			ephemeral: true,
		});
		return;
	}

	user.cash -= totalPrice;

	const inventoryQuantity = getInventoryQuantity(item, quantity);

	const existingItem = user.fish_inventory.find(
		(entry: { name: string; quantity: number }) => entry.name === item.inventoryName
	);
	if (existingItem) {
		existingItem.quantity += inventoryQuantity;
	} else {
		user.fish_inventory.push({ name: item.inventoryName, quantity: inventoryQuantity });
	}

	await user.save();

	await interaction.reply({
		content: `${emojis[1]} **| Mua hàng thành công!** Bạn đã mua **${quantity}x ${item.label}** với giá **${formatNumber(totalPrice)} xu**.`,
		ephemeral: true,
	});
}
