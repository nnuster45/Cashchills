import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import getBudgetModel from '@/models/Budget';

async function handler(req: NextRequest, user: { id: string }) {
  try {
    const Budget = await getBudgetModel();

    if (req.method === 'GET') {
      const items = await Budget.find({ owner_user_id: user.id }).sort({ month_year: -1, category: 1 });
      return NextResponse.json({ success: true, data: items });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const item = await Budget.create({ ...body, owner_user_id: user.id });
      return NextResponse.json({ success: true, data: item });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { _id, owner_user_id, ...update } = body;
      if (!_id) return NextResponse.json({ success: false, error: 'Missing _id' }, { status: 400 });
      const item = await Budget.findOneAndUpdate({ _id, owner_user_id: user.id }, update, { new: true });
      return NextResponse.json({ success: true, data: item });
    }

    if (req.method === 'DELETE') {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
      await Budget.findOneAndDelete({ _id: id, owner_user_id: user.id });
      return NextResponse.json({ success: true, data: { deleted: id } });
    }

    return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

const protectedHandler = withAuth(handler);
export const GET = protectedHandler;
export const POST = protectedHandler;
export const PUT = protectedHandler;
export const DELETE = protectedHandler;
