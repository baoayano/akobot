import { getConfig, setConfig } from './config.js';

export type ShopQuantityMode = 'stack' | 'durability';

export type ShopItem = {
	id: string;
	label: string;
	description: string;
	price: number;
	inventoryName: string;
	quantityMode: ShopQuantityMode;
	durabilityPerUnit?: number;
};

const SHOP_ITEMS_CONFIG_KEY = 'shop_items';

export const defaultShopItems: ShopItem[] = [
	{
		id: 'basic_rod',
		label: 'Cần câu cá',
		description: '3,000 Xu - vật phẩm cần để đi câu',
		price: 3000,
		inventoryName: 'Basic Rod',
		quantityMode: 'durability',
		durabilityPerUnit: 100,
	},
];

function cloneShopItems(items: ShopItem[]): ShopItem[] {
	return items.map((item) => ({ ...item }));
}

export async function getShopItems(): Promise<ShopItem[]> {
	const items = await getConfig(SHOP_ITEMS_CONFIG_KEY);

	if (!Array.isArray(items) || items.length === 0) {
		await setConfig(SHOP_ITEMS_CONFIG_KEY, defaultShopItems);
		return cloneShopItems(defaultShopItems);
	}

	return items as ShopItem[];
}

export async function getShopItem(itemId: string): Promise<ShopItem | undefined> {
	const items = await getShopItems();
	return items.find((item) => item.id === itemId);
}

export function getInventoryQuantity(item: ShopItem, quantity: number): number {
	if (item.quantityMode === 'durability') {
		return quantity * (item.durabilityPerUnit ?? 1);
	}

	return quantity;
}