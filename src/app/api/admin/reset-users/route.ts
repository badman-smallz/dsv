import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession({ req, ...authOptions });
    console.log('Session in reset-users:', session);
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete related records first due to FK constraints
    // Factory reset: delete all data in correct order
    try {
      await prisma.message.deleteMany({});
      console.log('Deleted all messages');
    } catch (err) {
      console.error('Failed to delete messages:', err);
      return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
    }
    try {
      await prisma.conversationParticipants.deleteMany({});
      console.log('Deleted all conversation participants');
    } catch (err) {
      console.error('Failed to delete conversation participants:', err);
      return NextResponse.json({ error: 'Failed to delete conversation participants' }, { status: 500 });
    }
    try {
      await prisma.conversation.deleteMany({});
      console.log('Deleted all conversations');
    } catch (err) {
      console.error('Failed to delete conversations:', err);
      return NextResponse.json({ error: 'Failed to delete conversations' }, { status: 500 });
    }
    try {
      await prisma.delivery.deleteMany({});
      console.log('Deleted all deliveries');
    } catch (err) {
      console.error('Failed to delete deliveries:', err);
      return NextResponse.json({ error: 'Failed to delete deliveries' }, { status: 500 });
    }
    try {
      await prisma.user.deleteMany({});
      console.log('Deleted all users');
    } catch (err) {
      console.error('Failed to delete users:', err);
      return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 });
    }
    // If you add more models in the future, add them here in the correct order.


    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
