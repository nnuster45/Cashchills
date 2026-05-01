import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import getGoogleConnectionModel from '@/models/GoogleConnection';

async function handler(_req: NextRequest, user: { id: string }) {
  try {
    const GoogleConnection = await getGoogleConnectionModel();
    await GoogleConnection.findOneAndDelete({ owner_user_id: user.id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unable to disconnect Google account' }, { status: 500 });
  }
}

export const DELETE = withAuth(handler);
