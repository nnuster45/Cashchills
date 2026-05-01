import { NextRequest, NextResponse } from 'next/server';
import getUserModel from '@/models/User';
import { hashPassword } from '@/lib/server/password';
import { setAuthCookie } from '@/lib/server/auth';
import { signToken } from '@/lib/server/jwt';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const User = await getUserModel();
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Unable to create account. Please try a different email.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email: String(email).toLowerCase(),
      password: hashedPassword,
      name: name || undefined,
    });

    const token = signToken({ userId: user._id.toString(), email: user.email });
    const response = NextResponse.json({
      success: true,
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });
    return setAuthCookie(response, token);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to register' }, { status: 500 });
  }
}
