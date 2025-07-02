import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

// Log function that only logs in development
const log = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Messages API]', ...args);
  }
};

// GET: fetch messages (paginated)
export async function GET(req: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const token = await getToken({ req });
    log('Token received:', token ? 'Yes' : 'No');
    
    if (!token || !token.sub) {
      log('Unauthorized: No token or user ID');
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    const userId = token.sub;
    const { conversationId } = params;
    
    if (!conversationId) {
      log('Missing conversation ID');
      return NextResponse.json({
        error: 'Conversation ID is required',
        code: 'INVALID_INPUT'
      }, { status: 400 });
    }
    
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));

    log(`Fetching messages for conversation ${conversationId}, user ${userId}, page ${page}, pageSize ${pageSize}`);
    
    // Access control: only participants of the conversation
    let conversation;
    try {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { 
          id: true,
          adminId: true, 
          clientId: true,
          admin: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } }
        },
      });
      
      if (!conversation) {
        log('Conversation not found:', conversationId);
        return NextResponse.json({ 
          error: 'Conversation not found',
          code: 'NOT_FOUND',
          details: `No conversation found with ID: ${conversationId}`
        }, { status: 404 });
      }
      
      if (conversation.adminId !== userId && conversation.clientId !== userId) {
        log('Access denied:', { userId, conversation });
        return NextResponse.json({ 
          error: 'You do not have permission to view these messages',
          code: 'FORBIDDEN',
          details: `User ${userId} is not a participant in conversation ${conversationId}`
        }, { status: 403 });
      }
    } catch (error) {
      log('Database error:', error);
      return NextResponse.json({
        error: 'Database error',
        code: 'DATABASE_ERROR',
        details: 'An error occurred while accessing conversation data'
      }, { status: 500 });
    }

    try {
      // Fetch messages paginated
      const messages = await prisma.message.findMany({
        where: { 
          conversationId,
          // Only include messages where the user is either sender or receiver
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          sender: {
            select: { id: true, name: true, email: true }
          },
          receiver: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      log(`Found ${messages.length} messages for conversation ${conversationId}`);
      
      // Get total count for pagination
      const totalCount = await prisma.message.count({
        where: { 
          conversationId,
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      });
      
      return NextResponse.json({
        data: messages.reverse(), // reverse for chronological order
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        error: 'Failed to fetch messages',
        code: 'DATABASE_ERROR'
      }, { status: 500 });
    }
    
  } catch (error) {
    log('Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const token = await getToken({ req });
  console.log('Token (messages PATCH):', token);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = token.sub;
  const { conversationId } = params;

  // Mark all received messages as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      receiverId: userId,
      read: false,
    },
    data: { read: true },
  });
  return NextResponse.json({ success: true });
}
