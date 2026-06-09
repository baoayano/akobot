import mongoose from 'mongoose';

export interface IDisabledChannel {
  channel_id: string;
  disabled_commands: string[];
}

export interface IServer {
  id: string; // guild/server id
  prefix: string;
  disabled_channels: IDisabledChannel[];
  werewolf_category: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const DisabledChannelSchema = new mongoose.Schema<IDisabledChannel>(
  {
    channel_id: { type: String, required: true },
    disabled_commands: { type: [String], required: true, default: [] },
  },
  { _id: false }
);

const ServerSchema = new mongoose.Schema<IServer>(
  {
    id: { type: String, required: true, unique: true },
    prefix: { type: String, required: true, default: 'rin' },
    disabled_channels: { type: [DisabledChannelSchema], required: true, default: [] },
    werewolf_category: { type: String, required: false, default: null }
  },
  { timestamps: true }
);

export const ServerModel = mongoose.models.Server || mongoose.model('Server', ServerSchema);

export default ServerModel;
