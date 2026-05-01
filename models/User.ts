import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';

let _model: mongoose.Model<any> | null = null;

export default async function getUserModel() {
  if (!_model) {
    await connectDB();

    const userSchema = new mongoose.Schema(
      {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        name: { type: String },
      },
      {
        collection: 'users',
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
      }
    );

    _model = mongoose.models.User || mongoose.model('User', userSchema);
  }

  return _model;
}
