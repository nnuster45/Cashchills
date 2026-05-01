import { NextRequest, NextResponse } from 'next/server';
import getUserModel from '@/models/User';
import { verifyPassword } from '@/lib/server/password';
import { setAuthCookie } from '@/lib/server/auth';
import { signToken } from '@/lib/server/jwt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const User = await getUserModel();
    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken({ userId: user._id.toString(), email: user.email });
    const response = NextResponse.json({
      success: true,
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });
    return setAuthCookie(response, token);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to login' }, { status: 500 });
  }
}
