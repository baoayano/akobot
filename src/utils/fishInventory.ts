import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message } from 'discord.js';
import { getConfig } from './config.js';
import { formatNumber } from './number.js';
import { formatEmojis } from './emoji.js';

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
const RARITY_ORDER: Record<string, number> = {
	Mythic: 7,
	Legendary: 6,
	Treasure: 5,
	Epic: 4,
	Rare: 3,
	Uncommon: 2,
	Common: 1,
	Junk: 0,
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

const inventoryDisableTimers = new Map<string, NodeJS.Timeout>();
const INVENTORY_BUTTON_DISABLE_MS = 60_000;

export type FishRewardInfo = {
	name: string;
	rarity: string;
	price: number;
};

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

function getInventorySortKey(item: InventoryItem, rarityLookup: Record<string, string>): number {
	const rarity = rarityLookup[item.name] || 'Junk';
	return RARITY_ORDER[rarity] ?? 0;
}

export function getFishRods(items: InventoryItem[]): InventoryItem[] {
	return items.filter((item) => item.quantity > 0 && item.name.toLowerCase().includes('rod'));
}

export function resolveFishRodName(items: InventoryItem[], currentFishRod?: string | null): string | null {
	const rods = getFishRods(items);

	if (rods.length === 0) {
		return null;
	}

	if (currentFishRod) {
		const matchedRod = rods.find((item) => item.name === currentFishRod);

		if (matchedRod) {
			return matchedRod.name;
		}
	}

	return rods[0].name;
}

export function getNextFishRodName(items: InventoryItem[], currentFishRod?: string | null): string | null {
	const rods = getFishRods(items);

	if (rods.length === 0) {
		return null;
	}

	if (!currentFishRod) {
		return rods[0].name;
	}

	const currentIndex = rods.findIndex((item) => item.name === currentFishRod);

	if (currentIndex === -1) {
		return rods[0].name;
	}

	if (rods.length === 1) {
		return rods[0].name;
	}

	return rods[(currentIndex + 1) % rods.length].name;
}

export function resolveFishRodSelection(items: InventoryItem[], query: string): InventoryItem | null {
	const rods = getFishRods(items);
	const normalizedQuery = query.trim();

	if (!normalizedQuery || rods.length === 0) {
		return null;
	}

	if (/^\d+$/.test(normalizedQuery)) {
		const index = Number.parseInt(normalizedQuery, 10) - 1;
		return rods[index] || null;
	}

	const lowered = normalizedQuery.toLowerCase();
	return rods.find((item) => item.name.toLowerCase() === lowered) || null;
}

export async function getFishRewardCatalog(): Promise<FishRewardInfo[]> {
	const rewards = await getConfig('fish_rewards', []);

	if (!Array.isArray(rewards)) {
		return [];
	}

	return rewards
		.filter((reward) => reward && typeof reward === 'object' && 'name' in reward && 'rarity' in reward && 'price' in reward)
		.map((reward) => ({
			name: String((reward as { name: unknown }).name),
			rarity: String((reward as { rarity: unknown }).rarity),
			price: Number((reward as { price: unknown }).price),
		}));
}

async function getFishRarityLookup(): Promise<Record<string, string>> {
	const catalog = await getFishRewardCatalog();
	const rarityLookup: Record<string, string> = {};

	for (const reward of catalog) {
		rarityLookup[reward.name] = reward.rarity;
	}

	return rarityLookup;
}

function formatFishName(item: InventoryItem, rarityLookup: Record<string, string>): string {
	const rarity = rarityLookup[item.name];
	const rarityTag = rarity ? RARITY_SHORT[rarity] : undefined;

	if (!rarityTag) {
		return item.name;
	}

	return `${item.name} [${rarityTag}]`;
}

export function disableFishInventoryComponents(
	components: ActionRowBuilder<ButtonBuilder>[]
): ActionRowBuilder<ButtonBuilder>[] {
	return components.map((row) => {
		const disabledRow = new ActionRowBuilder<ButtonBuilder>();
		disabledRow.addComponents(
			row.components.map((component) =>
				ButtonBuilder.from(component).setDisabled(true)
			)
		);
		return disabledRow;
	});
}

export function scheduleFishInventoryButtonDisable(
	message: Message<boolean>,
	components: ActionRowBuilder<ButtonBuilder>[],
	delayMs: number = INVENTORY_BUTTON_DISABLE_MS
): void {
	const existingTimer = inventoryDisableTimers.get(message.id);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}

	const timer = setTimeout(async () => {
		try {
			await message.edit({ components: disableFishInventoryComponents(components) });
		} catch (error) {
			console.warn(`Failed to auto-disable fish inventory buttons for message ${message.id}:`, error);
		} finally {
			inventoryDisableTimers.delete(message.id);
		}
	}, delayMs);

	inventoryDisableTimers.set(message.id, timer);
}

