import { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getShopItems, type ShopItem } from '../../utils/shop.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Mua các vật phẩm hữu ích để hỗ trợ hành trình của bạn trong thế giới của Rinne!'),
    async execute(context: CommandContext, _client: BotClient) {
        const emojis = formatEmojis([
            { id: '1411227532459638875', name: 'chocolaglare', animated: false },
        ]);
        if (!('member' in context) || !context.member) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        const shopItems = await getShopItems();
        const embed = new EmbedBuilder()
            .setAuthor({
                name: context.client.user?.username || 'Bot',
                iconURL: `https://cdn.discordapp.com/avatars/${context.member.user.id}/${context.member.user.avatar}.png`
            })
            .setDescription('Dưới đây là các **vật phẩm** mà onii-chan có thể mua nè >.<')
            .addFields(
                shopItems.map((item, index) => ({
                    name: `${index + 1}. ${item.label}`,
                    value: item.quantityMode === 'durability'
                        ? `**Giá:** ${item.price.toLocaleString('en-US')} ${item.isRuby ? 'Ruby' : 'Xu'} - **Độ bền:** ${item.durabilityPerUnit ?? 1}`
                        : `**Giá:** ${item.price.toLocaleString('en-US')} ${item.isRuby ? 'Ruby' : 'Xu'} - **Số lượng:** 1`,
                }))
            )
            .setThumbnail(context.client.user?.displayAvatarURL() || '')
            .setColor(0xfa8ec4)
            .setFooter({ text: 'Sẽ có thêm nhiều vật phẩm mới trong tương lai, hãy thường xuyên ghé thăm cửa hàng nhé!' });

        const select = new StringSelectMenuBuilder()
            .setCustomId(`buy_select:${context.member.user.id}`)
            .setPlaceholder('Chọn vật phẩm muốn mua')
            .addOptions(
                shopItems.map((item: ShopItem) => ({
                    label: item.label,
                    description: item.description,
                    value: item.id,
                }))
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        await context.reply({ embeds: [embed], components: [row] });
    }
};