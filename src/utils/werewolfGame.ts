import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ThreadAutoArchiveDuration,
  type ButtonInteraction,
  type Client,
  type Message,
  type TextChannel,
} from 'discord.js';
import {
  WerewolfGameModel,
  type IWerewolfGame,
  type IWerewolfPlayer,
  type IWerewolfThreadAction,
  type IWerewolfThread,
  type WerewolfRole,
  type WerewolfWinner,
} from '../schemas/werewolf.js';

const DAY_DISCUSSION_DURATION_MS = 60_000;
const DAY_VOTE_DURATION_MS = 30_000;
const NIGHT_DURATION_MS = 30_000;
const HUNTER_DURATION_MS = 30_000;
const WINNER_CHANNEL_DELETE_DELAY_MS = 10_000;
const phaseTimers = new Map<string, NodeJS.Timeout>();

function alivePlayers(game: IWerewolfGame) {
  return game.players.filter((player: IWerewolfPlayer) => player.isAlive);
}

function roleName(role: WerewolfRole | null) {
  return {
    villager: 'Dân làng',
    werewolf: 'Ma Sói',
    seer: 'Tiên tri',
    bodyguard: 'Bảo vệ',
    witch: 'Phù thủy',
    hunter: 'Thợ săn',
  }[role ?? 'villager'];
}

async function getTextChannel(client: Client, channelId: string): Promise<TextChannel | null> {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  return channel?.type === ChannelType.GuildText ? channel : null;
}

async function getPlayerDisplayName(client: Client, channelId: string, userId: string) {
  const channel = await getTextChannel(client, channelId);
  const member = await channel?.guild.members.fetch(userId).catch(() => null);
  const user = member?.user ?? await client.users.fetch(userId).catch(() => null);
  return member?.displayName ?? user?.username ?? userId;
}

function discordRelativeTime(endsAt: Date) {
  return `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`;
}

async function deleteWerewolfThread(client: Client, threadId: string, reason: string) {
  const thread = await client.channels.fetch(threadId).catch(() => null);
  if (!thread?.isThread()) return;
  await thread.delete(reason).catch(() => null);
}

async function deleteWerewolfThreads(client: Client, threads: IWerewolfThread[], reason: string) {
  await Promise.all(threads.map((thread) => deleteWerewolfThread(client, thread.threadId, reason)));
}

async function scheduleWinnerChannelDeletion(client: Client, channelId: string, deleteAt: Date) {
  const delay = Math.max(deleteAt.getTime() - Date.now(), 0);
  setTimeout(async () => {
    const channel = await getTextChannel(client, channelId);
    await channel?.delete('Werewolf game ended').catch(() => null);
    await WerewolfGameModel.deleteOne({ channelId }).catch(() => null);
  }, delay);
}

function schedulePhase(client: Client, channelId: string, endsAt: Date) {
  const current = phaseTimers.get(channelId);
  if (current) clearTimeout(current);

  const delay = Math.max(endsAt.getTime() - Date.now(), 0);
  phaseTimers.set(channelId, setTimeout(() => {
    phaseTimers.delete(channelId);
    void advanceWerewolfGame(client, channelId);
  }, delay));
}

async function setPlayerDead(channelId: string, userId: string) {
  return WerewolfGameModel.findOneAndUpdate(
    { channelId, isEnded: false, 'players.userId': userId, 'players.isAlive': true },
    { $set: { 'players.$.isAlive': false } },
    { new: true }
  );
}

async function lockEliminatedPlayerPermissions(client: Client, channelId: string, userId: string) {
  const channel = await getTextChannel(client, channelId);
  if (!channel) return;

  await channel.permissionOverwrites.edit(
    userId,
    {
      AddReactions: false,
      CreatePrivateThreads: false,
      CreatePublicThreads: false,
      SendMessages: false,
      SendMessagesInThreads: false,
    },
    { reason: 'Werewolf player eliminated' }
  ).catch(() => null);
}

