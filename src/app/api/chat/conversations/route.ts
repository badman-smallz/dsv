import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch all conversations for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Fetch all conversations for this user (admin or client)
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { adminId: userId },
          { clientId: userId },
        ],
      },
      include: {
        messages: {
          select: {
            id: true,
            read: true,
            receiverId: true,
          },
        },
        admin: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate unread count for each conversation
    const data = conversations.map((conv) => {
      const unread = conv.messages.filter(
        (m) => m.receiverId === userId && !m.read
      ).length;
      return {
        id: conv.id,
        admin: conv.admin,
        client: conv.client,
        unread,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new conversation or return existing one
export async function POST(req: NextRequest) {
  console.log('=== New Conversation Request ===');
  try {
    const session = await getServerSession(authOptions);
    console.log('Session data:', session);
    
    if (!session?.user) {
      console.log('Unauthorized: No user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user ID from the session
    const currentUserId = session.user.id;
    
    if (!currentUserId) {
      console.error('No user ID found in session');
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }

    const body = await req.json();
    console.log('Request body:', body);
    
    if (!body || !body.participantId) {
      console.error('No participant ID provided in request body');
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }
    
    const { participantId } = body;
    
    console.log('Current user ID:', currentUserId);
    console.log('Participant ID:', participantId);
    
    if (!participantId) {
      console.error('Validation error: Participant ID is required');
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }

    // Get the current user's role
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true }
    });

    // Get the participant's verification status
    const participant = await prisma.user.findUnique({
      where: { id: participantId },
      select: { status: true, role: true }
    });

    if (!participant) {
      console.error('Participant not found');
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // If the participant is a client and not verified, don't allow conversation
    if (participant.role === 'CLIENT' && participant.status !== 'VERIFIED') {
      console.error('Cannot start conversation with unverified client');
      return NextResponse.json(
        { error: 'Cannot start conversation with unverified client' },
        { status: 403 }
      );
    }

    // Check if a conversation already exists between these users
    console.log('Checking for existing conversation...');
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { 
            AND: [
              { adminId: currentUserId },
              { clientId: participantId }
            ]
          },
          { 
            AND: [
              { adminId: participantId },
              { clientId: currentUserId }
            ]
          },
        ],
      },
      select: {
        id: true,
        adminId: true,
        clientId: true,
        createdAt: true,
        updatedAt: true
      },
    });
    
    console.log('Existing conversation check result:', existingConversation ? 'Found' : 'Not found');

    if (existingConversation) {
      // Return 409 Conflict with the existing conversation ID
      return NextResponse.json(
        {
          error: 'Conversation already exists',
          id: existingConversation.id,
          existingConversation
        },
        { status: 409 }
      );
    }

    // Determine who is the admin and who is the client
    // For now, let's make the current user always the admin and the participant the client
    // This is a simplification - you might want to change this based on your business logic
    const adminId = currentUserId;
    const clientId = participantId;
    
    console.log('Admin ID (current user):', adminId);
    console.log('Client ID (participant):', clientId);
    
    if (!adminId || !clientId) {
      throw new Error('Missing required user IDs for conversation');
    }

    // Create a new conversation
    console.log('Creating new conversation...');
    console.log('Admin ID:', adminId);
    console.log('Client ID:', clientId);
      
    try {
      // Start a transaction to ensure data consistency
      const [newConversation] = await prisma.$transaction([
        prisma.conversation.create({
          data: {
            admin: { connect: { id: adminId } },
            client: { connect: { id: clientId } },
          },
          select: {
            id: true,
            adminId: true,
            clientId: true,
            createdAt: true,
            updatedAt: true
          },
        }),
        // Update both users to ensure they have the latest conversation reference
        prisma.user.update({
          where: { id: adminId },
          data: { updatedAt: new Date() }
        }),
        prisma.user.update({
          where: { id: clientId },
          data: { updatedAt: new Date() }
        })
      ]);
        
      console.log('New conversation created:', newConversation);
      return NextResponse.json(newConversation);
      
    } catch (error) {
      console.error('Error creating conversation in database:', error);
      
      // Handle Prisma errors
      if (error instanceof Error && 'code' in error) {
        // Handle specific Prisma errors
        if (error.code === 'P2002') {
          // Try to find the existing conversation
          const existingConversation = await prisma.conversation.findFirst({
            where: {
              OR: [
                { adminId, clientId },
                { adminId: clientId, clientId: adminId }
              ]
            },
            select: {
              id: true,
              adminId: true,
              clientId: true,
              createdAt: true,
              updatedAt: true
            },
          });
          
          if (existingConversation) {
            return NextResponse.json(
              {
                error: 'A conversation between these users already exists',
                id: existingConversation.id,
                existingConversation
              },
              { status: 409 }
            );
          }
          
          return NextResponse.json(
            { error: 'A conversation between these users already exists' },
            { status: 409 }
          );
        }
        
        if (error.code === 'P2025') {
          return NextResponse.json(
            { error: 'One of the users does not exist' },
            { status: 404 }
          );
        }
      }
      
      // Handle validation errors
      if (error instanceof Error && error.message.includes('required')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      // Default error response
      return NextResponse.json(
        { 
          error: 'Failed to create conversation',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
