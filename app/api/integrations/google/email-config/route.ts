import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import getEmailSyncConfigModel, { DEFAULT_PROVIDERS } from '@/models/EmailSyncConfig';

async function handler(req: NextRequest, user: { id: string }) {
  try {
    const EmailSyncConfig = await getEmailSyncConfigModel();

    if (req.method === 'GET') {
      let config = await EmailSyncConfig.findOne({ owner_user_id: user.id }).lean();
      if (!config) {
        config = {
          owner_user_id: user.id,
          enabled_providers: DEFAULT_PROVIDERS,
          custom_emails: [],
          sync_interval_hours: 2,
          auto_sync_enabled: true,
          last_auto_sync_at: null,
        };
      }
      return NextResponse.json({ success: true, data: config });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const allowedFields: Record<string, boolean> = {
        enabled_providers: true,
        custom_emails: true,
        sync_interval_hours: true,
        auto_sync_enabled: true,
      };

      const update: Record<string, any> = {};
      for (const [key, value] of Object.entries(body)) {
        if (allowedFields[key]) {
          update[key] = value;
        }
      }

      if (update.sync_interval_hours !== undefined) {
        update.sync_interval_hours = Math.max(1, Math.min(24, Number(update.sync_interval_hours) || 2));
      }

      const config = await EmailSyncConfig.findOneAndUpdate(
        { owner_user_id: user.id },
        { $set: { ...update, owner_user_id: user.id } },
        { upsert: true, new: true }
      );

      return NextResponse.json({ success: true, data: config });
    }

    return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

const protectedHandler = withAuth(handler);
export const GET = protectedHandler;
export const PUT = protectedHandler;