async function configureWerewolfRoomPermissions(client: Client, game: IWerewolfGame) {
  const { channelId } = game;
  const channel = await getTextChannel(client, channelId);
  if (!channel) return;

  const botMember = channel.guild.members.me ?? await channel.guild.members.fetchMe();
  await channel.permissionOverwrites.edit(
    botMember,
    {
      SendMessages: true,
      SendMessagesInThreads: true,
      ViewChannel: true,
    },
    { reason: 'Allow werewolf bot messages' }
  );

  await Promise.all(
    game.players.map((player: IWerewolfPlayer) =>
      channel.permissionOverwrites.edit(
        player.userId,
        { ViewChannel: true },
        { reason: 'Allow werewolf player to view private room' }
      )
    )
  );

  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages: false,
      SendMessagesInThreads: true,
      ViewChannel: false,
    },
    { reason: 'Werewolf room uses threads for player messages' }
  );
}

export async function checkWerewolfWinner(channelId: string): Promise<WerewolfWinner> {
  const game = await WerewolfGameModel.findOne({ channelId, isEnded: false });
  if (!game) return null;

  const alive = alivePlayers(game);
  const werewolves = alive.filter((player: IWerewolfPlayer) => player.role === 'werewolf').length;
  const villagers = alive.length - werewolves;
  const winner: WerewolfWinner = werewolves === 0
    ? 'villagers'
    : werewolves >= villagers
      ? 'werewolves'
      : null;

  if (winner) {
    await WerewolfGameModel.updateOne(
      { channelId, isEnded: false },
      { $set: { isEnded: true, winner, phase: 'ended', phaseEndsAt: null } }
    );
    const timer = phaseTimers.get(channelId);
    if (timer) clearTimeout(timer);
    phaseTimers.delete(channelId);
  }

  return winner;
}

async function announceWinner(client: Client, channelId: string, winner: WerewolfWinner) {
  if (!winner) return;
  const channel = await getTextChannel(client, channelId);
  await channel?.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(winner === 'villagers' ? 'Dân làng chiến thắng' : 'Ma Sói chiến thắng')
        .setDescription('Phòng Ma Sói sẽ bị xóa sau **10 giây**.')
        .setColor(winner === 'villagers' ? 0x2ecc71 : 0xe74c3c),
    ],
  }).catch(() => null);

  const game = await WerewolfGameModel.findOne({ channelId });
  if (game) {
    await deleteWerewolfThreads(client, game.threads, 'Werewolf game ended');
    await Promise.all(
      game.players
        .map((player: IWerewolfPlayer) => player.roleThreadId)
        .filter((threadId: string | null): threadId is string => Boolean(threadId))
        .map((threadId: string) => deleteWerewolfThread(client, threadId, 'Werewolf game ended'))
    );
  }

  const deleteAt = new Date(Date.now() + WINNER_CHANNEL_DELETE_DELAY_MS);
  await WerewolfGameModel.updateOne({ channelId }, { $set: { channelDeleteAt: deleteAt } });
  await scheduleWinnerChannelDeletion(client, channelId, deleteAt);
}

async function triggerHunter(
  client: Client,
  channelId: string,
  player: IWerewolfPlayer,
  nextPhase: 'day' | 'night'
) {
  const channel = await getTextChannel(client, channelId);
  if (!channel) return false;

  const endsAt = new Date(Date.now() + HUNTER_DURATION_MS);
  await WerewolfGameModel.updateOne(
    { channelId, isEnded: false },
    { $set: { phase: 'hunter', phaseEndsAt: endsAt, hunterPlayerId: player.userId, hunterNextPhase: nextPhase } }
  );
  const playerName = await getPlayerDisplayName(client, channelId, player.userId);
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle(`Thợ săn ${playerName} bị loại`)
      .setDescription(`Bạn có 30 giây để kéo theo một người chơi khác. Kết thúc ${discordRelativeTime(endsAt)}.`)
      .setColor(0xe67e22)],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`werewolf_role:hunter:${channelId}:${player.userId}`)
        .setLabel('Kéo theo')
        .setStyle(ButtonStyle.Danger)
    )],
  });
  schedulePhase(client, channelId, endsAt);
  return true;
}

async function eliminatePlayer(client: Client, channelId: string, userId: string, reason: string) {
  const game = await setPlayerDead(channelId, userId);
  if (!game) return false;
  await lockEliminatedPlayerPermissions(client, channelId, userId);
  const player = game.players.find((entry: IWerewolfPlayer) => entry.userId === userId);
  const channel = await getTextChannel(client, channelId);
  const playerName = await getPlayerDisplayName(client, channelId, userId);
  await channel?.send({
    content: `${playerName} đã bị loại (${reason}). Vai trò: **${roleName(player?.role ?? null)}**.`,
    allowedMentions: { parse: [] },
  });

  if (player?.role === 'hunter') {
    return triggerHunter(client, channelId, player, game.phase === 'night' ? 'day' : 'night');
  }

  const winner = await checkWerewolfWinner(channelId);
  await announceWinner(client, channelId, winner);
  return Boolean(winner);
}

