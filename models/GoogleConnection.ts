import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';

let _model: mongoose.Model<any> | null = null;

export default async function getGoogleConnectionModel() {
  if (!_model) {
    await connectDB();
    const googleConnectionSchema = new mongoose.Schema(
      {
        owner_user_id: { type: String, required: true, index: true },
        provider: { type: String, default: 'google' },
        google_email: { type: String, required: true },
        access_token: { type: String },
        refresh_token: { type: String },
        scope: { type: String },
        expiry_date: { type: Number },
        connected_at: { type: Date, default: Date.now },
        last_sync_at: { type: Date },
      },
      { collection: 'google_connections', timestamps: true }
    );
    _model = mongoose.models.GoogleConnection || mongoose.model('GoogleConnection', googleConnectionSchema);
  }
  return _model;
}
