import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPrismaClient } from '@/lib/prisma';

// Initialize Prisma client with error handling
const prisma = getPrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('Fetching conversation with ID:', params.id);
  
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'Authenticated' : 'Not authenticated');
    
    if (!session?.user?.id) {
      console.error('Unauthorized: No user session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate conversation ID format
    if (!params.id || typeof params.id !== 'string') {
      console.error('Invalid conversation ID:', params.id);
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }

    // Fetch conversation with related data
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        adminId: true,
        clientId: true,
        admin: {
          select: { id: true, name: true, email: true }
        },
        client: {
          select: { id: true, name: true, email: true }
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 20,
          include: {
            sender: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!conversation) {
      console.error('Conversation not found:', params.id);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Check if the current user is part of the conversation
    const isAdmin = conversation.adminId === session.user.id;
    const isClient = conversation.clientId === session.user.id;
    
    if (!isAdmin && !isClient) {
      console.error('Unauthorized access attempt:', {
        userId: session.user.id,
        conversationId: params.id,
        adminId: conversation.adminId,
        clientId: conversation.clientId
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    console.log('Successfully fetched conversation:', params.id);
    return NextResponse.json(conversation);
    
  } catch (error) {
    console.error('Error in GET /api/chat/conversations/[id]:', error);
    
    // More specific error handling
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Handle Prisma errors
      if (error.name.includes('Prisma') || error.message.includes('prisma')) {
        errorMessage = 'Database error occurred';
        statusCode = 503; // Service Unavailable
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined
      },
      { status: statusCode }
    );
  }
}
