import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  return NextResponse.json({ user });
}
