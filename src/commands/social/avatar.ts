import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';

export default {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Hiển thị ảnh đại diện của bạn hoặc người khác.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng mà bạn muốn xem ảnh đại diện.')
                .setRequired(false)
        ),
    aliases: ['av', 'avt', 'pfp'],
    async execute(context: CommandContext, _client: BotClient, args: any[]) {
        const emojis = formatEmojis([
            { id: '1411227532459638875', name: 'chocolaglare', animated: false }
        ]);

        if (!('member' in context) || !context.member) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        let targetUserId: string | undefined;
        if (!('options' in context)) {
            const [rawTarget] = args;
            const mentionId = rawTarget?.match(/^<@!?(\d+)>$/)?.[1];
            const plainId = /^\d{17,20}$/.test(rawTarget ?? '') ? rawTarget : undefined;
            targetUserId = context.mentions.users.first()?.id ?? mentionId ?? plainId;
        } else {
            targetUserId = context.options.getUser('user')?.id;
        }

        const userId = targetUserId ?? context.member.user.id;

        const user = await context.client.users.fetch(userId).catch(() => null);

        if (!user) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể tìm thấy người dùng.`);
            return;
        }

        const avatarUrl = user.displayAvatarURL({ size: 1024, extension: 'png' });
        const botAvatarUrl = context.client.user?.displayAvatarURL({ size: 1024, extension: 'png' });
        const embed = new EmbedBuilder()
            .setAuthor({
                name: `Ảnh đại diện của @${user.username}`,
                iconURL: botAvatarUrl || undefined
            })
            .setImage(avatarUrl)
            .setColor(0xc0ebff)
            .setFooter({ text: `ID: ${userId}` });
        await context.reply({ embeds: [embed] });
    }
};