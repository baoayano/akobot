import mongoose from 'mongoose';

export interface IUser {
  id: string;
  cash: number;
  ruby: number;
  level: number;
  rank: string;
  exp: number;
  lastDaily: Date | null;
  pray_luck: number;
}

const UserSchema = new mongoose.Schema<IUser>({
  id: { type: String, required: true, unique: true },
  cash: { type: Number, required: true, default: 1000 },
  ruby: { type: Number, required: true, default: 0 },
  level: { type: Number, required: true, default: 1 },
  rank: { type: String, required: true, default: 'Bronze' },
  exp: { type: Number, required: true, default: 0 },
  lastDaily: { type: Date, default: null },
  pray_luck: { type: Number, required: true, default: 0 },
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
