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

  // Merchant platform emails (LINE MAN, Grab) = income for merchant users
  const isFromMerchantPlatform = MERCHANT_PLATFORM_SENDERS.some(s => fromLookup.includes(s) || lookup.includes(s));
  if (isFromMerchantPlatform) {
    // Only classify as expense if it's specifically about GP/commission deduction
    if (lookup.includes('ค่าบริการ gp') || lookup.includes('commission fee')) {
      return 'expense';
    }
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
  const finalNotes = [accountsInfo, from].filter(Boolean).join('\n\n');

  return {
    type,
    amount,
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
