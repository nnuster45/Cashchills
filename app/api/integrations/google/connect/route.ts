import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import { buildGoogleAuthUrl } from '@/lib/googleGmail';

async function handler(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    return NextResponse.json({ success: false, error: 'Google OAuth is not configured on the server' }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const rawReturnTo = req.nextUrl.searchParams.get('returnTo') || '/';
  const returnTo = rawReturnTo.startsWith('/') ? rawReturnTo : '/';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || new URL('/api/integrations/google/callback', req.nextUrl.origin).toString();
  
  const servicesParam = req.nextUrl.searchParams.get('services');
  const requestedServices = servicesParam ? servicesParam.split(',') : ['gmail'];

  const response = NextResponse.redirect(buildGoogleAuthUrl({ clientId, redirectUri, state, requestedServices }));
  response.cookies.set('google_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 10 * 60 });
  response.cookies.set('google_oauth_return_to', returnTo, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 10 * 60 });
  return response;
}

export const GET = withAuth(handler);
