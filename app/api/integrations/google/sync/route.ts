import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import getGoogleConnectionModel from '@/models/GoogleConnection';
import getEmailSyncConfigModel from '@/models/EmailSyncConfig';
import getTransactionModel from '@/models/Transaction';
import {
  getGmailMessage,
  listGmailMessages,
  parseGmailTransaction,
  refreshGoogleAccessToken,
  buildProviderQuery,
} from '@/lib/googleGmail';

async function handler(req: NextRequest, user: { id: string }) {
  try {
    const GoogleConnection = await getGoogleConnectionModel();
    const EmailSyncConfig = await getEmailSyncConfigModel();
    const Transaction = await getTransactionModel();
    const connection = await GoogleConnection.findOne({ owner_user_id: user.id });

    if (!connection?.refresh_token) {
      return NextResponse.json({ success: false, error: 'Google account is not connected' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const refreshed = await refreshGoogleAccessToken({
      refreshToken: connection.refresh_token,
      clientId,
      clientSecret,
    });

    connection.access_token = refreshed.access_token;
    connection.expiry_date = Date.now() + (refreshed.expires_in || 3600) * 1000;
    await connection.save();

    const body = await req.json().catch(() => ({}));
    const days = Number(body?.days || 30);

    // Load email sync config to filter by enabled providers
    let config = await EmailSyncConfig.findOne({ owner_user_id: user.id });

    let query: string;
    if (body?.query) {
      // If a manual query is provided, use it as-is
      query = body.query;
    } else if (config) {
      // Build query from user's provider config
      query = buildProviderQuery(
        config.enabled_providers || [],
        config.custom_emails || [],
        days
      );
    } else {
      // Fallback: generic time-based query
      query = `newer_than:${Math.max(1, Math.min(days, 90))}d`;
    }

    const messageRefs = await listGmailMessages(connection.access_token, query, 30);

    let imported = 0;
    let duplicates = 0;
    let parsed = 0;

    for (const ref of messageRefs) {
      const fullMessage = await getGmailMessage(connection.access_token, ref.id);
      const candidate = parseGmailTransaction(fullMessage);

      if (!candidate) continue;
      parsed += 1;

      const exists = await Transaction.findOne({
        owner_user_id: user.id,
        source_message_id: candidate.source_message_id,
      });
      if (exists) {
        duplicates += 1;
        continue;
      }

      await Transaction.create({
        ...candidate,
        owner_user_id: user.id,
      });
      imported += 1;
    }

    connection.last_sync_at = new Date();
    await connection.save();

    // Also update auto-sync timestamp if config exists
    if (config) {
      config.last_auto_sync_at = new Date();
      await config.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        imported,
        duplicates,
        parsed,
        scanned: messageRefs.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unable to sync Gmail' }, { status: 500 });
  }
}

export const POST = withAuth(handler);
