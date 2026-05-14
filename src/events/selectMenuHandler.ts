import type { StringSelectMenuInteraction } from 'discord.js';
import { handleBuySelectMenu } from './modals/buyModal.js';
import { handleFishSellSelectMenu } from './menu/sellFishInventory.js';
import { handleFishRodSelectMenu } from './menu/fishRodSelect.js';

export async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
	if (interaction.customId.startsWith('fish_sell_select:')) {
		await handleFishSellSelectMenu(interaction);
		return;
	}

    if (interaction.customId.startsWith('fish_rod_select:')) {
        await handleFishRodSelectMenu(interaction);
        return;
    }

	await handleBuySelectMenu(interaction);
}