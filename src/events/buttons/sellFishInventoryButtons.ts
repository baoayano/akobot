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

		rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton));
	}

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