async function createRoleActionThread(
  channel: TextChannel,
  game: IWerewolfGame,
  role: WerewolfRole,
  label: string
) {
  const players = alivePlayers(game).filter((player: IWerewolfPlayer) => player.role === role);
  if (players.length === 0) return null;

  const thread = await channel.threads.create({
    name: `${role}-dem-${game.dayNumber}`,
    type: ChannelType.PrivateThread,
    invitable: false,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
  });
  for (const player of players) await thread.members.add(player.userId).catch(() => null);

  const witchButtons = [
    ...(game.witchHealAvailable
      ? [new ButtonBuilder().setCustomId(`werewolf_role:witch_heal:${game.channelId}:any`).setLabel('Cứu').setStyle(ButtonStyle.Success)]
      : []),
    ...(game.witchKillAvailable
      ? [new ButtonBuilder().setCustomId(`werewolf_role:witch_kill:${game.channelId}:any`).setLabel('Giết').setStyle(ButtonStyle.Danger)]
      : []),
    new ButtonBuilder().setCustomId(`werewolf_role:witch_skip:${game.channelId}:any`).setLabel('Skip').setStyle(ButtonStyle.Secondary),
  ];
  const components = role === 'witch'
    ? [new ActionRowBuilder<ButtonBuilder>().addComponents(witchButtons)]
    : [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`werewolf_role:${role}:${game.channelId}:any`)
          .setLabel(label)
          .setStyle(ButtonStyle.Primary)
      )];

  await thread.send({
    embeds: [new EmbedBuilder().setTitle(label).setDescription(`Bạn có 30 giây để hành động. Kết thúc ${discordRelativeTime(new Date(Date.now() + NIGHT_DURATION_MS))}.`).setColor(0x34495e)],
    components,
  });

  await WerewolfGameModel.updateOne(
    { channelId: game.channelId },
    { $push: { threads: { threadId: thread.id, type: role === 'werewolf' ? 'werewolf_night' : role, dayNumber: game.dayNumber, votes: [], actions: [], isClosed: false, createdAt: new Date() } } }
  );
  return thread;
}

async function startNight(client: Client, channelId: string, initialNight = false) {
  const game = await WerewolfGameModel.findOne({ channelId, isEnded: false });
  const channel = await getTextChannel(client, channelId);
  if (!game || !channel) return;

  const startsNextDay = game.phase === 'day_vote' || (game.phase === 'hunter' && game.hunterNextPhase === 'night');
  const dayNumber = initialNight && game.dayNumber === 0
    ? 1
    : startsNextDay
      ? game.dayNumber + 1
      : game.dayNumber;
  const endsAt = new Date(Date.now() + NIGHT_DURATION_MS);
  await WerewolfGameModel.updateOne(
    { channelId, isEnded: false },
    { $set: { phase: 'night', dayNumber, phaseEndsAt: endsAt, protectedPlayerId: null, nightVictimId: null } }
  );
  game.dayNumber = dayNumber;
  await channel.send({ embeds: [new EmbedBuilder().setTitle(`Đêm ${dayNumber}`).setDescription(`Tất cả người chơi đi ngủ. Đêm kết thúc ${discordRelativeTime(endsAt)}.`).setColor(0x2c3e50)] });
  await createRoleActionThread(channel, game, 'werewolf', 'Chọn mục tiêu');
  await createRoleActionThread(channel, game, 'bodyguard', 'Bảo vệ');
  await createRoleActionThread(channel, game, 'seer', 'Tiên tri');
  if (game.witchHealAvailable || game.witchKillAvailable) await createRoleActionThread(channel, game, 'witch', 'Dùng bình thuốc');
  schedulePhase(client, channelId, endsAt);
}

