const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';
const GMAIL_MESSAGES_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';

export const GOOGLE_SCOPES = {
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
  drive: 'https://www.googleapis.com/auth/drive.file',
  base: ['openid', 'email', 'profile'],
};

const TRANSACTION_HINTS = [
  'transfer',
  'payment',
  'receipt',
  'payout',
  'deposit',
  'withdraw',
  'transaction',
  'debit',
  'credit',
  'money',
  'promptpay',
  'bank',
  'โอน',
  'แจ้งเตือน',
  'รายการ',
  'เงินเข้า',
  'เงินออก',
  'สำเร็จ',
  'ชำระ',
  'ใบเสร็จ',
  'invoice',
  'grab',
  'lineman',
];

const PROVIDER_KEYWORDS: Array<{
  keywords: string[];
  merchant: string;
  incomeCategory?: string;
  expenseCategory?: string;
}> = [
  { keywords: ['shopee'], merchant: 'Shopee', incomeCategory: 'Shopee', expenseCategory: 'Shopping' },
  { keywords: ['grab'], merchant: 'Grab', incomeCategory: 'Grab', expenseCategory: 'Transportation' },
  { keywords: ['lineman', 'line man', 'linepay', 'line pay'], merchant: 'Lineman', incomeCategory: 'Lineman', expenseCategory: 'Food & Dining' },
  { keywords: ['lazada'], merchant: 'Lazada', incomeCategory: 'Lazada', expenseCategory: 'Shopping' },
  { keywords: ['foodpanda'], merchant: 'Foodpanda', expenseCategory: 'Food & Dining' },
  { keywords: ['kbank', 'kasikorn'], merchant: 'KBank', expenseCategory: 'Utilities' },
  { keywords: ['scb', 'siam commercial'], merchant: 'SCB', expenseCategory: 'Utilities' },
  { keywords: ['krungthai', 'ktb', 'ktg'], merchant: 'Krungthai', expenseCategory: 'Utilities' },
  { keywords: ['bangkok bank', 'bbl'], merchant: 'Bangkok Bank', expenseCategory: 'Utilities' },
];

const INCOME_HINTS = ['deposit', 'incoming', 'เงินเข้า', 'credited', 'payout', 'settlement', 'โอนเข้า', 'ยอดขาย', 'ยอดรับทั้งหมด', 'ยอดรับ', 'ยอดโอนคืน', 'sales report', 'ได้รับเงิน'];
const EXPENSE_HINTS = ['purchase', 'debit', 'withdraw', 'outgoing', 'เงินออก', 'โอนออก', 'charge', 'หักค่าบริการ'];

// Merchant platform senders: emails from these are income for merchants
const MERCHANT_PLATFORM_SENDERS = ['lmwn.com', 'grab.com', 'lineman'];

// Real email addresses used by Thai banks/platforms for transaction notifications
export const PROVIDER_EMAIL_ADDRESSES: Record<string, string[]> = {
  KBank: [
    'alert@kasikornbank.com',
    'noreply@kasikornbank.com',
    'kbanklive@kasikornbank.com',
    'kplus@kasikornbank.com',
  ],
  SCB: [
    'scbeasy@scb.co.th',
    'alert@scb.co.th',
    'noreply@scb.co.th',
    'scb_easy@scb.co.th',
  ],
  Krungthai: [
    'krungthai@krungthai.com',
    'alert@krungthai.com',
    'noreply@krungthai.com',
    'ktb_noreply@krungthai.com',
  ],
  'Bangkok Bank': [
    'bualuang@bangkokbank.com',
    'noreply@bangkokbank.com',
    'alert@bangkokbank.com',
  ],
  Shopee: [
    'no-reply@shopee.co.th',
    'noreply@shopee.co.th',
    'no-reply@mail.shopee.co.th',
  ],
  Lineman: [
    'no-reply@lineman.line.me',
    'noreply@lineman.line.me',
    'no-reply@lineshopping.com',
    'ar-linemanth@lmwn.com',
    'noreply@lmwn.com',
    'no-reply@lmwn.com',
  ],
  Grab: [
    'no-reply@grab.com',
    'noreply@grab.com',
    'receipts@grab.com',
  ],
  Lazada: [
    'noreply@lazada.co.th',
    'no-reply@lazada.co.th',
    'noreply@mail.lazada.co.th',
  ],
  Foodpanda: [
    'no-reply@foodpanda.co.th',
    'noreply@foodpanda.co.th',
    'no-reply@mail.foodpanda.co.th',
  ],
};

