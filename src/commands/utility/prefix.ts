import { SlashCommandBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmoji } from '../../utils/emoji.js';
import { getOrCreateServer, getServerConfig } from '../../utils/servers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Cài đặt prefix cho bot.')
        .addStringOption(option =>
            option.setName('newprefix')
                .setDescription('Prefix mới mà bạn muốn đặt cho bot.')
                .setRequired(true)
        ),
    aliases: ['px'],
    async execute(context: CommandContext, client: BotClient, args: any[]) {
        if (!('member' in context) || !context.member) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        if (typeof context.member.permissions === 'string' || !context.member.permissions.has('Administrator')) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Bạn cần có quyền quản trị viên để sử dụng lệnh này.`);
            return;
        }

        let newPrefix;

        if (!('options' in context)) {
            const [ prefixArg ] = args;
            if (!prefixArg || typeof prefixArg !== 'string') {
                await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Vui lòng cung cấp một prefix hợp lệ.`);
                return;
            }
            newPrefix = prefixArg.trim();
        } else {
            newPrefix = context.options.getString('newprefix', true).trim();
        }

        if (newPrefix.length === 0) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Prefix không được để trống.`);
            return;
        }

        await getOrCreateServer(context.guildId!);

        const serverConfig = await getServerConfig(context.guildId!);
        if (!serverConfig) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Không thể lấy cấu hình server.`);
            return;
        }

        const { server } = serverConfig;
        if (server.prefix === newPrefix) {
            await context.reply(`${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Prefix mới phải khác với prefix hiện tại.`);
            return;
        }
        server.prefix = newPrefix;
        await server.save();

        await context.reply(`${formatEmoji('1411195605333708891', 'ReimuFumo', false)} **| Thành công:** Prefix đã được cập nhật thành \`${newPrefix}\`.`);
    }
};