async function resolveVote(client: Client, channelId: string, game: IWerewolfGame) {
  const voteThread = [...game.threads].reverse().find(
    (thread: IWerewolfThread) => thread.type === 'day_vote' && thread.dayNumber === game.dayNumber
  );

  if (voteThread?.votes.length) {
    const counts = new Map<string, number>();
    for (const vote of voteThread.votes) counts.set(vote.targetId, (counts.get(vote.targetId) ?? 0) + 1);
    const highest = Math.max(...counts.values());
    const targets = [...counts.entries()].filter(([, count]) => count === highest).map(([id]) => id);
    if (targets.length === 1) {
      if (await eliminatePlayer(client, channelId, targets[0], 'bình chọn')) return;
    } else {
      const channel = await getTextChannel(client, channelId);
      await channel?.send('Phiếu bình chọn hòa, không ai bị loại.');
    }
  }

  if (voteThread) {
    await WerewolfGameModel.updateOne(
      { channelId },
      { $set: { 'threads.$[thread].isClosed': true } },
      { arrayFilters: [{ 'thread.threadId': voteThread.threadId }] }
    );
    await deleteWerewolfThread(client, voteThread.threadId, `Vote day ${game.dayNumber} ended`);
  }
  await startNight(client, channelId);
}

async function startVote(client: Client, channelId: string) {
  const game = await WerewolfGameModel.findOne({ channelId, isEnded: false });
  const channel = await getTextChannel(client, channelId);
  if (!game || !channel) return;

  const discussion = [...game.threads].reverse().find(
    (thread: IWerewolfThread) =>
      thread.type === 'day_discussion' &&
      thread.dayNumber === game.dayNumber &&
      !thread.isClosed
  );

  if (discussion) {
    await deleteWerewolfThread(client, discussion.threadId, `Discussion day ${game.dayNumber} ended`);
    await WerewolfGameModel.updateOne(
      { channelId },
      { $set: { 'threads.$[thread].isClosed': true } },
      { arrayFilters: [{ 'thread.threadId': discussion.threadId }] }
    );
  }

  const endsAt = new Date(Date.now() + DAY_VOTE_DURATION_MS);
  const message = await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle(`Bình chọn ngày ${game.dayNumber}`)
      .setDescription(`Ping đúng một người trong thread bình chọn để bỏ phiếu. Kết thúc ${discordRelativeTime(endsAt)}.`)
      .setColor(0xe67e22)],
  });
  const voteThread = await message.startThread({
    name: `binh-chon-ngay-${game.dayNumber}`,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
  });
  await WerewolfGameModel.updateOne(
    { channelId, isEnded: false },
    {
      $set: { phase: 'day_vote', phaseEndsAt: endsAt },
      $push: { threads: { threadId: voteThread.id, type: 'day_vote', dayNumber: game.dayNumber, votes: [], actions: [], isClosed: false, createdAt: new Date() } },
    }
  );
  schedulePhase(client, channelId, endsAt);
}

async function resolveNight(client: Client, channelId: string, game: IWerewolfGame) {
  const nightThreads = game.threads.filter((thread: IWerewolfThread) => thread.dayNumber === game.dayNumber && !thread.isClosed);
  const wolfActions = nightThreads.flatMap((thread: IWerewolfThread) => thread.actions)
    .filter((action) => action.action === 'werewolf_kill' && action.targetId);
  let victimId = wolfActions.at(-1)?.targetId ?? null;
  const aliveTargets = alivePlayers(game).filter((player: IWerewolfPlayer) => player.role !== 'werewolf');
  if (!victimId && aliveTargets.length) victimId = aliveTargets[Math.floor(Math.random() * aliveTargets.length)].userId;

  const actions = nightThreads.flatMap((thread: IWerewolfThread) => thread.actions);
  const heal = actions.some((action) => action.action === 'witch_heal' && action.targetId === victimId);
  const poison = actions.find((action) => action.action === 'witch_kill')?.targetId;
  const protectedId = actions.find((action) => action.action === 'bodyguard_protect')?.targetId;
  const deaths = new Set<string>();
  if (victimId && victimId !== protectedId && !heal) deaths.add(victimId);
  if (poison) deaths.add(poison);

  const stateUpdate: Record<string, unknown> = {
    'threads.$[thread].isClosed': true,
  };
  if (heal) stateUpdate.witchHealAvailable = false;
  if (poison) stateUpdate.witchKillAvailable = false;

  await WerewolfGameModel.updateOne(
    { channelId },
    { $set: stateUpdate },
    { arrayFilters: [{ 'thread.dayNumber': game.dayNumber, 'thread.isClosed': false }] }
  ).catch(() => null);
  for (const thread of nightThreads) {
    await deleteWerewolfThread(client, thread.threadId, `Night ${game.dayNumber} ended`);
  }

  let interrupted = false;
  for (const death of deaths) {
    if (await eliminatePlayer(client, channelId, death, 'qua đêm')) interrupted = true;
  }
  if (interrupted) return;
  await startDayDiscussion(client, channelId);
}

