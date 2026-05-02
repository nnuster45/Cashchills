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
  getGmailAttachment,
} from '@/lib/googleGmail';

function findAttachments(payload: any): { attachmentId: string, filename: string, mimeType: string }[] {
  if (!payload) return [];
  const results = [];
  if (payload.filename && payload.body?.attachmentId) {
    results.push({
      attachmentId: payload.body.attachmentId,
      filename: payload.filename,
      mimeType: payload.mimeType || '',
    });
  }
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      results.push(...findAttachments(part));
    }
  }
  return results;
}

async function handler(_req: NextRequest, user: { id: string }) {
  try {
    const GoogleConnection = await getGoogleConnectionModel();
    const EmailSyncConfig = await getEmailSyncConfigModel();
    const Transaction = await getTransactionModel();

    const connection = await GoogleConnection.findOne({ owner_user_id: user.id });
    if (!connection?.refresh_token) {
      return NextResponse.json({ success: true, data: { skipped: true, reason: 'not_connected' } });
    }

    let config = await EmailSyncConfig.findOne({ owner_user_id: user.id });
    if (!config) {
      config = await EmailSyncConfig.create({ owner_user_id: user.id });
    }

    if (!config.auto_sync_enabled) {
      return NextResponse.json({ success: true, data: { skipped: true, reason: 'auto_sync_disabled' } });
    }

    // Check if enough time has passed since last sync
    const intervalMs = (config.sync_interval_hours || 2) * 60 * 60 * 1000;
    const lastSync = config.last_auto_sync_at || connection.last_sync_at;
    if (lastSync && Date.now() - new Date(lastSync).getTime() < intervalMs) {
      const nextSyncAt = new Date(new Date(lastSync).getTime() + intervalMs);
      return NextResponse.json({
        success: true,
        data: {
          skipped: true,
          reason: 'too_soon',
          last_sync_at: lastSync,
          next_sync_at: nextSyncAt,
        },
      });
    }

    // Refresh token
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

    // Build query based on config
    const days = Math.min(config.sync_interval_hours * 2, 30);
    const providerQuery = buildProviderQuery(
      config.enabled_providers || [],
      config.custom_emails || [],
      days
    );

    const messageRefs = await listGmailMessages(connection.access_token, providerQuery, 30);

    let imported = 0;
    let duplicates = 0;
    let parsed = 0;

    for (const ref of messageRefs) {
      const fullMessage = await getGmailMessage(connection.access_token, ref.id);
      
      let candidate = parseGmailTransaction(fullMessage);
      
      let extraText = '';
      const receiptFiles: any[] = [];
      const attachments = findAttachments(fullMessage.payload);
      
      for (const att of attachments) {
        receiptFiles.push({
          asset_id: att.attachmentId,
          file_name: att.filename,
          mime_type: att.mimeType,
        });

        // Only download and parse PDF if we haven't found a valid transaction in the body yet
        if (!candidate && att.mimeType === 'application/pdf') {
          try {
            // @ts-ignore
            const pdfParse = require('pdf-parse');
            const b64Data = await getGmailAttachment(connection.access_token, fullMessage.id, att.attachmentId);
            const normalized = b64Data.replace(/-/g, '+').replace(/_/g, '/');
            const buffer = Buffer.from(normalized, 'base64');
            const pdfData = await pdfParse(buffer);
            extraText += '\n' + pdfData.text;
          } catch (err) {
            console.error('Failed to parse PDF', err);
          }
        }
      }

      if (!candidate && extraText) {
        candidate = parseGmailTransaction(fullMessage, extraText);
      }

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
        receipt_files: receiptFiles.length > 0 ? receiptFiles : undefined,
      });
      imported += 1;
    }

    // Update timestamps
    const now = new Date();
    connection.last_sync_at = now;
    await connection.save();
    config.last_auto_sync_at = now;
    await config.save();

    return NextResponse.json({
      success: true,
      data: {
        skipped: false,
        imported,
        duplicates,
        parsed,
        scanned: messageRefs.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Auto-sync failed' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
