import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { BotClient, CommandContext } from '../../types.js';
import { formatEmojis } from '../../utils/emoji.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiển thị danh sách lệnh có sẵn.'),
  async execute(context: CommandContext, _client: BotClient) {
    const emojis = formatEmojis([
      { id: '1495645888121667706', name: 'Juvia_shook' },
      { id: '1502589246047780935', name: 'money', animated: true },
      { id: '1411224061991845959', name: 'emojigg_Aww' },
      { id: '1411224000444498023', name: 'Happy', animated: true },
      { id: '1411194437824151573', name: 'marisa_buri_fast', animated: true },
      { id: '1411223948993233002', name: 'scared', animated: true }
    ]);
    const listCommands = [
      {
        title: `${emojis[1]} Lệnh tài chính`,
        commands: [ "cash", "ruby", "give", "daily", "exchange" ]
      },
      {
        title: `${emojis[3]} Lệnh giải trí`,
        commands: [ "coinflip", "fish" ]
      },
      {
        title: `${emojis[4]} Lệnh xã hội`,
        commands: [ "level", "avatar", "wallpaper", "pray" ]
      },
      {
        title: `${emojis[5]} Lệnh hành động`,
        commands: [ "kiss", "pat" ]
      },
      {
        title: `${emojis[2]} Lệnh tiện ích`,
        commands: [ "help", "ping", "prefix" ]
      }
    ]

    const embed = new EmbedBuilder()
      .setTitle("Danh sách lệnh")
      .setThumbnail(context.client.user?.displayAvatarURL() || '')
      .setAuthor({
        name: context.client.user?.username || 'Bot',
        iconURL: `https://cdn.discordapp.com/avatars/${context.member?.user.id}/${context.member?.user.avatar}.png`
      })
      .setDescription('**Prefix gốc:** `ako`\n\nDưới đây là **list các lệnh có sẵn** mà onii-chan có thể dùng >.<\nNếu cần thêm hỗ trợ, hãy liên hệ với discord **[Quán Trà Asako](https://discord.gg/kSTM8B86eA)** nhé!')
      .setColor(0xa382a5)
      .addFields(listCommands.map(group => ({
        name: group.title,
        value: group.commands.map(cmd => `\`${cmd}\``).join(' '),
        inline: false
      })))
      .setFooter({ text: 'Chúc bạn một ngày tốt lành!' });
    await context.reply({ embeds: [embed] });
  }
}