export async function getSortedFishInventoryItems(items: InventoryItem[]): Promise<InventoryItem[]> {
	const rarityLookup = await getFishRarityLookup();

	return [...items].sort((left, right) => {
		const rightKey = getInventorySortKey(right, rarityLookup);
		const leftKey = getInventorySortKey(left, rarityLookup);

		if (rightKey !== leftKey) {
			return rightKey - leftKey;
		}

		return left.name.localeCompare(right.name, 'vi');
	});
}

export async function buildFishInventoryPage(
	items: InventoryItem[],
	page: number,
	userId: string,
	username?: string,
	activeRodName?: string | null,
	avatarUrl?: string,
	botAvatarUrl?: string
): Promise<FishInventoryPage> {
	const emojis = formatEmojis([
		{ id: '1411197157574311936', name: 'catgirl_satori_angry' }
	]);

	const rarityLookup = await getFishRarityLookup();
	const safeItems = items.filter((item) => item.quantity > 0);

	// Separate rods (durability items) from fish/stack items for easier management
	const rods = safeItems.filter((item) => item.name.toLowerCase().includes('rod'));
	const fishes = safeItems.filter((item) => !item.name.toLowerCase().includes('rod'));

	const fishPages = chunkItems(fishes, ITEMS_PER_PAGE);
	const totalPages = Math.max(fishPages.length, 1);
	const currentPage = Math.min(Math.max(page, 1), totalPages);
	const pageItems = fishPages[currentPage - 1] ?? [];

	const embed = new EmbedBuilder()
		.setTitle('Kho đồ cá 🐟')
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

	embed.addFields({
		name: `Chú thích độ hiếm ${emojis[0]}`,
		value: [
			'**S-tier:**  Mythic `[M]`  •  Legendary `[L]`',
			'**A-tier:**  Treasure `[T]` •  Epic `[E]`',
			'**B-tier:**  Rare `[R]`    •  Uncommon `[UC]`',
			'**C-tier:**  Common `[C]`  •  Junk `[J]`',
		].join('\n'),
		inline: false,
	});

	// First, show rods in a dedicated (non-inline) field so they are easy to find/manage
	if (rods.length > 0) {
		const activeRod = activeRodName ? rods.find((rod) => rod.name === activeRodName) : null;

		embed.addFields({
			name: 'Cần câu đang dùng 🎣',
			value: activeRod
				? `**${activeRod.name}** — ${formatInventoryItem(activeRod)}`
				: 'Chưa chọn cần câu phù hợp.',
			inline: false,
		});

		const rodLines = rods.map((r) => `${r.name} — ${formatInventoryItem(r)}`);
		embed.addFields({ name: 'Cần câu (Rod) 🎣', value: rodLines.join('\n'), inline: false });
	}

	// Then show paginated fish/stack items as inline fields
	if (pageItems.length > 0) {
		const fields = pageItems.map((item, index) => ({
			name: formatFishName(item, rarityLookup),
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
	const switchRodButton = new ButtonBuilder()
		.setCustomId(`fish_rod_switch:${userId}:${currentPage}`)
		.setLabel('Chuyển cần câu')
		.setStyle(ButtonStyle.Primary)
		.setDisabled(rods.length <= 1);
	const sellButton = new ButtonBuilder()
		.setCustomId(`fish_sell_open:${userId}`)
		.setLabel('Bán cá')
		.setStyle(ButtonStyle.Success)
		.setDisabled(fishes.length === 0);

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton, switchRodButton, sellButton);

	return {
		embed,
		components: [row],
		totalPages,
		currentPage,
	};
}