import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';
import { userExists, getData } from '../../utils/user.js';
import { formatNumber } from '../../utils/number.js';
import { getConfig, setConfig } from '../../utils/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Gửi một nụ hôn đến người bạn yêu quý nào đó.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người bạn muốn gửi nụ hôn đến.')
                .setRequired(true)
        ),
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
            await context.reply(`${emojis[1]} **| Onii-chan,** tự tặng nụ hôn cho bản thân cũng được đó nha >.<`);
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

        let listKissGifs = await getConfig('kiss_gifs');
        if (!listKissGifs || !Array.isArray(listKissGifs) || listKissGifs.length === 0) {
            const defaultGifs = [
                'https://i.pinimg.com/originals/cf/d2/2d/cfd22dd39db5f07aac1c580debc3626d.gif'
            ];

            await setConfig('kiss_gifs', defaultGifs);

            listKissGifs = defaultGifs;
        }

        const randomGif = listKissGifs[Math.floor(Math.random() * listKissGifs.length)];

        const embed = new EmbedBuilder()
            .setAuthor({
                name: `${sender} đã gửi một nụ hôn đến ${targetName}`,
                iconURL: `https://cdn.discordapp.com/avatars/${context.member?.user.id}/${context.member?.user.avatar}.png`
            })
            .setImage(randomGif)
            .setColor(0xffc0cb)
            .setFooter({ text: 'Gửi một nụ hôn thật ngọt ngào 🥰🥰' });

        await context.reply({ embeds: [embed], content: `<@${targetUser}>` });
    }
};