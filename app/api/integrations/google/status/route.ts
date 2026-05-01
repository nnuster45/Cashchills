import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import getGoogleConnectionModel from '@/models/GoogleConnection';

async function handler(_req: NextRequest, user: { id: string }) {
  try {
    const GoogleConnection = await getGoogleConnectionModel();
    const connection = await GoogleConnection.findOne({ owner_user_id: user.id }).lean();

    return NextResponse.json({
      success: true,
      data: {
        configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        connected: Boolean(connection),
        email: connection?.google_email || null,
        last_sync_at: connection?.last_sync_at || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unable to fetch Google status' }, { status: 500 });
  }
}

export const GET = withAuth(handler);
