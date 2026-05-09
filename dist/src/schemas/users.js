import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    cash: { type: Number, required: true, default: 0 },
    ruby: { type: Number, required: true, default: 0 },
    level: { type: Number, required: true, default: 1 },
    rank: { type: String, required: true, default: 'Bronze' },
    exp: { type: Number, required: true, default: 0 },
});
export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