export async function startDayDiscussion(client: Client, channelId: string) {
  const game = await WerewolfGameModel.findOne({ channelId, isEnded: false });
  const channel = await getTextChannel(client, channelId);
  if (!game || !channel) return;

  const dayNumber = game.dayNumber;
  const endsAt = new Date(Date.now() + DAY_DISCUSSION_DURATION_MS);
  const message = await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle(`Ngày ${dayNumber}`)
      .setDescription(`Tự do thảo luận ai là Sói. Giai đoạn kết thúc ${discordRelativeTime(endsAt)}.`)
      .setColor(0xf1c40f)],
  });
  const thread = await message.startThread({ name: `thao-luan-ngay-${dayNumber}`, autoArchiveDuration: ThreadAutoArchiveDuration.OneHour });
  await WerewolfGameModel.updateOne(
    { channelId, isEnded: false },
    {
      $set: { phase: 'day_discussion', dayNumber, phaseEndsAt: endsAt, hunterPlayerId: null },
      $push: { threads: { threadId: thread.id, type: 'day_discussion', dayNumber, votes: [], actions: [], isClosed: false, createdAt: new Date() } },
    }
  );
  schedulePhase(client, channelId, endsAt);
}

export async function advanceWerewolfGame(client: Client, channelId: string) {
  const game = await WerewolfGameModel.findOne({ channelId, isEnded: false });
  if (!game) return;
  if (game.phase === 'day_discussion') return startVote(client, channelId);
  if (game.phase === 'day') return startVote(client, channelId);
  if (game.phase === 'day_vote') return resolveVote(client, channelId, game);
  if (game.phase === 'night') return resolveNight(client, channelId, game);
  if (game.phase === 'hunter') {
    await WerewolfGameModel.updateOne({ channelId }, { $set: { hunterPlayerId: null, hunterNextPhase: null } });
    const winner = await checkWerewolfWinner(channelId);
    if (winner) return announceWinner(client, channelId, winner);
    return game.hunterNextPhase === 'day' ? startDayDiscussion(client, channelId) : startNight(client, channelId);
  }
}

export async function startWerewolfGame(client: Client, channelId: string) {
  const game = await WerewolfGameModel.findOne({ channelId, isEnded: false });
  if (!game) return;
  await configureWerewolfRoomPermissions(client, game);
  return startNight(client, channelId, true);
}

export async function resumeWerewolfGames(client: Client) {
  const games = await WerewolfGameModel.find({ isEnded: false, phase: { $in: ['day', 'day_discussion', 'day_vote', 'night', 'hunter'] } });
  for (const game of games) {
    await configureWerewolfRoomPermissions(client, game).catch(() => null);
    await Promise.all(
      game.players
        .filter((player: IWerewolfPlayer) => !player.isAlive)
        .map((player: IWerewolfPlayer) => lockEliminatedPlayerPermissions(client, game.channelId, player.userId))
    );
    if (!game.phaseEndsAt || game.phaseEndsAt.getTime() <= Date.now()) {
      void advanceWerewolfGame(client, game.channelId);
    } else {
      schedulePhase(client, game.channelId, game.phaseEndsAt);
    }
  }
}

export async function resumeWerewolfChannelCleanup(client: Client) {
  const games = await WerewolfGameModel.find({ isEnded: true, channelDeleteAt: { $ne: null } });
  for (const game of games) {
    await scheduleWinnerChannelDeletion(client, game.channelId, game.channelDeleteAt!);
  }
}

