import {
	ActionRowBuilder,
	ButtonInteraction,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	StringSelectMenuBuilder,
} from 'discord.js';
import { formatEmojis } from '../../utils/emoji.js';
import { formatNumber } from '../../utils/number.js';
import { getData } from '../../utils/user.js';
import { getFishRewardCatalog, getSortedFishInventoryItems, type InventoryItem } from '../../utils/fishInventory.js';

export type FishSellEntry = {
	name: string;
	quantity: number;
	rarity: string;
	unitPrice: number;
};

type FishSellSelectionView = {
	embed: EmbedBuilder;
	components: Array<ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>>;
	totalPages: number;
	currentPage: number;
};

const SELL_OPTIONS_PER_PAGE = 25;

type SellAllSummary = {
	totalQuantity: number;
	totalCash: number;
	sellableNames: Set<string>;
};

const RARITY_SHORT: Record<string, string> = {
	Mythic: 'M',
	Legendary: 'L',
	Treasure: 'T',
	Epic: 'E',
	Rare: 'R',
	Uncommon: 'UC',
	Common: 'C',
	Junk: 'J',
};

function isFishItem(item: InventoryItem): boolean {
	return !item.name.toLowerCase().includes('rod');
}

function getSellAllSummary(
	items: InventoryItem[],
	catalog: Awaited<ReturnType<typeof getFishRewardCatalog>>
): SellAllSummary {
	const priceMap = new Map(
		catalog
			.filter((entry) => Number.isFinite(entry.price) && entry.price >= 0)
			.map((entry) => [entry.name, entry.price])
	);
	const summary: SellAllSummary = {
		totalQuantity: 0,
		totalCash: 0,
		sellableNames: new Set<string>(),
	};

	for (const item of items) {
		const unitPrice = priceMap.get(item.name);

		if (!isFishItem(item) || item.quantity <= 0 || unitPrice === undefined) {
			continue;
		}

		summary.totalQuantity += item.quantity;
		summary.totalCash += item.quantity * unitPrice;
		summary.sellableNames.add(item.name);
	}

	return summary;
}

export function formatSellLabel(entry: FishSellEntry): string {
	const rarityTag = RARITY_SHORT[entry.rarity] || entry.rarity;
	return `${entry.name} [${rarityTag}]`;
}

function buildSellEntryList(items: InventoryItem[], catalog: Awaited<ReturnType<typeof getFishRewardCatalog>>): FishSellEntry[] {
	const catalogMap = new Map(catalog.map((entry) => [entry.name, entry]));

	return items
		.filter(isFishItem)
		.map((item) => {
			const reward = catalogMap.get(item.name);

			return {
				name: item.name,
				quantity: item.quantity,
				rarity: reward?.rarity || 'Junk',
				unitPrice: reward?.price || 0,
			};
		})
		.filter((entry) => entry.quantity > 0)
		.sort((left, right) => {
			const order = (rarity: string) => {
				switch (rarity) {
					case 'Mythic': return 7;
					case 'Legendary': return 6;
					case 'Treasure': return 5;
					case 'Epic': return 4;
					case 'Rare': return 3;
					case 'Uncommon': return 2;
					case 'Common': return 1;
					default: return 0;
				}
			};

			const diff = order(right.rarity) - order(left.rarity);
			if (diff !== 0) return diff;
			return left.name.localeCompare(right.name, 'vi');
		});
}

