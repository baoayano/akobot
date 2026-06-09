import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { createEmbed, errorEmbed, replyEmbed } from '../../utils/embed.js';
import { formatNumber } from '../../utils/number.js';
import {
    getLeaderboard,
    type LeaderboardEntry,
    type LeaderboardType,
} from '../../utils/user.js';
import { formatEmojis } from '../../utils/emoji.js';

const emojis = formatEmojis([
    { id: '1411196248337420430', name: 'AliceFumo', animated: false },
]);

const LEADERBOARD_LIMIT = 10;

const leaderboardConfig: Record<LeaderboardType, {
    title: string;
    description: string;
    color: number;
}> = {
    level: {
        title: `Bảng xếp hạng cấp độ ${emojis[0]}`,
        description: 'Những người chơi có cấp độ cao nhất.',
        color: 0xc0ebff,
    },
    cash: {
        title: `Bảng xếp hạng tài sản ${emojis[0]}`,
        description: 'Những người chơi sở hữu nhiều xu nhất.',
        color: 0xffd166,
    },
};

function isLeaderboardType(value: string | undefined): value is LeaderboardType {
    return value === 'level' || value === 'cash';
}

function formatRank(index: number): string {
    return ['🥇', '🥈', '🥉'][index] ?? `**#${index + 1}**`;
}

function formatEntry(entry: LeaderboardEntry, index: number, type: LeaderboardType): string {
    const details = type === 'level'
        ? `Cấp độ **${formatNumber(entry.level)}** • **${formatNumber(entry.exp)} EXP**`
        : `**${formatNumber(entry.cash)} xu** • Cấp độ **${formatNumber(entry.level)}**`;

    return `${formatRank(index)} <@${entry.id}>\n${details}`;
}

export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Hiển thị bảng xếp hạng người chơi.')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Loại bảng xếp hạng muốn xem.')
                .setRequired(true)
                .addChoices(
                    { name: 'Cấp độ', value: 'level' },
                    { name: 'Xu', value: 'cash' }
                )
        ),
    aliases: ['lb', 'top'],
    async execute(context: CommandContext, _client: BotClient, args: string[] = []) {
        const rawType = 'options' in context
            ? context.options.getString('type') ?? undefined
            : args[0]?.toLowerCase();

        if (!isLeaderboardType(rawType)) {
            await replyEmbed(
                context,
                errorEmbed(
                    'Vui lòng chọn một loại bảng xếp hạng hợp lệ: `level` hoặc `cash`.',
                    'Loại bảng xếp hạng không hợp lệ'
                )
            );
            return;
        }

        const entries = await getLeaderboard(rawType, LEADERBOARD_LIMIT);

        if (entries.length === 0) {
            await replyEmbed(
                context,
                errorEmbed('Chưa có dữ liệu người chơi để xếp hạng.', 'Bảng xếp hạng đang trống')
            );
            return;
        }

        const config = leaderboardConfig[rawType];
        const embed = createEmbed({
            title: config.title,
            description: [
                config.description,
                '',
                entries.map((entry, index) => formatEntry(entry, index, rawType)).join('\n\n'),
            ].join('\n'),
            color: config.color,
            thumbnail: context.client.user?.displayAvatarURL() || undefined,
            footer: `Top ${entries.length} người chơi • Xếp hạng toàn bot`,
            timestamp: true,
        });

        await replyEmbed(context, embed);
    },
};
