import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type Client,
  type Message,
  ThreadAutoArchiveDuration,
} from 'discord.js';
import {
  WerewolfGameModel,
  type IWerewolfGame,
  type IWerewolfPlayer,
  type IWerewolfThread,
  type WerewolfRole,
  type WerewolfThreadType,
  type WerewolfWinner,
} from '../schemas/werewolf.js';
import type { CommandContext } from '../types.js';
import { startWerewolfGame } from './werewolfGame.js';

export type CreateWerewolfThreadData = {
  threadId: string;
  type: WerewolfThreadType;
  dayNumber?: number;
};

export type RecordWerewolfActionData = {
  actorId: string;
  action: string;
  targetId?: string | null;
};

export type WerewolfRoleAssignment = {
  userId: string;
  role: WerewolfRole;
};

export type WerewolfGameDemoResult =
  | { status: 'started'; threadId: string; dayNumber: number }
  | { status: 'already_running'; threadId: string; dayNumber: number }
  | {
      status:
        | 'game_not_found'
        | 'guild_mismatch'
        | 'channel_not_found'
        | 'unsupported_channel'
        | 'storage_failed';
    };

const WEREWOLF_DEMO_DISCUSSION_DURATION_MS = 60_000;
const FAILED_WEREWOLF_CHANNEL_DELETE_DELAY_MS = 5_000;
export const MIN_WEREWOLF_PLAYERS = 4;

const WEREWOLF_ROLE_INFO: Record<WerewolfRole, { name: string; description: string; color: number }> = {
  villager: {
    name: 'Dân làng',
    description: 'Tìm ra và loại bỏ toàn bộ Ma Sói để bảo vệ ngôi làng.',
    color: 0x95a5a6,
  },
  werewolf: {
    name: 'Ma Sói',
    description: 'Ẩn danh giữa dân làng và phối hợp loại bỏ phe Dân làng.',
    color: 0xe74c3c,
  },
  seer: {
    name: 'Tiên tri',
    description: 'Mỗi đêm có thể kiểm tra vai trò của một người chơi.',
    color: 0x9b59b6,
  },
  bodyguard: {
    name: 'Bảo vệ',
    description: 'Mỗi đêm có thể bảo vệ một người chơi khỏi cuộc tấn công.',
    color: 0x3498db,
  },
  witch: {
    name: 'Phù thủy',
    description: 'Sở hữu năng lực cứu hoặc loại bỏ người chơi trong đêm.',
    color: 0x2ecc71,
  },
  hunter: {
    name: 'Thợ săn',
    description: 'Khi bị loại, có thể kéo theo một người chơi khác.',
    color: 0xe67e22,
  },
};

function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

export function generateWerewolfRoles(playerIds: string[]): WerewolfRoleAssignment[] {
  const uniquePlayerIds = [...new Set(playerIds)];

  if (uniquePlayerIds.length < MIN_WEREWOLF_PLAYERS) {
    return [];
  }

  const roles: WerewolfRole[] = [];
  const werewolfCount = Math.max(1, Math.floor(uniquePlayerIds.length / 4));

  roles.push(...Array<WerewolfRole>(werewolfCount).fill('werewolf'));

  if (uniquePlayerIds.length >= 4) roles.push('seer');
  if (uniquePlayerIds.length >= 5) roles.push('bodyguard');
  if (uniquePlayerIds.length >= 6) roles.push('witch');
  if (uniquePlayerIds.length >= 7) roles.push('hunter');

  while (roles.length < uniquePlayerIds.length) {
    roles.push('villager');
  }

  const shuffledRoles = shuffleItems(roles.slice(0, uniquePlayerIds.length));
  const shuffledPlayerIds = shuffleItems(uniquePlayerIds);

  return shuffledPlayerIds.map((userId, index) => ({
    userId,
    role: shuffledRoles[index],
  }));
}

