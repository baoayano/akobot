import mongoose from 'mongoose';
import { config } from '../config.js';
export async function connectMongo(uri) {
    const mongoUri = uri ?? config.mongoUri ?? process.env.MONGO_URI ?? '';
    if (!mongoUri) {
        throw new Error('MONGO_URI not provided. Set MONGO_URI in environment or config.');
    }
    await mongoose.connect(mongoUri);
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected');
    });
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
    });
    return mongoose;
}
export async function closeMongo() {
    await mongoose.connection.close();
}
