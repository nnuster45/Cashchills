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
import { getOrCreateDriveFolder, uploadFileToDrive } from '@/lib/googleDrive';

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

    const hasDriveScope = connection.scope?.includes('drive.file');
    const driveEnabled = config ? config.drive_sync_enabled : false;
    let driveFolderId: string | undefined;

    if (hasDriveScope && driveEnabled) {
      try {
        driveFolderId = await getOrCreateDriveFolder(connection.access_token, 'Cashchills Receipts');
      } catch (err) {
        console.error('Failed to init Drive folder', err);
      }
    }

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
        let pdfDataStr = '';
        if (att.mimeType === 'application/pdf') {
          if (!candidate || driveFolderId) {
            try {
              const b64Data = await getGmailAttachment(connection.access_token, fullMessage.id, att.attachmentId);
              const normalized = b64Data.replace(/-/g, '+').replace(/_/g, '/');
              const buffer = Buffer.from(normalized, 'base64');
              
              if (!candidate) {
                // @ts-ignore
                const pdfParse = require('pdf-parse');
                const pdfData = await pdfParse(buffer);
                pdfDataStr = pdfData.text;
                extraText += '\n' + pdfDataStr;
              }

              // Upload to Google Drive if enabled
              if (driveFolderId) {
                const uploadRes = await uploadFileToDrive(connection.access_token, b64Data, att.filename, att.mimeType, driveFolderId);
                receiptFiles[receiptFiles.length - 1].receipt_url = uploadRes.webViewLink; // Add webViewLink to the last pushed file
              }
            } catch (err) {
              console.error('Failed to process PDF attachment', err);
            }
          }
        } else if (driveFolderId) {
          // Upload other attachments to Drive (e.g. images)
          try {
            const b64Data = await getGmailAttachment(connection.access_token, fullMessage.id, att.attachmentId);
            const uploadRes = await uploadFileToDrive(connection.access_token, b64Data, att.filename, att.mimeType, driveFolderId);
            receiptFiles[receiptFiles.length - 1].receipt_url = uploadRes.webViewLink;
          } catch (err) {
            console.error('Failed to upload attachment to Drive', err);
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

      const createdTx = await Transaction.create({
        ...candidate,
        owner_user_id: user.id,
        receipt_files: receiptFiles.length > 0 ? receiptFiles : undefined,
      });

      // If we uploaded a receipt, set the main receipt_url to the first one for easy access
      if (receiptFiles.length > 0 && receiptFiles[0].receipt_url) {
        createdTx.receipt_url = receiptFiles[0].receipt_url;
        await createdTx.save();
      }

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
