import { NextRequest, NextResponse } from 'next/server';
import getGoogleConnectionModel from '@/models/GoogleConnection';
import { exchangeGoogleCode, fetchGmailProfile } from '@/lib/googleGmail';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Decode state to extract userId and returnTo
  let userId = '';
  let returnTo = '/';
  try {
    const decoded = JSON.parse(Buffer.from(stateParam || '', 'base64url').toString());
    userId = decoded.userId || '';
    returnTo = decoded.returnTo || '/';
  } catch {
    // State decode failed
  }

  const redirect = (status: string) => {
    let target: URL;
    
    // If returnTo is a full URL (e.g. LIFF URL), redirect to it directly
    if (returnTo.startsWith('http')) {
      target = new URL(returnTo);
    } else {
      const safePath = returnTo.startsWith('/') ? returnTo : '/';
      const protocol = req.headers.get('x-forwarded-proto') || 'https';
      const host = req.headers.get('host') || url.host;
      target = new URL(`${protocol}://${host}${safePath}`);
    }
    
    target.searchParams.set('gmail', status);
    const response = NextResponse.redirect(target.toString());
    response.cookies.delete('google_oauth_state');
    return response;
  };

  if (error) return redirect('error');
  if (!code || !stateParam || !userId) return redirect('invalid-state');

  // Optionally verify state matches cookie (if same browser)
  const storedState = req.cookies.get('google_oauth_state')?.value;
  // Only validate cookie state if it exists (won't exist in external browser)
  if (storedState && storedState !== stateParam) return redirect('invalid-state');

  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || new URL('/api/integrations/google/callback', req.nextUrl.origin).toString();

  try {
    const tokens = await exchangeGoogleCode({ code, clientId, clientSecret, redirectUri });
    const profile = await fetchGmailProfile(tokens.access_token);
    const GoogleConnection = await getGoogleConnectionModel();
    const existing = await GoogleConnection.findOne({ owner_user_id: userId });

    await GoogleConnection.findOneAndUpdate(
      { owner_user_id: userId },
      {
        owner_user_id: userId,
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
