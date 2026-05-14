import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getData } from '../../utils/user.js';
import {
	buildFishInventoryPage,
	getSortedFishInventoryItems,
	resolveFishRodName,
	scheduleFishInventoryButtonDisable,
} from '../../utils/fishInventory.js';

export default {
	data: new SlashCommandBuilder()
		.setName('fish_inventory')
		.setDescription('Hiển thị toàn bộ vật phẩm trong kho cá của bạn.'),
    aliases: ['fishinv', 'fishinginventory', 'kho_ca', 'finv'],
	async execute(context: CommandContext, _client: BotClient) {
		const emojis = formatEmojis([
			{ id: '1411227532459638875', name: 'chocolaglare', animated: false },
		]);

		if (!('member' in context) || !context.member) {
			await context.reply(`${emojis[0]} **| Lỗi:** Không thể xác định thành viên.`);
			return;
		}

		const data = await getData(context.member.user.id);

		if (!data) {
			await context.reply(`${emojis[0]} **| Lỗi:** Không thể lấy dữ liệu người dùng.`);
			return;
		}

		const sortedItems = await getSortedFishInventoryItems(data.fish_inventory || []);
		const resolvedFishRod = resolveFishRodName(data.fish_inventory || [], data.fish_rod);

		if (resolvedFishRod !== data.fish_rod) {
			data.user.fish_rod = resolvedFishRod || '';
			await data.user.save();
		}

		const page = await buildFishInventoryPage(
			sortedItems,
			1,
			context.member.user.id,
			context.member.user.username,
			resolvedFishRod,
			undefined,
			context.client.user?.displayAvatarURL() || undefined
		);

		const replyResponse = await context.reply({ embeds: [page.embed], components: page.components, withResponse: true });
		const message = 'resource' in replyResponse ? replyResponse.resource?.message : replyResponse;

		if (message) {
			scheduleFishInventoryButtonDisable(message, page.components);
		}
	},
};