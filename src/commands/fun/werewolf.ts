import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getOrCreateServer, getServerConfig } from '../../utils/servers.js';
import {
    createWerewolfGame,
    finalizeWerewolfLobby,
    getActiveWerewolfGame,
    MIN_WEREWOLF_PLAYERS,
    startWerewolfJoinLobby,
} from '../../utils/werewolf.js';

export default {
    data: new SlashCommandBuilder()
        .setName('werewolf')
        .setDescription('Chơi trò chơi Ma Sói (Werewolf).')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('setup, create hoặc start')
                .setRequired(true)
                .addChoices(
                    { name: 'Setup', value: 'setup' },
                    { name: 'Create', value: 'create' },
                    { name: 'Start', value: 'start' }
                )
        )
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('Chọn khu category để tạo phòng chơi Ma Sói.')
                .setRequired(false)
                .addChannelTypes(4)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Thời gian mở sảnh chờ, từ 10 đến 300 giây.')
                .setRequired(false)
                .setMinValue(10)
                .setMaxValue(300)
        ),
    aliases: ['ww', 'ma_soi', 'wolf'],
    async execute(context: CommandContext, _client: BotClient, args: any[]) {
        const emojis = formatEmojis([
            { id: '1411227532459638875', name: 'chocolaglare', animated: false },
            { id: '1411196853147668583', name: 'CirnoSlain', animated: false },
        ]);

        if (!('member' in context) || !context.member) {
            await context.reply('Lỗi: Không thể xác định thành viên.');
            return;
        }

        // check bot permission for channel create
        if (context.guild && context.guild.members.me) {
            const botPermissions = context.guild.members.me.permissions;
            if (!botPermissions.has('ManageChannels') || !botPermissions.has('ManageRoles') || !botPermissions.has('ViewChannel') || !botPermissions.has('ManageThreads') || !botPermissions.has('CreatePrivateThreads') || !botPermissions.has('SendMessagesInThreads')) {
                await context.reply(`${emojis[0]} **| Lỗi:** Bot cần quyền **Quản lý kênh**, **Quản lý vai trò**, **Quản lý thread**, **Tạo private thread** và **Gửi tin nhắn trong thread** để tạo phòng chơi.`);
                return;
            }
        }

        let targetCategory: string | undefined;
        let commandType: string | undefined;
        let joinDuration: number | undefined;

        if (!('options' in context)) {
            const [rawType, rawValue] = args;
            commandType = rawType ?? "setup";
            if (commandType === 'setup') {
                targetCategory = rawValue;
            } else if (commandType === 'create') {
                joinDuration = rawValue ? Number.parseInt(rawValue, 10) : undefined;
            }
        } else {
            const categoryChannel = context.options.getChannel('category');
            if (categoryChannel) {
                targetCategory = categoryChannel.id;
            }

            commandType = context.options.getString('type') ?? "setup";
            joinDuration = context.options.getInteger('duration') ?? undefined;
        }

        if (commandType !== 'setup' && commandType !== 'create' && commandType !== 'start') {
            await context.reply(`${emojis[0]} **| Lỗi:** Loại lệnh không hợp lệ. Vui lòng sử dụng "setup", "create" hoặc "start".`);
            return;
        }

        if (commandType !== 'setup' && targetCategory) {
            await context.reply(`${emojis[0]} **| Lỗi:** Arg \`category\` chỉ dành cho type \`setup\`.`);
            return;
        }

        if (commandType !== 'create' && joinDuration !== undefined) {
            await context.reply(`${emojis[0]} **| Lỗi:** Arg \`duration\` chỉ dành cho type \`create\`.`);
            return;
        }

        if (commandType === 'setup') {
            if (typeof context.member.permissions === 'string' || !context.member.permissions.has('Administrator')) {
                await context.reply(`${emojis[0]} **| Lỗi:** Bạn cần có quyền quản trị viên để sử dụng lệnh này.`);
                return;
            }

            if (!targetCategory) {
                await context.reply(`${emojis[0]} **| Lỗi:** Không thể tìm thấy category.`);
                return;
            }

            // search category channel by id
            const category = context.guild?.channels.cache.get(targetCategory);

            if (!category || category.type !== 4) {
                await context.reply(`${emojis[0]} **| Lỗi:** Không thể tìm thấy category hợp lệ.`);
                return;
            }

            // get server config
            await getOrCreateServer(context.guildId!);
            const serverConfig = await getServerConfig(context.guildId!);
            if (!serverConfig) {
                await context.reply(`${emojis[0]} **| Lỗi:** Không thể lấy cấu hình server.`);
                return;
            }

            const { server } = serverConfig;
            server.werewolf_category = category.id;
            await server.save();

            // get category name for success message
            const categoryName = category.name;

            await context.reply(`${emojis[1]} **| Thành công:** Đã thiết lập category "${categoryName}" cho phòng chơi Ma Sói.`);
        } else if (commandType === 'create') {
            if (context.guildId !== "1280813844540817419") {
                await context.reply(`${emojis[0]} **| Lỗi:** Lệnh này hiện chỉ có thể sử dụng trong server chính thức của Rinne.`);
                return;
            }
            
            // check if command is using in channel under werewolf category
            const serverConfig = await getServerConfig(context.guildId!);
            if (!serverConfig) {
                await context.reply(`${emojis[0]} **| Lỗi:** Không thể lấy cấu hình server.`);
                return;
            }

            const { server } = serverConfig;
            if (!server.werewolf_category) {
                await context.reply(`${emojis[0]} **| Lỗi:** Server chưa thiết lập category cho phòng chơi Ma Sói. Vui lòng liên hệ quản trị viên để thiết lập trước khi tạo phòng chơi.`);
                return;
            }

            if (joinDuration !== undefined && (!Number.isInteger(joinDuration) || joinDuration < 10 || joinDuration > 300)) {
                await context.reply(`${emojis[0]} **| Lỗi:** Thời gian mở sảnh chờ phải từ **10 đến 300 giây**.`);
                return;
            }

            const channel = context.channel;

            if (channel && ('parentId' in channel)) {
                const parentId = channel.parentId;
                if (parentId !== server.werewolf_category) {
                    await context.reply(`${emojis[0]} **| Lỗi:** Lệnh này chỉ có thể sử dụng trong các kênh thuộc category đã được thiết lập cho phòng chơi Ma Sói.`);
                    return;
                }
            } else {
                await context.reply(`${emojis[0]} **| Lỗi:** Không thể xác định kênh hiện tại.`);
                return;
            }

            // TODO: create werewolf game room

            const channelNumbers = context.guild?.channels.cache.filter(ch => (ch.parentId === server.werewolf_category && ch.name.startsWith('room-'))).size ?? 0;
            const roomName = `room-${channelNumbers + 1}`;

            const newChannel = await context.guild?.channels.create({
                name: roomName,
                type: 0,
                parent: server.werewolf_category,
                permissionOverwrites: [
                    {
                        id: context.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.SendMessages],
                        allow: [PermissionFlagsBits.SendMessagesInThreads],
                    },
                    ...(context.guild.members.me
                        ? [{
                            id: context.guild.members.me.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.SendMessagesInThreads,
                            ],
                        }]
                        : []),
                ],
            });

            if (newChannel) {
                await createWerewolfGame(context.guildId!, newChannel.id, context.member.user.id);
                await startWerewolfJoinLobby(context, newChannel.id, joinDuration ?? 30);
                await context.reply(`${emojis[1]} **| Thành công:** Đã tạo phòng chơi Ma Sói thành công! Vui lòng vào kênh <#${newChannel.id}> để bắt đầu chơi.`);
            } else {
                await context.reply(`${emojis[0]} **| Lỗi:** Không thể tạo phòng chơi Ma Sói. Vui lòng thử lại sau.`);
            }
        } else if (commandType === 'start') {
            const game = await getActiveWerewolfGame(context.channelId);

            if (!game || game.phase !== 'lobby' || !game.lobbyEndsAt) {
                await context.reply(`${emojis[0]} **| Lỗi:** Channel hiện tại không có sảnh chờ Ma Sói đang hoạt động.`);
                return;
            }

            if (game.creatorId !== context.member.user.id) {
                await context.reply(`${emojis[0]} **| Lỗi:** Chỉ người tạo phòng mới có thể bắt đầu game ngay.`);
                return;
            }

            const hasEnoughPlayers = game.players.length >= MIN_WEREWOLF_PLAYERS;
            await finalizeWerewolfLobby(context.client, game.channelId, game.lobbyEndsAt);
            await context.reply(
                hasEnoughPlayers
                    ? `${emojis[1]} **| Thành công:** Đã đóng sảnh chờ và bắt đầu game.`
                    : `${emojis[0]} **| Không đủ người chơi:** Phòng sẽ tự xóa sau **5 giây**.`
            );
        }
    }
}
