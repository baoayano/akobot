import {
  WerewolfGameModel,
  type IWerewolfGame,
  type IWerewolfThread,
  type WerewolfThreadType,
  type WerewolfWinner,
} from '../schemas/werewolf.js';

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

export async function createWerewolfGame(guildId: string, channelId: string) {
  return WerewolfGameModel.create({ guildId, channelId });
}

export async function getOrCreateWerewolfGame(guildId: string, channelId: string) {
  return WerewolfGameModel.findOneAndUpdate(
    { channelId },
    { $setOnInsert: { guildId, channelId } },
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

export default {
  getWerewolfGameOrNull,
  getActiveWerewolfGame,
  getActiveWerewolfGamesByGuild,
  createWerewolfGame,
  getOrCreateWerewolfGame,
  werewolfGameExists,
  getWerewolfThread,
  addWerewolfThread,
  closeWerewolfThread,
  castWerewolfVote,
  recordWerewolfAction,
  endWerewolfGame,
  deleteWerewolfGame,
  updateWerewolfGame,
};
