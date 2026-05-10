import mongoose from 'mongoose';

export interface IConfig {
  name: string;
  value: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const ConfigSchema = new mongoose.Schema<IConfig>(
  {
    name: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const ConfigModel = mongoose.models.Config || mongoose.model('Config', ConfigSchema);

export default ConfigModel;
