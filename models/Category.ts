import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';

let _model: mongoose.Model<any> | null = null;

export default async function getCategoryModel() {
  if (!_model) {
    await connectDB();
    const categorySchema = new mongoose.Schema(
      {
        owner_user_id: { type: String, index: true },
        name: { type: String, required: true },
        icon: { type: String, default: 'FiTag' },
        type: { type: String, enum: ['income', 'expense'], required: true },
        is_default: { type: Boolean, default: false },
      },
      { collection: 'categories', timestamps: true }
    );
    _model = mongoose.models.Category || mongoose.model('Category', categorySchema);
  }
  return _model;
}
