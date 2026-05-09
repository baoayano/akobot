import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Hiển thị danh sách command hiện có.'),
    async execute(context, client) {
        const commands = [...client.commands.values()].map((command) => ({
            name: `/${command.data.name} | ako${command.data.name}`,
            value: command.data.description || 'Không có mô tả.',
        }));
        const embed = new EmbedBuilder()
            .setTitle('Danh sách command')
            .setDescription('Các slash command và prefix command hiện có trong project.')
            .addFields(commands.length > 0 ? commands : [{ name: 'Trống', value: 'Chưa có command nào.' }])
            .setColor(0x2b90d9);
        const payload = { embeds: [embed] };
        if ('isChatInputCommand' in context && context.isChatInputCommand()) {
            payload.ephemeral = true;
        }
        await context.reply(payload);
    },
};
