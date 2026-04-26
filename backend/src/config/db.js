import mongoose from 'mongoose';
import { env } from './env.js';

// Cache the connection promise so serverless re-invocations reuse the same
// connection instead of opening a new one every request.
let _connectionPromise = null;

export const connectDB = async () => {
  // Already connected
  if (mongoose.connection.readyState === 1) return;

  if (!_connectionPromise) {
    _connectionPromise = mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
    });
  }

  try {
    await _connectionPromise;
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    // Reset so the next call retries
    _connectionPromise = null;
    throw err;
  }
};
