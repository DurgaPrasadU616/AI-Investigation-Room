import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  console.info('MongoDB connected');
}
