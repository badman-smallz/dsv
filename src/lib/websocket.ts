import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { NextApiResponse } from 'next';
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import type { Socket as NetSocket } from 'net';
import type { Server as IOServer } from 'socket.io';

const prisma = new PrismaClient();

export interface SocketServer extends HttpServer {
  io?: IOServer;
}

export interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

export interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

const ioHandler = (res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server...');
    
    const io = new Server(res.socket.server, {
      path: '/api/socket.io',
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          process.env.NEXTAUTH_URL
        ].filter(Boolean),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join a conversation
      socket.on('joinConversation', async ({ conversationId, userId }) => {
        socket.join(conversationId);
        console.log(`User ${userId} joined conversation ${conversationId}`);
        
        // Mark messages as read
        try {
          await prisma.message.updateMany({
            where: {
              conversationId,
              receiverId: userId,
              read: false,
            },
            data: { read: true },
          });
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      // Enhanced message handler with acknowledgment
      socket.on('sendMessage', async (message, callback) => {
        try {
          const savedMessage = await prisma.message.create({
            data: {
              content: message.content,
              sender: { connect: { id: message.senderId } },
              conversation: { connect: { id: message.conversationId } },
              receiver: { connect: { id: message.receiverId } },
              read: false,
            },
            include: {
              sender: { select: { id: true, name: true, email: true } },
            },
          });

          io.to(`conversation_${message.conversationId}`).emit('newMessage', savedMessage);
          callback({ status: 'success', messageId: savedMessage.id });
        } catch (error) {
          console.error('Error sending message:', error);
          callback({ status: 'error', error: 'Failed to send message' });
        }
      });

      // Handle typing indicator
      socket.on('typing', ({ conversationId, userId, isTyping }) => {
        socket.to(conversationId).emit('userTyping', { userId, isTyping });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });

    res.socket.server.io = io;
  } else {
    console.log('Socket.IO already initialized');
  }
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default ioHandler;
