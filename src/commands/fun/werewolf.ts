import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getOrCreateServer, getServerConfig } from '../../utils/servers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('werewolf')
        .setDescription('Chơi trò chơi Ma Sói (Werewolf).')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('setup hoặc create')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('Chọn khu category để tạo phòng chơi Ma Sói.')
                .setRequired(true)
                .addChannelTypes(4)
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
            if (!botPermissions.has('ManageChannels') || !botPermissions.has('ViewChannel') || !botPermissions.has('ManageThreads')) {
                await context.reply(`${emojis[0]} **| Lỗi:** Bot cần quyền **Quản lý kênh** và **Quản lý thread** để tạo phòng chơi.\nBạn có thể bật ở đây: **Server Settings > Roles > ${context.guild.members.me.roles.highest.name} > Enable "Manage Channels" and "Manage Threads" permissions**.`);
                return;
            }
        }

        let targetCategory: string | undefined;
        let commandType: string | undefined;

        if (!('options' in context)) {
            const [rawType, rawCategory] = args;
            commandType = rawType ?? "setup";
            targetCategory = rawCategory;
        } else {
            const categoryChannel = context.options.getChannel('category');
            if (categoryChannel) {
                targetCategory = categoryChannel.id;
            }

            commandType = context.options.getString('type') ?? "setup";
        }

        if (commandType !== 'setup' && commandType !== 'create') {
            await context.reply(`${emojis[0]} **| Lỗi:** Loại lệnh không hợp lệ. Vui lòng sử dụng "setup" hoặc "create".`);
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

            await context.reply(`${emojis[1]} **| Thành công:** Đã thiết lập category "${categoryName}" cho phòng chơi Ma Sói thành công!`);
        } else if (commandType === 'create') {
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
            // const newChannel = await context.guild?.channels.create({
            //     name: `phòng-ma-soi-${Date.now()}`,
            //     type: 0,
            //     parent: server.werewolf_category
            // });

            // if (newChannel) {
            //     await context.reply(`${emojis[1]} **| Thành công:** Đã tạo phòng chơi Ma Sói thành công! Vui lòng vào kênh <#${newChannel.id}> để bắt đầu chơi.`);
            // } else {
            //     await context.reply(`${emojis[0]} **| Lỗi:** Không thể tạo phòng chơi Ma Sói. Vui lòng thử lại sau.`);
            // }

            // Coming soon...
            await context.reply(`${emojis[1]} **| Thông báo:** Tính năng tạo phòng chơi Ma Sói đang được phát triển và sẽ sớm ra mắt! Hãy kiên nhẫn chờ đợi nhé >.<`);
        }
    }
}