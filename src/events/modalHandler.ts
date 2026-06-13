import type { ModalSubmitInteraction } from 'discord.js';
import { handleBuyModalSubmit } from './modals/buyModal.js';
import { handleFishSellModalSubmit } from './menu/sellFishInventory.js';

export async function handleModalInteraction(interaction: ModalSubmitInteraction): Promise<void> {
	if (interaction.customId.startsWith('fish_sell_modal:')) {
		await handleFishSellModalSubmit(interaction);
		return;
	}

	if (interaction.customId.startsWith('buy_modal:')) {
		await handleBuyModalSubmit(interaction);
		return;
	}

	console.warn(`Unknown modal customId: ${interaction.customId}`);
}