function buildSellSelectionView(entries: FishSellEntry[], page: number, userId: string): FishSellSelectionView {
	const totalPages = Math.max(Math.ceil(entries.length / SELL_OPTIONS_PER_PAGE), 1);
	const currentPage = Math.min(Math.max(page, 1), totalPages);
	const startIndex = (currentPage - 1) * SELL_OPTIONS_PER_PAGE;
	const pageEntries = entries.slice(startIndex, startIndex + SELL_OPTIONS_PER_PAGE);

	const embed = new EmbedBuilder()
		.setTitle('Bán cá')
		.setColor(0xfa8ec4)
		.setDescription(`Chọn loại cá muốn bán ở trang **${currentPage}/${totalPages}**.`)
		.setFooter({ text: 'Giá bán được tính theo giá trị của cá được định sẵn.' });

	const select = new StringSelectMenuBuilder()
		.setCustomId(`fish_sell_select:${userId}`)
		.setPlaceholder('Chọn cá muốn bán')
		.addOptions(
			pageEntries.map((entry) => ({
				label: formatSellLabel(entry).slice(0, 100),
				description: `Còn ${formatNumber(entry.quantity)} • ${formatNumber(entry.unitPrice)} xu/cá`,
				value: entry.name,
			}))
		);

	const rows: Array<ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>> = [
		new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
	];

	const buttonRow = new ActionRowBuilder<ButtonBuilder>();

	if (totalPages > 1) {
		const prevButton = new ButtonBuilder()
			.setCustomId(`fish_sell_prev:${userId}:${currentPage}`)
			.setLabel('Trang trước')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(currentPage <= 1);

		const nextButton = new ButtonBuilder()
			.setCustomId(`fish_sell_next:${userId}:${currentPage}`)
			.setLabel('Trang sau')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(currentPage >= totalPages);

		buttonRow.addComponents(prevButton, nextButton);
	}

	const sellAllButton = new ButtonBuilder()
		.setCustomId(`fish_sell_all:${userId}`)
		.setLabel('Bán toàn bộ cá')
		.setStyle(ButtonStyle.Danger);

	buttonRow.addComponents(sellAllButton);
	rows.push(buttonRow);

	return { embed, components: rows, totalPages, currentPage };
}

export async function handleFishSellOpenButton(interaction: ButtonInteraction): Promise<void> {
	const [action, userId] = interaction.customId.split(':');

	if (action !== 'fish_sell_open') {
		return;
	}

	if (interaction.user.id !== userId) {
		await interaction.reply({
			content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Bạn không thể tương tác với nút này.`,
			ephemeral: true,
		});
		return;
	}

	const data = await getData(interaction.user.id);
	if (!data) {
		await interaction.reply({
			content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Không thể lấy dữ liệu người dùng.`,
			ephemeral: true,
		});
		return;
	}

	const catalog = await getFishRewardCatalog();
	const sortedInventory = await getSortedFishInventoryItems(data.fish_inventory || []);
	const sellEntries = buildSellEntryList(sortedInventory, catalog);

	if (sellEntries.length === 0) {
		const emoji = formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0];
		await interaction.reply({
			content: `${emoji} **| Lỗi:** Kho của bạn chưa có cá để bán.`,
			ephemeral: true,
		});
		return;
	}

	const emoji = formatEmojis([{ id: '1495645888121667706', name: 'Juvia_shook', animated: false }])[0];
	const view = buildSellSelectionView(sellEntries, 1, interaction.user.id);

	await interaction.reply({
		ephemeral: true,
		content: `${emoji} **| Chọn cá để bán**`,
		embeds: [view.embed],
		components: view.components,
	});
}

export async function handleFishSellPageButton(interaction: ButtonInteraction): Promise<void> {
	const [action, userId, pageText] = interaction.customId.split(':');

	if (action !== 'fish_sell_prev' && action !== 'fish_sell_next') {
		return;
	}

	if (interaction.user.id !== userId) {
		await interaction.reply({
			content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Bạn không thể tương tác với nút này.`,
			ephemeral: true,
		});
		return;
	}

	const data = await getData(interaction.user.id);
	if (!data) {
		await interaction.reply({
			content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Không thể lấy dữ liệu người dùng.`,
			ephemeral: true,
		});
		return;
	}

	const catalog = await getFishRewardCatalog();
	const sortedInventory = await getSortedFishInventoryItems(data.fish_inventory || []);
	const sellEntries = buildSellEntryList(sortedInventory, catalog);
	const currentPage = Number.parseInt(pageText, 10) || 1;
	const nextPage = action === 'fish_sell_next' ? currentPage + 1 : currentPage - 1;
	const view = buildSellSelectionView(sellEntries, nextPage, interaction.user.id);

	try {
		await interaction.update({ embeds: [view.embed], components: view.components });
		return;
	} catch {
		try {
			await interaction.deferUpdate();
		} catch {}

		if (interaction.message) {
			await interaction.message.edit({ embeds: [view.embed], components: view.components });
		}
	}
}

