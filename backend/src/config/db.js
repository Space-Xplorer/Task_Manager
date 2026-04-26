import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};
