import { NextRequest, NextResponse } from 'next/server';
import getUserModel from '@/models/User';
import { hashPassword } from '@/lib/server/password';
import { signToken } from '@/lib/server/jwt';
import { setAuthCookie } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  const channelId = process.env.LINE_CHANNEL_ID || '';
  if (!channelId) {
    return NextResponse.json({ success: false, error: 'LINE_CHANNEL_ID is not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const idToken = body?.idToken;

    if (!idToken) {
      return NextResponse.json({ success: false, error: 'Missing LINE ID token' }, { status: 400 });
    }

    const verifyResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: channelId,
      }),
    });

    if (!verifyResponse.ok) {
      return NextResponse.json({ success: false, error: 'LINE token verification failed' }, { status: 401 });
    }

    const verified = await verifyResponse.json();
    const email = verified?.email || `line-${verified?.sub}@line.local`;
    const name = verified?.name || 'LINE User';

    const User = await getUserModel();
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      const randomPassword = await hashPassword(`line-${crypto.randomUUID()}`);
      user = await User.create({
        email: email.toLowerCase(),
        password: randomPassword,
        name,
      });
    } else if (!user.name && name) {
      user.name = name;
      await user.save();
    }

    const token = signToken({ userId: user._id.toString(), email: user.email });
    const response = NextResponse.json({
      success: true,
      user: { id: user._id.toString(), email: user.email, name: user.name },
      line: {
        sub: verified?.sub,
        displayName: verified?.name,
        picture: verified?.picture,
      },
    });

    return setAuthCookie(response, token);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unable to login with LINE' }, { status: 500 });
  }
}
