import mongoose from 'mongoose';
import { connectDB } from '@/lib/server/db';

let _model: mongoose.Model<any> | null = null;

export const DEFAULT_PROVIDERS = [
  'KBank',
  'SCB',
  'Krungthai',
  'Bangkok Bank',
  'Shopee',
  'Lineman',
  'Grab',
  'Lazada',
  'Foodpanda',
];

export default async function getEmailSyncConfigModel() {
  if (!_model) {
    await connectDB();
    const emailSyncConfigSchema = new mongoose.Schema(
      {
        owner_user_id: { type: String, required: true, unique: true, index: true },
        enabled_providers: { type: [String], default: DEFAULT_PROVIDERS },
        custom_emails: { type: [String], default: [] },
        sync_interval_hours: { type: Number, default: 2, min: 1, max: 24 },
        auto_sync_enabled: { type: Boolean, default: true },
        drive_sync_enabled: { type: Boolean, default: false },
        sheets_sync_enabled: { type: Boolean, default: false },
        sheets_file_id: { type: String },
        last_auto_sync_at: { type: Date },
      },
      { collection: 'email_sync_configs', timestamps: true }
    );
    _model = mongoose.models.EmailSyncConfig || mongoose.model('EmailSyncConfig', emailSyncConfigSchema);
  }
  return _model;
}