export async function handleFishSellAllButton(interaction: ButtonInteraction): Promise<void> {
	const [action, userId] = interaction.customId.split(':');

	if (action !== 'fish_sell_all') {
		return;
	}

	if (interaction.user.id !== userId) {
		await interaction.reply({
			content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Bạn không thể tương tác với nút này.`,
			ephemeral: true,
		});
		return;
	}

	const data = await getData(interaction.user.id);
	if (!data) {
		await interaction.reply({
			content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Không thể lấy dữ liệu người dùng.`,
			ephemeral: true,
		});
		return;
	}

	const catalog = await getFishRewardCatalog();
	const summary = getSellAllSummary(data.fish_inventory || [], catalog);

	if (summary.totalQuantity === 0) {
		await interaction.reply({
			content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Kho của bạn chưa có cá hợp lệ để bán.`,
			ephemeral: true,
		});
		return;
	}

	const confirmButton = new ButtonBuilder()
		.setCustomId(`fish_sell_all_confirm:${userId}`)
		.setLabel('Xác nhận bán')
		.setStyle(ButtonStyle.Danger);
	const cancelButton = new ButtonBuilder()
		.setCustomId(`fish_sell_all_cancel:${userId}`)
		.setLabel('Hủy')
		.setStyle(ButtonStyle.Secondary);

	await interaction.reply({
		ephemeral: true,
		content: `**Xác nhận bán toàn bộ cá?**\nBạn sẽ bán **${formatNumber(summary.totalQuantity)} con cá** và nhận **${formatNumber(summary.totalCash)} xu**. Cần câu và item không có trong bảng giá sẽ được giữ lại.`,
		components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton)],
	});
}

export async function handleFishSellAllConfirmButton(interaction: ButtonInteraction): Promise<void> {
	const [action, userId] = interaction.customId.split(':');

	if (action !== 'fish_sell_all_confirm') {
		return;
	}

	if (interaction.user.id !== userId) {
		await interaction.reply({
			content: `${formatEmojis([{ id: '1411227532459638875', name: 'chocolaglare', animated: false }])[0]} **| Lỗi:** Bạn không thể tương tác với nút này.`,
			ephemeral: true,
		});
		return;
	}

	const data = await getData(interaction.user.id);
	if (!data) {
		await interaction.update({ content: '**Lỗi:** Không thể lấy dữ liệu người dùng.', components: [] });
		return;
	}

	const catalog = await getFishRewardCatalog();
	const summary = getSellAllSummary(data.fish_inventory || [], catalog);

	if (summary.totalQuantity === 0) {
		await interaction.update({ content: '**Lỗi:** Kho của bạn không còn cá hợp lệ để bán.', components: [] });
		return;
	}

	data.user.fish_inventory = data.user.fish_inventory.filter(
		(item: InventoryItem) => !summary.sellableNames.has(item.name) || !isFishItem(item)
	);
	data.user.cash += summary.totalCash;
	await data.user.save();

	await interaction.update({
		content: `${formatEmojis([{ id: '1411224000444498023', name: 'Happy', animated: true }])[0]} **| Bán toàn bộ cá thành công!** Bạn đã bán **${formatNumber(summary.totalQuantity)} con cá** và nhận **${formatNumber(summary.totalCash)} xu**.`,
		components: [],
	});
}

export async function handleFishSellAllCancelButton(interaction: ButtonInteraction): Promise<void> {
	const [action] = interaction.customId.split(':');

	if (action !== 'fish_sell_all_cancel') {
		return;
	}

	await interaction.update({
		content: 'Đã hủy bán toàn bộ cá.',
		components: [],
	});
}
