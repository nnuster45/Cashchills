import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';

let _model: mongoose.Model<any> | null = null;

export default async function getTransactionModel() {
  if (!_model) {
    await connectDB();
    const transactionSchema = new mongoose.Schema(
      {
        owner_user_id: { type: String, index: true },
        type: { type: String, enum: ['income', 'expense'], required: true },
        amount: { type: Number, required: true },
        gross_amount: { type: Number },
        fee_amount: { type: Number },
        vat_amount: { type: Number },
        category: { type: String, default: 'Uncategorized' },
        merchant: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        source: { type: String, enum: ['manual', 'email'], default: 'manual' },
        source_message_id: { type: String, index: true },
        email_subject: { type: String },
        needs_review: { type: Boolean, default: false },
        receipt_url: { type: String },
        receipt_files: [{
          asset_id: { type: String },
          file_name: { type: String, required: true },
          mime_type: { type: String },
          size_bytes: { type: Number },
        }],
        notes: { type: String },
        email_html: { type: String },
        reference_no: { type: String },
        is_deleted: { type: Boolean, default: false },
        is_favorite: { type: Boolean, default: false },
        items: [{
          name: { type: String, required: true },
          amount: { type: Number, required: true },
          quantity: { type: Number, default: 1 },
          notes: { type: String },
        }],
      },
      { collection: 'transactions', timestamps: true }
    );
    _model = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
  }
  return _model;
}