export async function handleWerewolfVoteMessage(message: Message<boolean>) {
  if (message.author.bot) return false;
  const game = await WerewolfGameModel.findOne({
    isEnded: false,
    phase: 'day_vote',
    threads: { $elemMatch: { threadId: message.channelId, type: 'day_vote', isClosed: false } },
  });
  if (!game) return false;
  const activeThread = [...game.threads].reverse().find(
    (thread: IWerewolfThread) => thread.type === 'day_vote' && thread.dayNumber === game.dayNumber && !thread.isClosed
  );
  if (!activeThread) return false;
  const voter = game.players.find((player: IWerewolfPlayer) => player.userId === message.author.id && player.isAlive);
  const target = message.mentions.users.first();
  if (!voter || !target) return false;
  if (!game.players.some((player: IWerewolfPlayer) => player.userId === target.id && player.isAlive)) return false;

  const result = await WerewolfGameModel.updateOne(
    { _id: game._id, threads: { $elemMatch: { threadId: activeThread.threadId, 'votes.voterId': { $ne: message.author.id } } } },
    { $push: { 'threads.$[thread].votes': { voterId: message.author.id, targetId: target.id, createdAt: new Date() } } },
    { arrayFilters: [{ 'thread.threadId': activeThread.threadId }] }
  );
  const targetName = await getPlayerDisplayName(message.client, game.channelId, target.id);
  await message.reply({
    content: result.modifiedCount ? `Đã ghi nhận phiếu cho ${targetName}.` : 'Bạn đã bình chọn trong ngày này rồi.',
    allowedMentions: { parse: [], repliedUser: false },
  });
  return true;
}

function targetButtonStyle(role: string) {
  if (role === 'werewolf' || role === 'witch_kill' || role === 'hunter') return ButtonStyle.Danger;
  if (role === 'witch_heal' || role === 'bodyguard') return ButtonStyle.Success;
  return ButtonStyle.Primary;
}

async function buildTargetButtons(interaction: ButtonInteraction, game: IWerewolfGame, role: string) {
  const targets = alivePlayers(game)
    .filter((player: IWerewolfPlayer) => role !== 'werewolf' || player.role !== 'werewolf')
    .slice(0, 25);
  const namedTargets = await Promise.all(targets.map(async (player: IWerewolfPlayer) => {
    const member = interaction.guild
      ? await interaction.guild.members.fetch(player.userId).catch(() => null)
      : null;
    const user = member?.user ?? await interaction.client.users.fetch(player.userId).catch(() => null);
    return {
      player,
      name: (member?.displayName ?? user?.username ?? player.userId).slice(0, 80),
    };
  }));
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let index = 0; index < namedTargets.length; index += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      namedTargets.slice(index, index + 5).map(({ player, name }) =>
        new ButtonBuilder()
          .setCustomId(`werewolf_target:${role}:${game.channelId}:${interaction.user.id}:${player.userId}`)
          .setLabel(name)
          .setStyle(targetButtonStyle(role))
      )
    ));
  }
  return rows;
}

export async function handleWerewolfRoleButton(interaction: ButtonInteraction) {
  const [, role, channelId, ownerId] = interaction.customId.split(':');
  const game = await WerewolfGameModel.findOne({ channelId, isEnded: false });
  const player = game?.players.find((entry: IWerewolfPlayer) => entry.userId === interaction.user.id);
  const requiredRole = role.startsWith('witch_') ? 'witch' : role;
  const canAct = role === 'hunter'
    ? game?.phase === 'hunter' && game.hunterPlayerId === interaction.user.id
    : player?.isAlive && player.role === requiredRole;
  if (!game || !player || !canAct || (ownerId !== 'any' && ownerId !== interaction.user.id)) {
    await interaction.reply({ content: 'Bạn không thể sử dụng hành động này.', ephemeral: true });
    return;
  }
  if ((role === 'witch_heal' && !game.witchHealAvailable) || (role === 'witch_kill' && !game.witchKillAvailable)) {
    await interaction.reply({ content: 'Bình thuốc này đã được sử dụng.', ephemeral: true });
    return;
  }
  if (role === 'witch_skip') {
    const thread = game.threads.find((entry: IWerewolfThread) => entry.threadId === interaction.channelId && !entry.isClosed);
    if (thread) {
      await WerewolfGameModel.updateOne(
        { channelId },
        { $push: { 'threads.$[thread].actions': { actorId: interaction.user.id, action: 'witch_skip', createdAt: new Date() } } },
        { arrayFilters: [{ 'thread.threadId': interaction.channelId }] }
      );
    }
    await interaction.reply({ content: 'Bạn đã bỏ qua lượt dùng bình.', ephemeral: true });
    return;
  }
  const components = await buildTargetButtons(interaction, game, role);
  if (!components.length) {
    await interaction.reply({ content: 'Không có người chơi hợp lệ để chọn.', ephemeral: true });
    return;
  }
  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(targetButtonStyle(role) === ButtonStyle.Danger ? 0xed4245 : 0x5865f2)
        .setTitle('Chọn người chơi')
        .setDescription('Chọn một người chơi bằng nút bên dưới.'),
    ],
    components,
  });
}

