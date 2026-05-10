import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { getConfig, setConfig } from '../../utils/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pat')
        .setDescription('Gửi một cú xoa đầu đến người bạn yêu quý nào đó.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người bạn muốn gửi cú xoa đầu đến.')
                .setRequired(true)
        ),
    aliases: ['headpat', 'pet'],
    async execute(context: CommandContext, _client: BotClient, args: any[]) {
        const emojis = formatEmojis([
            { id: '1411227532459638875', name: 'chocolaglare', animated: false },
            { id: '1411224746670034964', name: 'NekoLaugh', animated: true },
        ]);

        if (!('member' in context) || !context.member) {
            await context.reply(`${emojis[0]} **| Lỗi:** Không thể xác định thành viên.`);
            return;
        }

        let targetUser;
        if (!('options' in context)) {
            const [userId] = args;

            if (!/^(?:<@!?(\d+)>|(\d+))$/.test(userId)) {
                await context.reply(`${emojis[0]} **| Lỗi:** Định dạng người dùng không hợp lệ.`);
                return;
            }

            targetUser = userId.replace(/^(?:<@!?(\d+)>|(\d+))$/, '$1$2');
        } else {
            targetUser = context.options.getUser('user', true).id;
        }

        if (targetUser === context.member.user.id) {
            await context.reply(`${emojis[1]} **| Onii-chan,** tự xoa đầu bản thân cũng được luôn hả >.<`);
            return;
        }

        let sender;
        if (!('displayName' in context.member)) {
            sender = context.member.user.username;
        } else {
            sender = context.member.user.displayName;
        }

        const targetMember = await context.client.users.fetch(targetUser);
        const targetName = targetMember.displayName ?? targetMember.username;

        let listPatGifs = await getConfig('pat_gifs');
        if (!listPatGifs || !Array.isArray(listPatGifs) || listPatGifs.length === 0) {
            const defaultGifs = [
                'https://i.pinimg.com/originals/4c/03/bb/4c03bbe17bc0825e064d049c5f8262f3.gif'
            ];

            await setConfig('pat_gifs', defaultGifs);

            listPatGifs = defaultGifs;
        }

        const randomGif = listPatGifs[Math.floor(Math.random() * listPatGifs.length)];

        const embed = new EmbedBuilder()
            .setAuthor({
                name: `${sender} đã xoa đầu ${targetName} ~ Đáng yêu quá điii`,
                iconURL: `https://cdn.discordapp.com/avatars/${context.member?.user.id}/${context.member?.user.avatar}.png`
            })
            .setImage(randomGif)
            .setColor(0xf7c0ff)
            .setFooter({ text: 'Xoa đầu thật nhẹ nhàng 🤗🤗' });

        await context.reply({ embeds: [embed], content: `<@${targetUser}>` });
    }
};