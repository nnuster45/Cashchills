import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import getGoogleConnectionModel from '@/models/GoogleConnection';

import getTransactionModel from '@/models/Transaction';
import getEmailSyncConfigModel from '@/models/EmailSyncConfig';

async function handler(_req: NextRequest, user: { id: string }) {
  try {
    const GoogleConnection = await getGoogleConnectionModel();
    const EmailSyncConfig = await getEmailSyncConfigModel();
    const Transaction = await getTransactionModel();
    
    // Disconnect the account
    await GoogleConnection.findOneAndDelete({ owner_user_id: user.id });
    
    // Delete the sync config
    await EmailSyncConfig.findOneAndDelete({ owner_user_id: user.id });
    
    // Soft-delete any pending (unconfirmed) transactions that came from email
    await Transaction.updateMany(
      { owner_user_id: user.id, source: 'email', needs_review: true },
      { is_deleted: true }
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unable to disconnect Google account' }, { status: 500 });
  }
}

export const DELETE = withAuth(handler);