export async function handleWerewolfTargetButton(interaction: ButtonInteraction) {
  const [, role, channelId, ownerId, targetId] = interaction.customId.split(':');
  if (ownerId !== interaction.user.id) {
    await interaction.reply({ content: 'Bạn không thể sử dụng hành động này.', ephemeral: true });
    return;
  }
  const game = await WerewolfGameModel.findOne({ channelId, isEnded: false });
  if (!targetId || !game?.players.some((player: IWerewolfPlayer) => player.userId === targetId && player.isAlive)) {
    await interaction.reply({ content: 'Người chơi mục tiêu không hợp lệ.', ephemeral: true });
    return;
  }
  const actor = game.players.find((player: IWerewolfPlayer) => player.userId === interaction.user.id);
  const selectedTarget = game.players.find((player: IWerewolfPlayer) => player.userId === targetId);
  const targetName = await getPlayerDisplayName(interaction.client, channelId, targetId);
  const requiredRole = role.startsWith('witch_') ? 'witch' : role;
  const canAct = role === 'hunter'
    ? game.phase === 'hunter' && game.hunterPlayerId === interaction.user.id
    : actor?.isAlive && actor.role === requiredRole;
  if (!canAct) {
    await interaction.reply({ content: 'Bạn không thể sử dụng hành động này.', ephemeral: true });
    return;
  }
  if ((role === 'witch_heal' && !game.witchHealAvailable) || (role === 'witch_kill' && !game.witchKillAvailable)) {
    await interaction.reply({ content: 'Bình thuốc này đã được sử dụng.', ephemeral: true });
    return;
  }
  if (role === 'werewolf' && actor?.role === 'werewolf' && selectedTarget?.role === 'werewolf') {
    await interaction.reply({ content: 'Ma Sói không thể chọn đồng đội làm mục tiêu.', ephemeral: true });
    return;
  }

  if (role === 'hunter' && game.phase === 'hunter' && game.hunterPlayerId === interaction.user.id) {
    await interaction.update({
      content: `Bạn đã kéo theo ${targetName}.`,
      embeds: [],
      components: [],
      allowedMentions: { parse: [] },
    });
    await eliminatePlayer(interaction.client, channelId, targetId, 'bị Thợ săn kéo theo');
    const activeGame = await WerewolfGameModel.findOne({ channelId, isEnded: false });
    if (!activeGame) return;
    const nextPhase = game.hunterNextPhase;
    await WerewolfGameModel.updateOne({ channelId }, { $set: { hunterPlayerId: null, hunterNextPhase: null } });
    const winner = await checkWerewolfWinner(channelId);
    if (!winner) {
      if (nextPhase === 'day') await startDayDiscussion(interaction.client, channelId);
      else await startNight(interaction.client, channelId);
    }
    return;
  }

  const action = role === 'werewolf' ? 'werewolf_kill'
    : role === 'bodyguard' ? 'bodyguard_protect'
      : role === 'seer' ? 'seer_check'
        : role === 'witch_heal' ? 'witch_heal'
          : role === 'witch_kill' ? 'witch_kill'
          : '';
  if (!action || game.phase !== 'night') {
    await interaction.reply({ content: 'Hành động hoặc phase hiện tại không hợp lệ.', ephemeral: true });
    return;
  }
  const thread = game.threads.find((entry: IWerewolfThread) => entry.threadId === interaction.channelId && !entry.isClosed);
  if (!thread || thread.actions.some((entry: IWerewolfThreadAction) => entry.actorId === interaction.user.id)) {
    await interaction.reply({ content: 'Bạn đã hành động hoặc phase đã kết thúc.', ephemeral: true });
    return;
  }
  await WerewolfGameModel.updateOne(
    { channelId },
    { $push: { 'threads.$[thread].actions': { actorId: interaction.user.id, targetId, action, createdAt: new Date() } } },
    { arrayFilters: [{ 'thread.threadId': interaction.channelId }] }
  );
  const target = selectedTarget;
  await interaction.update({
    content: role === 'seer'
      ? `${targetName} thuộc phe **${target?.role === 'werewolf' ? 'Ma Sói' : 'Dân làng'}**.`
      : `Đã chọn ${targetName}.`,
    embeds: [],
    components: [],
    allowedMentions: { parse: [] },
  });
}
