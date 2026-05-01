import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import getGoogleConnectionModel from '@/models/GoogleConnection';
import { exchangeGoogleCode, fetchGmailProfile } from '@/lib/googleGmail';

async function handler(req: NextRequest, user: { id: string }) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const storedState = req.cookies.get('google_oauth_state')?.value;
  const returnTo = req.cookies.get('google_oauth_return_to')?.value || '/';

  const redirect = (status: string) => {
    const safePath = returnTo.startsWith('/') ? returnTo : '/';
    const target = new URL(`${url.origin}${safePath}`);
    target.searchParams.set('gmail', status);
    const response = NextResponse.redirect(target);
    response.cookies.delete('google_oauth_state');
    response.cookies.delete('google_oauth_return_to');
    return response;
  };

  if (error) return redirect('error');
  if (!code || !state || state !== storedState) return redirect('invalid-state');

  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || new URL('/api/integrations/google/callback', req.nextUrl.origin).toString();

  try {
    const tokens = await exchangeGoogleCode({ code, clientId, clientSecret, redirectUri });
    const profile = await fetchGmailProfile(tokens.access_token);
    const GoogleConnection = await getGoogleConnectionModel();
    const existing = await GoogleConnection.findOne({ owner_user_id: user.id });

    await GoogleConnection.findOneAndUpdate(
      { owner_user_id: user.id },
      {
        owner_user_id: user.id,
        provider: 'google',
        google_email: profile.emailAddress,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || existing?.refresh_token,
        scope: tokens.scope,
        expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000,
        connected_at: new Date(),
      },
      { upsert: true, new: true }
    );

    return redirect('connected');
  } catch {
    return redirect('error');
  }
}

export const GET = withAuth(handler);
