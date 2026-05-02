import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server/auth';
import getTransactionModel from '@/models/Transaction';

async function handler(req: NextRequest, user: { id: string }) {
  try {
    const Transaction = await getTransactionModel();

    if (req.method === 'GET') {
      const items = await Transaction.find({ owner_user_id: user.id, is_deleted: { $ne: true } }).sort({ date: -1 });
      return NextResponse.json({ success: true, data: items });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (Array.isArray(body)) {
        const created = [];
        for (const item of body) {
          const doc = await Transaction.create({ ...item, owner_user_id: user.id });
          created.push(doc);
        }
        return NextResponse.json({ success: true, data: created });
      }
      const item = await Transaction.create({ ...body, owner_user_id: user.id });
      return NextResponse.json({ success: true, data: item });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { _id, owner_user_id, ...update } = body;
      if (!_id) return NextResponse.json({ success: false, error: 'Missing _id' }, { status: 400 });
      const item = await Transaction.findOneAndUpdate({ _id, owner_user_id: user.id }, update, { new: true });
      return NextResponse.json({ success: true, data: item });
    }

    if (req.method === 'DELETE') {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
      await Transaction.findOneAndUpdate({ _id: id, owner_user_id: user.id }, { is_deleted: true });
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