/**
 * Build a Gmail search query that filters by provider sender addresses.
 * If no providers and no custom emails are provided, falls back to a generic transaction query.
 */
export function buildProviderQuery(
  enabledProviders: string[],
  customEmails: string[],
  days: number = 30,
): string {
  const fromParts: string[] = [];

  for (const provider of enabledProviders) {
    const emails = PROVIDER_EMAIL_ADDRESSES[provider];
    if (emails) {
      for (const email of emails) {
        fromParts.push(`from:${email}`);
      }
    }
  }

  for (const email of customEmails) {
    if (email && email.includes('@')) {
      fromParts.push(`from:${email}`);
    }
  }

  const timeFilter = `newer_than:${Math.max(1, Math.min(days, 90))}d`;

  if (fromParts.length === 0) {
    // Fallback: generic transaction query
    return timeFilter;
  }

  // Gmail OR syntax: {from:a from:b from:c} means "from a OR b OR c"
  return `{${fromParts.join(' ')}} ${timeFilter}`;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessagePayload {
  mimeType?: string;
  filename?: string;
  headers?: GmailMessageHeader[];
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailMessagePayload[];
}

interface GmailMessage {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePayload;
}

export interface ParsedEmailTransaction {
  type: 'income' | 'expense';
  amount: number;
  gross_amount?: number;
  fee_amount?: number;
  vat_amount?: number;
  category: string;
  merchant: string;
  date: string;
  source: 'email';
  source_message_id: string;
  email_subject: string;
  needs_review: true;
  notes?: string;
  email_html?: string;
  reference_no?: string;
}

export function getGoogleAuthScopes(requestedServices: string[] = ['gmail']) {
  const scopes = [...GOOGLE_SCOPES.base];
  if (requestedServices.includes('gmail')) scopes.push(GOOGLE_SCOPES.gmail);
  if (requestedServices.includes('sheets')) scopes.push(GOOGLE_SCOPES.sheets);
  if (requestedServices.includes('drive')) scopes.push(GOOGLE_SCOPES.drive);
  return scopes.join(' ');
}

export function buildGoogleAuthUrl({
  clientId,
  redirectUri,
  state,
  requestedServices = ['gmail'],
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  requestedServices?: string[];
}) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', getGoogleAuthScopes(requestedServices));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeGoogleCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status})`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function refreshGoogleAccessToken({
  refreshToken,
  clientId,
  clientSecret,
}: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed (${response.status})`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function fetchGmailProfile(accessToken: string) {
  const response = await fetch(GMAIL_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Gmail profile request failed (${response.status})`);
  }

  return response.json() as Promise<{ emailAddress: string; messagesTotal: number }>;
}

export async function listGmailMessages(accessToken: string, query = 'newer_than:30d', maxResults = 25) {
  const url = new URL(GMAIL_MESSAGES_URL);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('q', query);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Gmail message list failed (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data?.messages) ? data.messages as Array<{ id: string }> : [];
}

export async function getGmailMessage(accessToken: string, messageId: string) {
  const response = await fetch(`${GMAIL_MESSAGES_URL}/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Gmail message fetch failed (${response.status})`);
  }

  return response.json() as Promise<GmailMessage>;
}

export async function getGmailAttachment(accessToken: string, messageId: string, attachmentId: string) {
  const response = await fetch(`${GMAIL_MESSAGES_URL}/${messageId}/attachments/${attachmentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Gmail attachment fetch failed (${response.status})`);
  }

  const data = await response.json();
  return data.data as string; // Base64url encoded data
}

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf-8');
}

function collectText(payload?: GmailMessagePayload): string {
  if (!payload) return '';

  const current =
    payload.mimeType === 'text/plain' && payload.body?.data
      ? decodeBase64Url(payload.body.data)
      : '';

  const nested = Array.isArray(payload.parts)
    ? payload.parts.map((part) => collectText(part)).filter(Boolean).join('\n')
    : '';

  return [current, nested].filter(Boolean).join('\n');
}

