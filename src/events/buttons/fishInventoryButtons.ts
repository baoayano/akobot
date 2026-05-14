import { ActionRowBuilder, ButtonInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction } from 'discord.js';
import { formatEmoji } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import {
	buildFishInventoryPage,
	resolveFishRodName,
	getFishRods,
	getSortedFishInventoryItems,
	scheduleFishInventoryButtonDisable,
} from '../../utils/fishInventory.js';

export async function handleFishInventoryButton(interaction: ButtonInteraction): Promise<void> {
	const [action, userId, pageText] = interaction.customId.split(':');

	if (action !== 'fish_inventory_prev' && action !== 'fish_inventory_next') {
		return;
	}

	if (interaction.user.id !== userId) {
		await interaction.reply({
			content: `${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Onii-chan không thể tương tác với nút này.`,
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

	const currentPage = Number.parseInt(pageText, 10) || 1;
	const nextPage = action === 'fish_inventory_next' ? currentPage + 1 : currentPage - 1;
	const sortedItems = await getSortedFishInventoryItems(data.fish_inventory || []);
	const resolvedFishRod = resolveFishRodName(data.fish_inventory || [], data.fish_rod);

	if (resolvedFishRod !== data.fish_rod) {
		data.user.fish_rod = resolvedFishRod || '';
		await data.user.save();
	}

	const page = await buildFishInventoryPage(
		sortedItems,
		nextPage,
		interaction.user.id,
		interaction.user.username,
		resolvedFishRod,
		undefined,
		interaction.client.user?.displayAvatarURL() || undefined
	);

	// Try to update the original message attached to this interaction.
	// interaction.update will both acknowledge and edit in one call which avoids a stuck loading state.
	try {
		await interaction.update({ embeds: [page.embed], components: page.components });
		scheduleFishInventoryButtonDisable(interaction.message, page.components);
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
				scheduleFishInventoryButtonDisable(interaction.message, page.components);
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

export async function handleFishRodSwitchButton(interaction: ButtonInteraction): Promise<void> {
	const [action, userId, pageText] = interaction.customId.split(':');

	if (action !== 'fish_rod_switch') return;

	if (interaction.user.id !== userId) {
		await interaction.reply({ content: `${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Onii-chan không thể tương tác với nút này.`, ephemeral: true });
		return;
	}

	const data = await getData(interaction.user.id);
	if (!data) {
		await interaction.reply({ content: `${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể lấy dữ liệu người dùng.`, ephemeral: true });
		return;
	}

	const availableRod = resolveFishRodName(data.fish_inventory || [], data.fish_rod);
	if (!availableRod) {
		await interaction.reply({ content: `${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Bạn chưa có cần câu để chuyển.`, ephemeral: true });
		return;
	}

	const rods = getFishRods(data.fish_inventory || []);
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId(`fish_rod_select:${interaction.user.id}`)
		.setPlaceholder('Chọn cần câu muốn dùng')
		.addOptions(
			rods.slice(0, 25).map((rod, index) => ({
				label: rod.name.slice(0, 100),
				description: `${rod.quantity} độ bền còn lại`,
				value: rod.name,
				default: rod.name === availableRod || (!data.fish_rod && index === 0),
			}))
		);

	const rows = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)];

	await interaction.reply({ ephemeral: true, content: `${formatEmoji('1411196789914206238', 'CatgirlChenHyper', true)} **| Chọn cần câu**`, components: rows });
}