import mongoose from 'mongoose';

const DATABASE_URL = process.env.DATABASE_URL || '';

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

export async function connectDB() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!global.__mongooseConnectionPromise) {
    global.__mongooseConnectionPromise = mongoose.connect(DATABASE_URL, {
      dbName: process.env.DATABASE_NAME || undefined,
    });
  }

  return global.__mongooseConnectionPromise;
}
