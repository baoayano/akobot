import { StringSelectMenuInteraction } from 'discord.js';
import { formatEmoji } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import { getFishRods } from '../../utils/fishInventory.js';

export async function handleFishRodSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const [action, userId] = interaction.customId.split(':');

    if (action !== 'fish_rod_select') {
        return;
    }

    if (interaction.user.id !== userId) {
        await interaction.reply({
            content: `${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Bạn không thể chọn cần câu của người khác.`,
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

    const selectedRodName = interaction.values[0];
    const selectedRod = getFishRods(data.fish_inventory || []).find((item) => item.name === selectedRodName && item.quantity > 0);

    if (!selectedRod) {
        await interaction.reply({
            content: `${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Cần câu được chọn không còn hợp lệ trong kho.`,
            ephemeral: true,
        });
        return;
    }

    data.user.fish_rod = selectedRod.name;
    await data.user.save();

    await interaction.update({
        content: `${formatEmoji('1411196789914206238', 'CatgirlChenHyper', true)} **| Đã đổi cần câu!** Onii-chan đang dùng **${selectedRod.name}**.`,
        components: [],
    });
}