import { ButtonInteraction } from 'discord.js';
import { formatEmoji } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { buildFishInventoryPage } from '../../utils/fishInventory.js';

export async function handleFishInventoryButton(interaction: ButtonInteraction): Promise<void> {
	const [action, userId, pageText] = interaction.customId.split(':');

	if (action !== 'fish_inventory_prev' && action !== 'fish_inventory_next') {
		return;
	}

	if (interaction.user.id !== userId) {
		await interaction.reply({
			content: `${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Bạn không thể tương tác với nút này.`,
			ephemeral: true,
		});
		return;
	}

	const data = await getData(interaction.user.id);

	if (!data) {
		await interaction.reply({
			content: `${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể lấy dữ liệu người dùng.`,
			ephemeral: true,
		});
		return;
	}

	const currentPage = Number.parseInt(pageText, 6) || 1;
	const nextPage = action === 'fish_inventory_next' ? currentPage + 1 : currentPage - 1;

	const page = buildFishInventoryPage(
		data.fish_inventory || [],
		nextPage,
		interaction.user.id,
		interaction.user.username,
		undefined,
		interaction.client.user?.displayAvatarURL() || undefined
	);

	// Try to update the original message attached to this interaction.
	// interaction.update will both acknowledge and edit in one call which avoids a stuck loading state.
	try {
		await interaction.update({ embeds: [page.embed], components: page.components });
		return;
	} catch (err) {
		// If update fails (e.g., already acknowledged), fallback to deferUpdate + message.edit
		try {
			await interaction.deferUpdate();
		} catch (e) {
			// ignore
		}

		if (interaction.message) {
			try {
				await interaction.message.edit({ embeds: [page.embed], components: page.components });
			} catch (editErr) {
				try {
					await interaction.followUp({ content: 'Không thể cập nhật trang. Vui lòng thử lại sau.', ephemeral: true });
				} catch (_) {
					// final fallback: nothing else we can do
				}
			}
		}
	}
}