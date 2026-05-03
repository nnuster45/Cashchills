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
import { createGoogleSheet, appendToGoogleSheet } from '@/lib/googleSheets';

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

    const hasSheetsScope = connection.scope?.includes('spreadsheets');
    const sheetsEnabled = config ? config.sheets_sync_enabled : false;
    let sheetsFileId = config?.sheets_file_id;

    if (hasSheetsScope && sheetsEnabled && !sheetsFileId) {
      try {
        sheetsFileId = await createGoogleSheet(connection.access_token, 'Cashchills Backup');
        if (config) {
          config.sheets_file_id = sheetsFileId;
          await config.save();
        }
      } catch (err) {
        console.error('Failed to init Google Sheet', err);
      }
    }

    let imported = 0;
    let duplicates = 0;
    let parsed = 0;
    const sheetRowsToAppend: any[][] = [];

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
                const pdfParse = require('pdf-parse-new');
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

      if (sheetsFileId) {
        const d = new Date(createdTx.transaction_date);
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        sheetRowsToAppend.push([
          formattedDate,
          createdTx.type,
          createdTx.category || '',
          createdTx.amount || 0,
          createdTx.reference_no || '',
          createdTx.merchant || createdTx.memo || '',
          createdTx.receipt_url || ''
        ]);
      }

      imported += 1;
    }

    if (sheetsFileId && sheetRowsToAppend.length > 0) {
      try {
        await appendToGoogleSheet(connection.access_token, sheetsFileId, sheetRowsToAppend);
      } catch (err) {
        console.error('Failed to append to Google Sheet', err);
      }
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