function collectHtml(payload?: GmailMessagePayload): string {
  if (!payload) return '';

  const current =
    payload.mimeType === 'text/html' && payload.body?.data
      ? decodeBase64Url(payload.body.data)
      : '';

  const nested = Array.isArray(payload.parts)
    ? payload.parts.map((part) => collectHtml(part)).filter(Boolean).join('\n')
    : '';

  return [current, nested].filter(Boolean).join('\n');
}

function headersToMap(headers?: GmailMessageHeader[]) {
  return (headers || []).reduce<Record<string, string>>((acc, header) => {
    acc[header.name.toLowerCase()] = header.value;
    return acc;
  }, {});
}

function normalizeAmount(value: string) {
  const amount = Number(value.replace(/[^0-9.-]/g, '').replace(/,/g, ''));
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function extractAmount(text: string) {
  const patterns = [
    { r: /(?:thb|฿|บาท|thai baht)\s*([+-]?\d[\d,]*(?:\.\d{1,2})?)/i, idx: 1 },
    { r: /([+-]?\d[\d,]*(?:\.\d{1,2})?)\s*(?:thb|฿|บาท|thai baht)/i, idx: 1 },
    // Grab PDF block layout where VAT appears before the actual total due to text extraction order
    { r: /Grand Total[^\d]*([\d,.]+)[^\d]*([\d,.]+)/i, idx: 2 },
    { r: /amount[^0-9]*([+-]?\d[\d,]*(?:\.\d{1,2})?)/i, idx: 1 },
    { r: /ยอด[^0-9]*([+-]?\d[\d,]*(?:\.\d{1,2})?)/i, idx: 1 },
    { r: /(?:grand total|total amount|ยอดสุทธิ|ยอดรวมทั้งสิ้น|จำนวนเงินรวมทั้งสิ้น)[^0-9]*([+-]?\d[\d,]*(?:\.\d{1,2})?)/i, idx: 1 },
    { r: /จำนวน\s*([+-]?\d[\d,]*(?:\.\d{1,2})?)\s*(?:บาท|thb)/i, idx: 1 },
  ];

  for (const { r, idx } of patterns) {
    const match = text.match(r);
    if (match?.[idx]) {
      // Avoid matching dates as amounts (e.g. 29 from 29-03-2026)
      if (match[0].match(/\d{2}-\d{2}-\d{4}/)) continue;
      
      const amount = normalizeAmount(match[idx]);
      if (amount > 0) return amount;
    }
  }

  return 0;
}

function inferType(text: string, fromEmail?: string): 'income' | 'expense' {
  const lookup = text.toLowerCase();
  const fromLookup = (fromEmail || '').toLowerCase();

  // Merchant platform emails (LINE MAN, Grab) = always income for merchant users
  const isFromMerchantPlatform = MERCHANT_PLATFORM_SENDERS.some(s => fromLookup.includes(s) || lookup.includes(s));
  if (isFromMerchantPlatform) {
    return 'income';
  }

  if (INCOME_HINTS.some((hint) => lookup.includes(hint))) return 'income';
  if (EXPENSE_HINTS.some((hint) => lookup.includes(hint))) return 'expense';
  return lookup.includes('payout') || lookup.includes('deposit') ? 'income' : 'expense';
}

function inferMerchant(text: string) {
  const lookup = text.toLowerCase();
  for (const provider of PROVIDER_KEYWORDS) {
    if (provider.keywords.some((keyword) => lookup.includes(keyword))) {
      return provider;
    }
  }
  return null;
}

function inferCategory(type: 'income' | 'expense', provider: ReturnType<typeof inferMerchant>) {
  if (provider) {
    if (type === 'income' && provider.incomeCategory) return provider.incomeCategory;
    if (type === 'expense' && provider.expenseCategory) return provider.expenseCategory;
  }
  return type === 'income' ? 'Income' : 'Uncategorized';
}

function looksLikeTransaction(text: string) {
  const lookup = text.toLowerCase();
  return TRANSACTION_HINTS.some((keyword) => lookup.includes(keyword));
}

function extractReferenceNo(text: string) {
  // Standard bank reference
  const bankMatch = text.match(/(?:เลขที่รายการ|Transaction Number|Reference No|Ref No)[\s:]*([A-Za-z0-9]+)/i);
  if (bankMatch?.[1]) return bankMatch[1];

  // Invoice number from LINE MAN / Grab
  const invoiceMatch = text.match(/(?:เลขที่|Invoice No|Receipt.*No\.?)\s*([A-Z]{2,4}\d{10,})/i);
  if (invoiceMatch?.[1]) return invoiceMatch[1];

  return undefined;
}

function extractDate(text: string, fallbackDate: Date) {
  const match = text.match(/(?:วันที่ทำรายการ|Transaction Date)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)/i);
  if (match?.[1]) {
    // Parse DD/MM/YYYY HH:MM:SS assuming local timezone (or TH time)
    const [datePart, timePart] = match[1].split(/\s+/);
    const [day, month, year] = datePart.split('/');
    if (day && month && year) {
      // Create date string in ISO format for parsing
      const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart || '00:00:00'}+07:00`;
      const parsed = new Date(isoString);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  return fallbackDate;
}

function extractAccounts(text: string) {
  const fromMatch = text.match(/(?:โอนเงินจากบัญชี|From Account)[\s:]*([^\n]+)/i);
  const toMatch = text.match(/(?:เพื่อเข้าบัญชี|To Account)[\s:]*([^\n]+)/i);
  const toNameMatch = text.match(/(?:ชื่อบัญชี|Account Name)[\s:]*([^\n]+)/i);

  const parts = [];
  if (fromMatch?.[1]) parts.push(`จากบัญชี: ${fromMatch[1].trim()}`);
  if (toMatch?.[1]) {
    let toText = `เข้าบัญชี: ${toMatch[1].trim()}`;
    if (toNameMatch?.[1]) toText += ` (${toNameMatch[1].trim()})`;
    parts.push(toText);
  }

  return parts.join('\n') || undefined;
}

/**
 * Extract GP breakdown from LINE MAN daily sales report email body.
 * 
 * The email body contains lines like:
 *   รายรับทั้งหมด ฿89.00
 *   ยอดขาย E-Payment  89.00
 *   ค่าบริการ GP (รวม VAT)  -28.57
 *   ยอดเงินในระบบ  355.37
 */
function extractDailySalesGp(text: string): { totalSales: number; gpFee: number; netAmount: number } | null {
  // Must be a daily sales report
  if (!text.includes('รายงานยอดขาย') && !text.includes('ยอดขายประจำวัน')) return null;

  const norm = (s: string) => Math.abs(Number(s.replace(/[^0-9.-]/g, '').replace(/,/g, '')));

  // Extract total sales: "รายรับทั้งหมด" followed by amount
  const totalMatch = text.match(/รายรับทั้งหมด[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
  // Extract GP fee: "ค่าบริการ GP" followed by negative amount
  const gpMatch = text.match(/ค่าบริการ\s*GP[^-\d]*(-?[\d,]+(?:\.\d{1,2})?)/i);

  if (totalMatch?.[1]) {
    const totalSales = norm(totalMatch[1]);
    const gpFee = gpMatch?.[1] ? norm(gpMatch[1]) : 0;
    const netAmount = Math.round((totalSales - gpFee) * 100) / 100;

    if (totalSales > 0) {
      return { totalSales, gpFee, netAmount };
    }
  }

  return null;
}

/**
 * Extract GP fee breakdown from Grab / LINE MAN tax invoice text.
 * 
 * Both platforms have the label and value on separate lines:
 * 
 * Grab:
 *   Line N:   "271.21"           (Total Amount before VAT)
 *   Line N+1: "รวมมูลคาสินคาและบริการ"
 *   Line N+2: "Total Amount"
 *   ...
 *   Line M:   "18.98"            (VAT)
 *   Line M+1: "290.19"           (Grand Total)
 * 
 * LINE MAN:
 *   Line N:   "จำนวนเงินค่าบริการ"
 *   Line N+1: "ภาษีมูลค่าเพิ่ม"
 *   Line N+2: "จำนวนเงินทั้งสิ้น"
 *   Line N+3: "1,129.26"         (pre-VAT)
 *   Line N+4: "79.05"            (VAT)
 *   Line N+5: "1,208.31"         (Grand Total)
 */
function extractGpFeeBreakdown(text: string): { preVatAmount: number; vatAmount: number; grandTotal: number } | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const norm = (s: string) => Number(s.replace(/,/g, ''));
  const isNumLine = (l: string) => /^[\d,]+(?:\.\d{1,2})?$/.test(l);

  // Strategy: find "สรุปยอด" or "Grand Total" section and extract 3 consecutive numbers after the labels
  
  // --- LINE MAN pattern ---
  // Look for labels and extract numbers on the same line or next line
  const lmPreVatMatch = text.match(/จำนวนเงินค่าบริการ[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
  const lmVatMatch = text.match(/ภาษีมูลค่าเพิ่ม[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
  const lmGrandMatch = text.match(/จำนวนเงินทั้งสิ้น[^\d]*([\d,]+(?:\.\d{1,2})?)/i);

  if (lmPreVatMatch?.[1] && lmVatMatch?.[1] && lmGrandMatch?.[1]) {
    return {
      preVatAmount: norm(lmPreVatMatch[1]),
      vatAmount: norm(lmVatMatch[1]),
      grandTotal: norm(lmGrandMatch[1])
    };
  }

  // Fallback LINE MAN pattern: look for "สรุปยอด" then find 3 numbers
  const srupIdx = lines.findIndex(l => l.includes('สรุปยอด'));
  if (srupIdx >= 0) {
    // Find the 3 consecutive number lines after สรุปยอด
    const nums: number[] = [];
    for (let i = srupIdx + 1; i < lines.length && nums.length < 3; i++) {
      if (isNumLine(lines[i])) {
        nums.push(norm(lines[i]));
      }
    }
    if (nums.length === 3 && nums[0] > 0 && nums[2] > 0) {
      return { preVatAmount: nums[0], vatAmount: nums[1], grandTotal: nums[2] };
    }
  }

  // --- Grab pattern ---
  // Look for labels and extract numbers
  const gbPreVatMatch = text.match(/Total\s*Amount[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
  const gbVatMatch = text.match(/VAT\s*7\s*%[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
  const gbGrandMatch = text.match(/Grand\s*Total[^\d]*([\d,]+(?:\.\d{1,2})?)/i);

  if (gbPreVatMatch?.[1] && gbVatMatch?.[1] && gbGrandMatch?.[1]) {
    return {
      preVatAmount: norm(gbPreVatMatch[1]),
      vatAmount: norm(gbVatMatch[1]),
      grandTotal: norm(gbGrandMatch[1])
    };
  }

  // Fallback Grab pattern: Look for "Grand Total" label, then find the 3 numbers that appear
  // In Grab's layout: Total Amount value comes first, then VAT value, then Grand Total value
  const grandIdx = lines.findIndex(l => l.includes('Grand Total'));
  const totalAmtIdx = lines.findIndex(l => l.includes('Total Amount'));
  if (grandIdx >= 0 && totalAmtIdx >= 0) {
    // Collect all numeric lines between the first "Total Amount" occurrence and a few lines after "Grand Total"
    const searchStart = Math.min(totalAmtIdx, grandIdx) - 3;  // look a few lines before
    const searchEnd = Math.max(totalAmtIdx, grandIdx) + 5;    // look a few lines after
    const nums: number[] = [];
    for (let i = Math.max(0, searchStart); i < Math.min(lines.length, searchEnd); i++) {
      if (isNumLine(lines[i])) {
        nums.push(norm(lines[i]));
      }
    }
    // We expect at least 3 numbers: [totalAmount, vat, grandTotal]
    if (nums.length >= 3) {
      // Last 3 numbers in the block should be: preVat, vat, grandTotal
      const last3 = nums.slice(-3);
      if (last3[0] > 0 && last3[2] > 0) {
        return { preVatAmount: last3[0], vatAmount: last3[1], grandTotal: last3[2] };
      }
    }
    // Fallback: if only 2 numbers (no separate VAT line)
    if (nums.length === 2 && nums[0] > 0 && nums[1] > 0) {
      const vat = Math.round((nums[1] - nums[0]) * 100) / 100;
      return { preVatAmount: nums[0], vatAmount: vat, grandTotal: nums[1] };
    }
  }

  return null;
}

export function parseGmailTransaction(message: GmailMessage, extraText?: string): ParsedEmailTransaction | null {
  const headers = headersToMap(message.payload?.headers);
  const subject = headers.subject || '';
  const from = headers.from || '';
  const plainText = collectText(message.payload);
  const htmlText = collectHtml(message.payload);
  const combinedText = [subject, message.snippet || '', plainText, extraText || '', from].filter(Boolean).join('\n');

  if (!looksLikeTransaction(combinedText)) {
    return null;
  }

  const amount = extractAmount(combinedText);
  if (!amount) {
    return null;
  }

  const type = inferType(combinedText, from);
  const provider = inferMerchant(combinedText);
  const merchant = provider?.merchant || (type === 'income' ? 'Bank Deposit' : 'Bank Transfer');
  const category = inferCategory(type, provider);
  const fallbackDate = message.internalDate ? new Date(Number(message.internalDate)) : new Date(headers.date || Date.now());
  const parsedDate = extractDate(combinedText, fallbackDate);
  const referenceNo = extractReferenceNo(combinedText);
  
  const accountsInfo = extractAccounts(combinedText);
  let finalNotes = [accountsInfo, from].filter(Boolean).join('\n\n');

  let finalAmount = amount;
  let feeAmount: number | undefined = undefined;
  let grossAmount: number | undefined = undefined;

  let vatAmount: number | undefined = undefined;

  // --- Daily Sales Report GP (LINE MAN "รายงานยอดขายรายวัน") ---
  // The email body itself contains: รายรับทั้งหมด, ค่าบริการ GP, etc.
  const dailySales = extractDailySalesGp(combinedText);
  if (dailySales) {
    grossAmount = dailySales.totalSales;    // ยอดขายรวม
    feeAmount = dailySales.gpFee;           // ค่าบริการ GP (รวม VAT)
    finalAmount = dailySales.netAmount;     // ยอดที่ได้รับจริง = ยอดขาย - GP รวม VAT
    vatAmount = undefined;
  }

  // --- Tax Invoice GP (Grab/LINE MAN ใบกำกับภาษี) ---
  // Only apply if we didn't already get a daily sales breakdown
  if (!dailySales && (merchant === 'Grab' || merchant === 'Lineman') && (combinedText.includes('ใบกำกับภาษี') || combinedText.toLowerCase().includes('tax invoice') || combinedText.toLowerCase().includes('gp fee'))) {
    const gpBreakdown = extractGpFeeBreakdown(combinedText);
    if (gpBreakdown) {
      // User requested exact mapping from the PDF:
      // Amount (ยอดหลัก/ยอดสุทธิที่ได้รับ) = Service Fee (Pre-VAT) e.g., 1129.26
      // Gross Amount = Grand Total e.g., 1208.31
      // VAT = VAT 7% e.g., 79.05
      
      finalAmount = gpBreakdown.preVatAmount;
      feeAmount = undefined; // Do not show as GP fee, just a total with VAT
      vatAmount = gpBreakdown.vatAmount;
      grossAmount = gpBreakdown.grandTotal;

      // Add a readable breakdown to notes
      const breakdown = [
        `📊 รายละเอียดใบกำกับภาษี:`,
        `  ยอดสุทธิที่ได้รับ (Amount): ${gpBreakdown.preVatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
        `  ภาษีมูลค่าเพิ่ม 7% (VAT): ${gpBreakdown.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
        `  ยอดรวมทั้งหมด (Gross): ${gpBreakdown.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
      ].join('\n');
      finalNotes = [breakdown, finalNotes].filter(Boolean).join('\n\n');
    }
  }

  return {
    type,
    amount: finalAmount,
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    vat_amount: vatAmount,
    category,
    merchant,
    date: parsedDate.toISOString(),
    source: 'email',
    source_message_id: message.id,
    email_subject: subject,
    needs_review: true,
    notes: finalNotes || undefined,
    email_html: htmlText || undefined,
    reference_no: referenceNo,
  };
}