export async function assignWerewolfRoles(channelId: string) {
  const game = await getActiveWerewolfGame(channelId);

  if (!game || game.players.length < MIN_WEREWOLF_PLAYERS) {
    return null;
  }

  const assignments = generateWerewolfRoles(
    game.players.map((player: IWerewolfPlayer) => player.userId)
  );
  const roleByUserId = new Map(assignments.map((assignment) => [assignment.userId, assignment.role]));
  const players = game.players.map((player: IWerewolfPlayer) => ({
    userId: player.userId,
    role: roleByUserId.get(player.userId) ?? null,
    isAlive: true,
    roleThreadId: null,
    joinedAt: player.joinedAt,
  }));

  const updatedGame = await WerewolfGameModel.findOneAndUpdate(
    {
      channelId,
      isEnded: false,
      lobbyEndsAt: null,
      'players.role': null,
    },
    { $set: { players } },
    { new: true }
  );

  return updatedGame ? assignments : null;
}

export async function notifyWerewolfPlayerRoles(
  interaction: { client: Client },
  channelId: string,
  assignments: WerewolfRoleAssignment[]
) {
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText) {
    return [];
  }

  const results = [];
  const game = await getActiveWerewolfGame(channelId);

  for (const assignment of assignments) {
    const existingPlayer = game?.players.find((player: IWerewolfPlayer) => player.userId === assignment.userId);
    if (existingPlayer?.roleThreadId) {
      results.push({ userId: assignment.userId, threadId: existingPlayer.roleThreadId, success: true as const });
      continue;
    }
    const roleInfo = WEREWOLF_ROLE_INFO[assignment.role];
    const member = await channel.guild.members.fetch(assignment.userId).catch(() => null);
    const user = member?.user ?? await interaction.client.users.fetch(assignment.userId).catch(() => null);
    const displayName = member?.displayName ?? user?.username ?? 'nguoi-choi';
    const threadName = `vai-tro-${displayName}`.slice(0, 100);

    try {
      const thread = await channel.threads.create({
        name: threadName,
        type: ChannelType.PrivateThread,
        invitable: false,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
        reason: `Private role notification for werewolf player ${assignment.userId}`,
      });

      await thread.members.add(assignment.userId);
      await thread.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Vai trò của bạn: ${roleInfo.name}`)
            .setDescription([
              roleInfo.description,
              '',
              'Không tiết lộ thread hoặc vai trò này cho người chơi khác.',
            ].join('\n'))
            .setColor(roleInfo.color)
            .setFooter({ text: 'Thông báo vai trò riêng tư' })
            .setTimestamp(),
        ],
      });

      results.push({ userId: assignment.userId, threadId: thread.id, success: true as const });
      await WerewolfGameModel.updateOne(
        { channelId, 'players.userId': assignment.userId },
        { $set: { 'players.$.roleThreadId': thread.id } }
      );
    } catch {
      results.push({ userId: assignment.userId, threadId: null, success: false as const });
    }
  }

  return results;
}

export function buildWerewolfLobbyEmbed(channelId: string, playerIds: string[], endsAt: Date) {
  const visiblePlayerIds = playerIds.slice(0, 50);
  const hiddenPlayerCount = playerIds.length - visiblePlayerIds.length;
  const playerList = visiblePlayerIds.length > 0
    ? [
        ...visiblePlayerIds.map((userId, index) => `${index + 1}. <@${userId}>`),
        ...(hiddenPlayerCount > 0 ? [`...và ${hiddenPlayerCount} người chơi khác.`] : []),
      ].join('\n')
    : 'Chưa có người chơi tham gia.';

  const embed = new EmbedBuilder()
    .setTitle('Sảnh chờ Ma Sói')
    .setDescription([
      `Nhấn nút **Tham gia** để vào trò chơi.`,
      `Sảnh chờ sẽ đóng <t:${Math.floor(endsAt.getTime() / 1000)}:R>.`,
      `Cần tối thiểu **${MIN_WEREWOLF_PLAYERS} người chơi** để bắt đầu.`,
      '',
      `**Người chơi (${playerIds.length})**`,
      playerList,
    ].join('\n'))
    .setColor(0x9b59b6)
    .setTimestamp();

  const joinButton = new ButtonBuilder()
    .setCustomId(`werewolf_join:${channelId}`)
    .setLabel(`Tham gia (${playerIds.length})`)
    .setStyle(ButtonStyle.Success);

  return {
    embed,
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton)],
  };
}

export async function addWerewolfPlayer(channelId: string, userId: string) {
  const game = await WerewolfGameModel.findOneAndUpdate(
    {
      channelId,
      isEnded: false,
      lobbyEndsAt: { $gt: new Date() },
      'players.userId': { $ne: userId },
    },
    {
      $push: {
        players: {
          userId,
          role: null,
          isAlive: true,
          roleThreadId: null,
          joinedAt: new Date(),
        },
      },
    },
    { new: true }
  );

  if (game) {
    return { status: 'joined' as const, game };
  }

  const currentGame = await getActiveWerewolfGame(channelId);
  if (!currentGame || !currentGame.lobbyEndsAt || currentGame.lobbyEndsAt.getTime() <= Date.now()) {
    return { status: 'closed' as const, game: currentGame };
  }

  return { status: 'already_joined' as const, game: currentGame };
}

export async function startWerewolfJoinLobby(
  interaction: CommandContext,
  channelId: string,
  durationSeconds = 30
): Promise<Message<boolean> | null> {
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    return null;
  }

  const safeDuration = Math.min(Math.max(Math.floor(durationSeconds), 10), 300);
  const endsAt = new Date(Date.now() + safeDuration * 1000);
  const game = await WerewolfGameModel.findOneAndUpdate(
    { channelId, isEnded: false },
    { $set: { lobbyEndsAt: endsAt, players: [], phase: 'lobby', phaseEndsAt: endsAt } },
    { new: true }
  );

  if (!game) {
    return null;
  }

  const lobby = buildWerewolfLobbyEmbed(channelId, [], endsAt);
  const message = await channel.send({ embeds: [lobby.embed], components: lobby.components });
  await WerewolfGameModel.updateOne({ channelId }, { $set: { lobbyMessageId: message.id } });

  setTimeout(() => void finalizeWerewolfLobby(interaction.client, channelId, endsAt), safeDuration * 1000);

  return message;
}

export async function finalizeWerewolfLobby(client: Client, channelId: string, endsAt: Date) {
    const closedGame = await WerewolfGameModel.findOneAndUpdate(
      { channelId, isEnded: false, lobbyEndsAt: endsAt },
      { $set: { lobbyEndsAt: null, phaseEndsAt: null } },
      { new: true }
    ).catch(() => null);

    if (!closedGame) {
      return;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    const playerIds = closedGame.players.map((player: IWerewolfPlayer) => player.userId);
    const closedLobby = buildWerewolfLobbyEmbed(channelId, playerIds, endsAt);
    const disabledComponents = closedLobby.components.map((row) =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        row.components.map((button) => ButtonBuilder.from(button).setDisabled(true))
      )
    );

    closedLobby.embed
      .setTitle('Sảnh chờ Ma Sói đã đóng')
      .setFooter({ text: `${playerIds.length} người chơi đã tham gia` });

    const message = closedGame.lobbyMessageId
      ? await channel.messages.fetch(closedGame.lobbyMessageId).catch(() => null)
      : null;
    await message?.edit({ embeds: [closedLobby.embed], components: disabledComponents }).catch(() => null);
    await WerewolfGameModel.updateOne({ channelId }, { $set: { lobbyMessageId: null } });

    if (playerIds.length === 0) {
      await channel.send(
        'Không có người chơi tham gia. Phòng Ma Sói sẽ bị xóa sau **5 giây**.'
      ).catch(() => null);
      await WerewolfGameModel.deleteOne({ channelId }).catch(() => null);

      setTimeout(async () => {
        await channel.delete('Empty werewolf lobby').catch(() => null);
      }, FAILED_WEREWOLF_CHANNEL_DELETE_DELAY_MS);
      return;
    }

    if (playerIds.length < MIN_WEREWOLF_PLAYERS) {
      await channel.send(
        `Không thể bắt đầu game vì chỉ có **${playerIds.length}/${MIN_WEREWOLF_PLAYERS} người chơi** tham gia. Phòng sẽ bị xóa sau **5 giây**.`
      ).catch(() => null);
      await WerewolfGameModel.updateOne(
        { channelId, isEnded: false },
        { $set: { isEnded: true, winner: 'draw' } }
      ).catch(() => null);
      setTimeout(async () => {
        await channel.delete('Not enough werewolf players').catch(() => null);
        await WerewolfGameModel.deleteOne({ channelId }).catch(() => null);
      }, FAILED_WEREWOLF_CHANNEL_DELETE_DELAY_MS);
      return;
    }

    const assignments = await assignWerewolfRoles(channelId);
    if (!assignments) {
      await channel.send('Không thể phân vai cho người chơi. Game đã bị hủy.').catch(() => null);
      return;
    }

    const roleNotifications = await notifyWerewolfPlayerRoles({ client }, channelId, assignments);
    const failedNotifications = roleNotifications.filter((result) => !result.success);

    if (failedNotifications.length > 0) {
      await channel.send(
        `Không thể gửi vai trò riêng cho **${failedNotifications.length} người chơi**. Game đã bị hủy.`
      ).catch(() => null);
      await WerewolfGameModel.updateOne(
        { channelId, isEnded: false },
        { $set: { isEnded: true, winner: 'draw' } }
      ).catch(() => null);
      return;
    }

    await startWerewolfGame(client, channelId).catch(() => null);
}

export async function resumeWerewolfLobbies(client: Client) {
  const games = await WerewolfGameModel.find({ isEnded: false, phase: 'lobby' });
  for (const game of games) {
    if (game.lobbyEndsAt) {
      const endsAt = game.lobbyEndsAt;
      const delay = Math.max(endsAt.getTime() - Date.now(), 0);
      setTimeout(() => void finalizeWerewolfLobby(client, game.channelId, endsAt), delay);
      continue;
    }

    if (game.players.length < MIN_WEREWOLF_PLAYERS) {
      const channel = await client.channels.fetch(game.channelId).catch(() => null);
      if (channel?.type === ChannelType.GuildText) {
        await channel.send('Không đủ người chơi. Phòng sẽ bị xóa sau **5 giây**.').catch(() => null);
        setTimeout(async () => {
          await channel.delete('Not enough werewolf players after restart').catch(() => null);
          await WerewolfGameModel.deleteOne({ _id: game._id }).catch(() => null);
        }, FAILED_WEREWOLF_CHANNEL_DELETE_DELAY_MS);
      } else {
        await WerewolfGameModel.deleteOne({ _id: game._id }).catch(() => null);
      }
      continue;
    }

    const assignments = game.players.every((player: IWerewolfPlayer) => player.role)
      ? game.players.map((player: IWerewolfPlayer) => ({ userId: player.userId, role: player.role! }))
      : await assignWerewolfRoles(game.channelId);
    if (!assignments) continue;
    await notifyWerewolfPlayerRoles({ client }, game.channelId, assignments);
    await startWerewolfGame(client, game.channelId);
  }
}

export async function getWerewolfGameOrNull(channelId: string) {
  try {
    return await WerewolfGameModel.findOne({ channelId });
  } catch {
    return null;
  }
}

export async function getActiveWerewolfGame(channelId: string) {
  try {
    return await WerewolfGameModel.findOne({ channelId, isEnded: false });
  } catch {
    return null;
  }
}

export async function getActiveWerewolfGamesByGuild(guildId: string) {
  try {
    return await WerewolfGameModel.find({ guildId, isEnded: false });
  } catch {
    return [];
  }
}

export async function createWerewolfGame(guildId: string, channelId: string, creatorId: string) {
  return WerewolfGameModel.create({ guildId, channelId, creatorId });
}

export async function getOrCreateWerewolfGame(guildId: string, channelId: string, creatorId: string) {
  return WerewolfGameModel.findOneAndUpdate(
    { channelId },
    { $setOnInsert: { guildId, channelId, creatorId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export async function werewolfGameExists(channelId: string): Promise<boolean> {
  return (await WerewolfGameModel.exists({ channelId })) !== null;
}

export async function getWerewolfThread(
  channelId: string,
  threadId: string
): Promise<IWerewolfThread | null> {
  const game = await getWerewolfGameOrNull(channelId);
  return game?.threads.find((thread: IWerewolfThread) => thread.threadId === threadId) ?? null;
}

export async function addWerewolfThread(channelId: string, data: CreateWerewolfThreadData) {
  const thread: IWerewolfThread = {
    threadId: data.threadId,
    type: data.type,
    dayNumber: data.dayNumber ?? 1,
    votes: [],
    actions: [],
    isClosed: false,
    createdAt: new Date(),
  };

  return WerewolfGameModel.findOneAndUpdate(
    {
      channelId,
      isEnded: false,
      'threads.threadId': { $ne: data.threadId },
    },
    { $push: { threads: thread } },
    { new: true }
  );
}

export async function closeWerewolfThread(channelId: string, threadId: string) {
  return WerewolfGameModel.findOneAndUpdate(
    {
      channelId,
      'threads.threadId': threadId,
    },
    { $set: { 'threads.$[thread].isClosed': true } },
    {
      new: true,
      arrayFilters: [{ 'thread.threadId': threadId }],
    }
  );
}

export async function castWerewolfVote(
  channelId: string,
  threadId: string,
  voterId: string,
  targetId: string
) {
  const createdAt = new Date();
  const updatedVote = await WerewolfGameModel.findOneAndUpdate(
    {
      channelId,
      isEnded: false,
      threads: {
        $elemMatch: {
          threadId,
          isClosed: false,
          'votes.voterId': voterId,
        },
      },
    },
    {
      $set: {
        'threads.$[thread].votes.$[vote].targetId': targetId,
        'threads.$[thread].votes.$[vote].createdAt': createdAt,
      },
    },
    {
      new: true,
      arrayFilters: [
        { 'thread.threadId': threadId, 'thread.isClosed': false },
        { 'vote.voterId': voterId },
      ],
    }
  );

  if (updatedVote) {
    return updatedVote;
  }

  return WerewolfGameModel.findOneAndUpdate(
    {
      channelId,
      isEnded: false,
      threads: {
        $elemMatch: {
          threadId,
          isClosed: false,
          'votes.voterId': { $ne: voterId },
        },
      },
    },
    {
      $push: {
        'threads.$[thread].votes': {
          voterId,
          targetId,
          createdAt,
        },
      },
    },
    {
      new: true,
      arrayFilters: [{ 'thread.threadId': threadId, 'thread.isClosed': false }],
    }
  );
}

export async function recordWerewolfAction(
  channelId: string,
  threadId: string,
  data: RecordWerewolfActionData
) {
  return WerewolfGameModel.findOneAndUpdate(
    {
      channelId,
      isEnded: false,
      threads: {
        $elemMatch: {
          threadId,
          isClosed: false,
        },
      },
    },
    {
      $push: {
        'threads.$[thread].actions': {
          actorId: data.actorId,
          action: data.action,
          targetId: data.targetId ?? null,
          createdAt: new Date(),
        },
      },
    },
    {
      new: true,
      arrayFilters: [{ 'thread.threadId': threadId, 'thread.isClosed': false }],
    }
  );
}

export async function endWerewolfGame(channelId: string, winner: WerewolfWinner) {
  return WerewolfGameModel.findOneAndUpdate(
    { channelId, isEnded: false },
    {
      $set: {
        isEnded: true,
        winner,
        phase: 'ended',
        phaseEndsAt: null,
        'threads.$[thread].isClosed': true,
      },
    },
    {
      new: true,
      arrayFilters: [{ 'thread.isClosed': false }],
    }
  );
}

export async function deleteWerewolfGame(channelId: string): Promise<boolean> {
  const result = await WerewolfGameModel.deleteOne({ channelId });
  return result.deletedCount > 0;
}

export async function updateWerewolfGame(
  channelId: string,
  data: Partial<Pick<IWerewolfGame, 'guildId' | 'winner' | 'isEnded'>>
) {
  return WerewolfGameModel.findOneAndUpdate({ channelId }, { $set: data }, { new: true });
}

/**
 * Demo game conductor. Starts a timed daytime discussion thread and stores it
 * in the game document. Player roles and phase resolution will be added later.
 */
export async function runWerewolfGameDemo(
  interaction: CommandContext,
  channelId: string
): Promise<WerewolfGameDemoResult> {
  const game = await getActiveWerewolfGame(channelId);

  if (!game) {
    return { status: 'game_not_found' };
  }

  if (!interaction.guildId || interaction.guildId !== game.guildId) {
    return { status: 'guild_mismatch' };
  }

  const openDiscussion = game.threads.find(
    (thread: IWerewolfThread) => thread.type === 'day_discussion' && !thread.isClosed
  );

  if (openDiscussion) {
    return {
      status: 'already_running',
      threadId: openDiscussion.threadId,
      dayNumber: openDiscussion.dayNumber,
    };
  }

  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);

  if (!channel) {
    return { status: 'channel_not_found' };
  }

  if (channel.type !== ChannelType.GuildText) {
    return { status: 'unsupported_channel' };
  }

  const previousDiscussionDays = game.threads
    .filter((thread: IWerewolfThread) => thread.type === 'day_discussion')
    .map((thread: IWerewolfThread) => thread.dayNumber);
  const dayNumber = previousDiscussionDays.length > 0
    ? Math.max(...previousDiscussionDays) + 1
    : 1;
  const endsAt = new Date(Date.now() + WEREWOLF_DEMO_DISCUSSION_DURATION_MS);
  const announcement = await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Ma Sói demo - Ngày ${dayNumber}`)
        .setDescription([
          'Giai đoạn thảo luận ban ngày đã bắt đầu.',
          `Thread sẽ tự đóng <t:${Math.floor(endsAt.getTime() / 1000)}:R>.`,
          '',
          'Bản demo chưa xử lý người chơi, vai trò và kết quả biểu quyết.',
        ].join('\n'))
        .setColor(0xf4d35e)
        .setTimestamp(),
    ],
  });

  const thread = await announcement.startThread({
    name: `ma-soi-ngay-${dayNumber}`,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
    reason: `Werewolf demo day ${dayNumber}`,
  });

  const updatedGame = await addWerewolfThread(channelId, {
    threadId: thread.id,
    type: 'day_discussion',
    dayNumber,
  });

  if (!updatedGame) {
    await thread.delete('Could not store werewolf demo thread').catch(() => undefined);
    return { status: 'storage_failed' };
  }

  await thread.send('Hãy thảo luận và thử dùng các helper vote/action trong thread này.');

  setTimeout(async () => {
    await closeWerewolfThread(channelId, thread.id).catch(() => null);
    await thread.send('Giai đoạn thảo luận demo đã kết thúc.').catch(() => null);
    await thread.setLocked(true, 'Werewolf demo discussion ended').catch(() => null);
    await thread.setArchived(true, 'Werewolf demo discussion ended').catch(() => null);
  }, WEREWOLF_DEMO_DISCUSSION_DURATION_MS);

  return { status: 'started', threadId: thread.id, dayNumber };
}

export default {
  getWerewolfGameOrNull,
  getActiveWerewolfGame,
  getActiveWerewolfGamesByGuild,
  createWerewolfGame,
  getOrCreateWerewolfGame,
  werewolfGameExists,
  generateWerewolfRoles,
  assignWerewolfRoles,
  notifyWerewolfPlayerRoles,
  buildWerewolfLobbyEmbed,
  addWerewolfPlayer,
  startWerewolfJoinLobby,
  finalizeWerewolfLobby,
  resumeWerewolfLobbies,
  getWerewolfThread,
  addWerewolfThread,
  closeWerewolfThread,
  castWerewolfVote,
  recordWerewolfAction,
  endWerewolfGame,
  deleteWerewolfGame,
  updateWerewolfGame,
  runWerewolfGameDemo,
};
