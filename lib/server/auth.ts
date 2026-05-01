import { NextRequest, NextResponse } from 'next/server';
import getUserModel from '@/models/User';
import { verifyToken } from '@/lib/server/jwt';

export async function getCurrentUser(req: NextRequest) {
  const token =
    req.cookies.get('auth_token')?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return null;

  try {
    const payload = verifyToken(token);
    const User = await getUserModel();
    const user = await User.findById(payload.userId);
    if (!user) return null;
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };
  } catch {
    return null;
  }
}

export async function requireUser(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export function withAuth(handler: (req: NextRequest, user: { id: string; email: string; name?: string }) => Promise<NextResponse>) {
  return async function protectedHandler(req: NextRequest) {
    try {
      const user = await requireUser(req);
      return await handler(req, user);
    } catch (error: any) {
      if (error?.message === 'UNAUTHORIZED') {
        return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
      }
      return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
    }
  };
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.delete('auth_token');
  return response;
}

export function setAuthCookie(response: NextResponse, token: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
  return response;
}
