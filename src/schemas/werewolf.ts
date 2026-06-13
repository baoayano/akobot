import mongoose from 'mongoose';

export type WerewolfThreadType =
  | 'day_discussion'
  | 'day_vote'
  | 'werewolf_night'
  | 'bodyguard'
  | 'seer'
  | 'witch'
  | 'hunter';

export type WerewolfWinner = 'villagers' | 'werewolves' | 'draw' | string | null;
export type WerewolfPhase = 'lobby' | 'day' | 'day_discussion' | 'day_vote' | 'night' | 'hunter' | 'ended';

export type WerewolfRole =
  | 'villager'
  | 'werewolf'
  | 'seer'
  | 'bodyguard'
  | 'witch'
  | 'hunter';

export interface IWerewolfPlayer {
  userId: string;
  role: WerewolfRole | null;
  isAlive: boolean;
  roleThreadId: string | null;
  joinedAt?: Date;
}

export interface IWerewolfVote {
  voterId: string;
  targetId: string;
  createdAt?: Date;
}

export interface IWerewolfThreadAction {
  actorId: string;
  targetId?: string | null;
  action: string;
  createdAt?: Date;
}

export interface IWerewolfThread {
  threadId: string;
  type: WerewolfThreadType;
  dayNumber: number;
  votes: IWerewolfVote[];
  actions: IWerewolfThreadAction[];
  isClosed: boolean;
  createdAt?: Date;
}

export interface IWerewolfGame {
  guildId: string;
  channelId: string;
  creatorId: string;
  players: IWerewolfPlayer[];
  threads: IWerewolfThread[];
  lobbyEndsAt: Date | null;
  lobbyMessageId: string | null;
  phase: WerewolfPhase;
  dayNumber: number;
  phaseEndsAt: Date | null;
  channelDeleteAt: Date | null;
  protectedPlayerId: string | null;
  nightVictimId: string | null;
  hunterPlayerId: string | null;
  hunterNextPhase: 'day' | 'night' | null;
  witchHealAvailable: boolean;
  witchKillAvailable: boolean;
  isEnded: boolean;
  winner: WerewolfWinner;
  createdAt?: Date;
  updatedAt?: Date;
}

const WerewolfVoteSchema = new mongoose.Schema<IWerewolfVote>(
  {
    voterId: { type: String, required: true },
    targetId: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const WerewolfPlayerSchema = new mongoose.Schema<IWerewolfPlayer>(
  {
    userId: { type: String, required: true },
    role: {
      type: String,
      required: false,
      enum: ['villager', 'werewolf', 'seer', 'bodyguard', 'witch', 'hunter', null],
      default: null,
    },
    isAlive: { type: Boolean, required: true, default: true },
    roleThreadId: { type: String, required: false, default: null },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const WerewolfThreadActionSchema = new mongoose.Schema<IWerewolfThreadAction>(
  {
    actorId: { type: String, required: true },
    targetId: { type: String, required: false, default: null },
    action: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const WerewolfThreadSchema = new mongoose.Schema<IWerewolfThread>(
  {
    threadId: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['day_discussion', 'day_vote', 'werewolf_night', 'bodyguard', 'seer', 'witch', 'hunter'],
    },
    dayNumber: { type: Number, required: true, default: 1 },
    votes: { type: [WerewolfVoteSchema], required: true, default: [] },
    actions: { type: [WerewolfThreadActionSchema], required: true, default: [] },
    isClosed: { type: Boolean, required: true, default: false },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const WerewolfGameSchema = new mongoose.Schema<IWerewolfGame>(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, unique: true },
    creatorId: { type: String, required: true },
    players: { type: [WerewolfPlayerSchema], required: true, default: [] },
    threads: { type: [WerewolfThreadSchema], required: true, default: [] },
    lobbyEndsAt: { type: Date, required: false, default: null },
    lobbyMessageId: { type: String, required: false, default: null },
    phase: {
      type: String,
      required: true,
      enum: ['lobby', 'day', 'day_discussion', 'day_vote', 'night', 'hunter', 'ended'],
      default: 'lobby',
      index: true,
    },
    dayNumber: { type: Number, required: true, default: 0 },
    phaseEndsAt: { type: Date, required: false, default: null },
    channelDeleteAt: { type: Date, required: false, default: null },
    protectedPlayerId: { type: String, required: false, default: null },
    nightVictimId: { type: String, required: false, default: null },
    hunterPlayerId: { type: String, required: false, default: null },
    hunterNextPhase: {
      type: String,
      required: false,
      enum: ['day', 'night', null],
      default: null,
    },
    witchHealAvailable: { type: Boolean, required: true, default: true },
    witchKillAvailable: { type: Boolean, required: true, default: true },
    isEnded: { type: Boolean, required: true, default: false },
    winner: { type: String, required: false, default: null },
  },
  { timestamps: true }
);

export const WerewolfGameModel =
  mongoose.models.WerewolfGame || mongoose.model('WerewolfGame', WerewolfGameSchema);

export default WerewolfGameModel;
