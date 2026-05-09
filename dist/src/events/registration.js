import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getOrCreateUser } from '../utils/user.js';
export async function showRegistrationEmbed(context) {
    const embed = new EmbedBuilder()
        .setTitle('🎉 Chào mừng bạn!')
        .setDescription('Bạn chưa được đăng ký hệ thống. Vui lòng bấm nút bên dưới để hoàn tất đăng ký.')
        .addFields([
        { name: '📊 Điều gì bạn nhận được?', value: '✅ Tài khoản riêng\n✅ Wallet Akocoin\n✅ Level & Rank' },
        {
            name: '⚙️ Thông tin ban đầu',
            value: '• Cash: 0 Akocoin\n• Ruby: 0\n• Level: 1\n• Rank: Bronze',
        },
    ])
        .setColor(0x2b90d9)
        .setFooter({ text: 'Đăng ký là sự đồng ý với điều khoản sử dụng' });
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId('register_confirm')
        .setLabel('✅ Đồng ý đăng ký')
        .setStyle(ButtonStyle.Primary), new ButtonBuilder()
        .setCustomId('register_decline')
        .setLabel('❌ Từ chối')
        .setStyle(ButtonStyle.Secondary));
    await context.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
    });
}
export async function handleRegistrationConfirm(userId) {
    try {
        await getOrCreateUser(userId);
        return true;
    }
    catch (error) {
        console.error('Registration error:', error);
        return false;
    }
}
