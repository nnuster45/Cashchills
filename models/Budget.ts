import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';

let _model: mongoose.Model<any> | null = null;

export default async function getBudgetModel() {
  if (!_model) {
    await connectDB();
    const budgetSchema = new mongoose.Schema(
      {
        owner_user_id: { type: String, index: true },
        category: { type: String, required: true },
        monthly_limit: { type: Number, required: true },
        month_year: { type: String, required: true },
      },
      { collection: 'budgets', timestamps: true }
    );
    _model = mongoose.models.Budget || mongoose.model('Budget', budgetSchema);
  }
  return _model;
}
