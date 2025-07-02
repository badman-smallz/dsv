import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  console.log('=== GET /api/chat/clients ===');
  
  try {
    // Verify authentication
    console.log('Checking session...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('Session user ID:', session.user.id);
    
    try {
      // Get user with role and conversations
      console.log('Fetching user data...');
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          // For admins: all their conversations where they are the admin
          adminConversations: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  status: true,
                  role: true,
                  createdAt: true,
                  updatedAt: true,
                }
              }
            }
          },
          // For clients: their conversation with admin
          clientConversations: {
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  createdAt: true,
                  updatedAt: true,
                }
              }
            }
          }
        }
      });
      
      if (!currentUser) {
        console.log('User not found');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      console.log('User role:', currentUser.role);

      let clients = [];
      
      if (currentUser.role === 'ADMIN') {
        // For admins, show all clients
        console.log('Fetching all clients...');
        const allClients = await prisma.user.findMany({
          where: {
            role: 'CLIENT',
            id: { not: currentUser.id },
          },
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            // Include conversation with the current admin
            clientConversations: {
              where: {
                adminId: currentUser.id,
              },
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        });

        clients = allClients.map(client => ({
          ...client,
          conversationId: client.clientConversations[0]?.id,
          clientConversations: undefined,
        }));
      } else {
        // For clients, only show their admin
        console.log('Fetching admin for client...');
        const adminConversations = currentUser.clientConversations || [];
        
        clients = adminConversations.map(conv => ({
          ...conv.admin,
          conversationId: conv.id,
          status: 'VERIFIED', // Admins are always verified
        }));
      }

      console.log(`Found ${clients.length} clients`);
      return NextResponse.json(clients);
      
    } catch (prismaError) {
      console.error('Prisma error:', prismaError);
      if (prismaError instanceof Error) {
        console.error('Prisma error details:', {
          name: prismaError.name,
          message: prismaError.message,
          stack: prismaError.stack
        });
      }
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
