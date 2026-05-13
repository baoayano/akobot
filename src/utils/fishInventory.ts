import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { formatNumber } from './number.js';

export type InventoryItem = {
	name: string;
	quantity: number;
};

export type FishInventoryPage = {
	embed: EmbedBuilder;
	components: ActionRowBuilder<ButtonBuilder>[];
	totalPages: number;
	currentPage: number;
};

const ITEMS_PER_PAGE = 6;

function chunkItems<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

function formatInventoryItem(item: InventoryItem): string {
	const isDurabilityItem = item.name.toLowerCase().includes('rod');

	if (isDurabilityItem) {
		// keep a hint for durability items
		return `${formatNumber(item.quantity)} độ bền`;
	}

	// for stack items show only the number (no 'Số lượng:' prefix)
	return `${formatNumber(item.quantity)}`;
}

export function buildFishInventoryPage(
	items: InventoryItem[],
	page: number,
	userId: string,
	username?: string,
	avatarUrl?: string,
	botAvatarUrl?: string
): FishInventoryPage {
	const safeItems = items.filter((item) => item.quantity > 0);
	const pages = chunkItems(safeItems, ITEMS_PER_PAGE);
	const totalPages = Math.max(pages.length, 1);
	const currentPage = Math.min(Math.max(page, 1), totalPages);
	const pageItems = pages[currentPage - 1] ?? [];

	const embed = new EmbedBuilder()
		.setTitle('Kho đồ cá')
		.setColor(0xfa8ec4)
		.setThumbnail(botAvatarUrl || '')
		.setAuthor({
			name: username || 'Bot',
			iconURL: avatarUrl || botAvatarUrl || '',
		})
		.setDescription(
			pageItems.length > 0
				? `Đây là toàn bộ **item** trong kho của <@${userId}>.`
				: `Kho đồ của <@${userId}> đang trống.`
		)
		.setFooter({ text: `Trang ${currentPage}/${totalPages}` });

	if (pageItems.length > 0) {
		embed.addFields(
			pageItems.map((item, index) => ({
				name: `${item.name}`,
				value: formatInventoryItem(item),
				inline: true,
			}))
		);
	}

	const prevButton = new ButtonBuilder()
		.setCustomId(`fish_inventory_prev:${userId}:${currentPage}`)
		.setLabel('Trang trước')
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(currentPage <= 1);

	const nextButton = new ButtonBuilder()
		.setCustomId(`fish_inventory_next:${userId}:${currentPage}`)
		.setLabel('Trang sau')
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(currentPage >= totalPages);

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton);

	return {
		embed,
		components: [row],
		totalPages,
		currentPage,
	};
}