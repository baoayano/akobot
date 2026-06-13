import type { ButtonInteraction } from 'discord.js';
import type { IWerewolfPlayer } from '../../schemas/werewolf.js';
import { addWerewolfPlayer, buildWerewolfLobbyEmbed } from '../../utils/werewolf.js';

export async function handleWerewolfJoinButton(interaction: ButtonInteraction): Promise<void> {
  const [, channelId] = interaction.customId.split(':');

  if (!channelId || interaction.channelId !== channelId) {
    await interaction.reply({
      content: 'Không thể xác định phòng Ma Sói.',
      ephemeral: true,
    });
    return;
  }

  const result = await addWerewolfPlayer(channelId, interaction.user.id);

  if (result.status === 'closed' || !result.game?.lobbyEndsAt) {
    await interaction.reply({
      content: 'Sảnh chờ đã đóng.',
      ephemeral: true,
    });
    return;
  }

  if (result.status === 'already_joined') {
    await interaction.reply({
      content: 'Bạn đã tham gia phòng Ma Sói này rồi.',
      ephemeral: true,
    });
    return;
  }

  const playerIds = result.game.players.map((player: IWerewolfPlayer) => player.userId);
  const lobby = buildWerewolfLobbyEmbed(channelId, playerIds, result.game.lobbyEndsAt);

  await interaction.update({
    embeds: [lobby.embed],
    components: lobby.components,
  });
}
