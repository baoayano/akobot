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
		return `**${formatNumber(item.quantity)}** độ bền`;
	}

	// for stack items show only the number with trailing 'x' (no space)
	return `${formatNumber(item.quantity)}x`;
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

	// Separate rods (durability items) from fish/stack items for easier management
	const rods = safeItems.filter((item) => item.name.toLowerCase().includes('rod'));
	const fishes = safeItems.filter((item) => !item.name.toLowerCase().includes('rod'));

	const fishPages = chunkItems(fishes, ITEMS_PER_PAGE);
	const totalPages = Math.max(fishPages.length, 1);
	const currentPage = Math.min(Math.max(page, 1), totalPages);
	const pageItems = fishPages[currentPage - 1] ?? [];

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

	// First, show rods in a dedicated (non-inline) field so they are easy to find/manage
	if (rods.length > 0) {
		const rodLines = rods.map((r) => `${r.name} — ${formatInventoryItem(r)}`);
		embed.addFields({ name: 'Cần câu (Rod)', value: rodLines.join('\n'), inline: false });
	}

	// Then show paginated fish/stack items as inline fields
	if (pageItems.length > 0) {
		const fields = pageItems.map((item, index) => ({
			name: `${item.name}`,
			value: formatInventoryItem(item),
			inline: true,
		}));

		// If there are fewer than 6 fields on the page, add one empty inline field to keep layout tidy
		if (fields.length < 6) {
			fields.push({ name: '\u200b', value: '\u200b', inline: true });
		}

		embed.addFields(fields);
	} else {
		// If there are no fish items on this page but rods exist, add an empty inline field for layout
		if (rods.length > 0) {
			embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
		}
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