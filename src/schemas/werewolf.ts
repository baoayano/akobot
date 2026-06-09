import mongoose from 'mongoose';

export type WerewolfThreadType =
  | 'day_discussion'
  | 'werewolf_night'
  | 'bodyguard'
  | 'seer'
  | 'witch'
  | 'hunter';

export type WerewolfWinner = 'villagers' | 'werewolves' | 'draw' | string | null;

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
  threads: IWerewolfThread[];
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
      enum: ['day_discussion', 'werewolf_night', 'bodyguard', 'seer', 'witch', 'hunter'],
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
    threads: { type: [WerewolfThreadSchema], required: true, default: [] },
    isEnded: { type: Boolean, required: true, default: false },
    winner: { type: String, required: false, default: null },
  },
  { timestamps: true }
);

export const WerewolfGameModel =
  mongoose.models.WerewolfGame || mongoose.model('WerewolfGame', WerewolfGameSchema);

export default WerewolfGameModel;
