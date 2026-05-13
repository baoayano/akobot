import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { CommandContext } from '../types.js';
import { getOrCreateUser } from '../utils/user.js';
import { formatEmojis } from '../utils/emoji.js';

export async function showRegistrationEmbed(context: CommandContext) {
    const emojis = formatEmojis([
        {
            id: '1481264492347129987',
            name: 'amazed'
        },
        {
            id: '1411227233208762368',
            name: 'JudgeStare'
        },
        {
            id: '1502589246047780935',
            name: 'money',
            animated: true
        },
        {
            id: '1481264371530334350',
            name: 'okey_frieren'
        },
        {
            id: '1481266834027184291',
            name: 'neonheh'
        }
    ])

    const embed = new EmbedBuilder()
        .setTitle(`${emojis[0]} Lưu ý trước khi đăng ký tài khoản Rinne`)
        .setDescription('Bot được phát triển với mục đích **giải trí** và **cung cấp các tính năng tiện ích cho người dùng**. Việc đăng ký tài khoản sẽ giúp bạn trải nghiệm đầy đủ các chức năng của bot, đồng thời giúp chúng tôi quản lý và cải thiện dịch vụ tốt hơn.')
        .addFields([
            {
                name: `Lợi ích nhận được ${emojis[1]}`,
                value: `- Được chơi những trò chơi thú vị với phần thưởng phong phú!\n- Có thể rút xu thành tiền tài khoản ngân hàng trong một số dịp đặc biệt ${emojis[2]}\n- Đổi được tài nguyên trong game, đoán xem là game gì nào? ${emojis[3]}`
            },
            {
                name: `Bạn sẽ bắt đầu từ đâu? ${emojis[4]}`,
                value: '- Khi đăng ký, bạn sẽ nhận được khoản xu khởi đầu là **1000 xu** để bắt đầu hành trình của mình với bot.\n- Bạn có thể sử dụng số tiền này để tham gia vào các trò chơi, mua sắm trong bot hoặc tích lũy để đạt được những phần thưởng lớn hơn trong tương lai.',
            },
        ])
        .setColor(0x82a59f)
        .setFooter({ text: 'Vui lòng không sử dụng bot cho mục đích bất hợp pháp, xin cảm ơn!' });

    const button = new ButtonBuilder()
        .setCustomId('register_confirm:' + context.member?.user.id)
        .setLabel("Tiến hành đăng ký thôi nào!")
        .setStyle(ButtonStyle.Success)
        .setEmoji('1481267094296465528')
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const msg = await context.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
    });

    setTimeout(async () => {
        try {
            button.setDisabled(true);
            const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
            await msg.edit({ components: [disabledRow] });
        } catch (error) {
            console.error('Error removing registration buttons:', error);
        }
    }, 10000); // Remove buttons after 10 seconds
}

export async function handleRegistrationConfirm(userId: string) {
    try {
        await getOrCreateUser(userId);
        return true;
    } catch (error) {
        console.error('Registration error:', error);
        return false;
    }
}
