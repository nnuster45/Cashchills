import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import { buildGoogleAuthUrl } from '@/lib/googleGmail';
import { signToken } from '@/lib/server/jwt';

async function handler(req: NextRequest, user: { id: string }) {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    return NextResponse.json({ success: false, error: 'Google OAuth is not configured on the server' }, { status: 500 });
  }

  const rawReturnTo = req.nextUrl.searchParams.get('returnTo') || '/';
  const returnTo = rawReturnTo.startsWith('/') ? rawReturnTo : '/';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || new URL('/api/integrations/google/callback', req.nextUrl.origin).toString();
  
  const servicesParam = req.nextUrl.searchParams.get('services');
  const requestedServices = servicesParam ? servicesParam.split(',') : ['gmail'];

  // Encode user ID + returnTo into state so the callback can identify the user
  // even when opened in an external browser (no session cookie)
  const statePayload = JSON.stringify({
    nonce: crypto.randomUUID(),
    userId: user.id,
    returnTo,
  });
  const state = Buffer.from(statePayload).toString('base64url');

  const googleAuthUrl = buildGoogleAuthUrl({ clientId, redirectUri, state, requestedServices });

  // If mode=json, return URL as JSON (for LINE in-app browser to open externally)
  const mode = req.nextUrl.searchParams.get('mode');
  if (mode === 'json') {
    return NextResponse.json({ success: true, url: googleAuthUrl });
  }

  const response = NextResponse.redirect(googleAuthUrl);
  response.cookies.set('google_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 10 * 60 });
  return response;
}

export const GET = withAuth(handler);
