import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

interface SocketUser {
  userId: string;
  role: UserRole;
  socketId: string;
  connectedAt: Date;
  isOnline: boolean;
}

interface MessageData {
  to: string;
  content: string;
  conversationId?: string;
}

export class SocketIOServer {
  private io: Server;
  private httpServer: HttpServer;
  private adminId: string | null = null;
  private activeUsers: Map<string, SocketUser> = new Map();
  private messageQueue: Map<string, Array<{to: string, message: any}>> = new Map();

  constructor(httpServer: HttpServer) {
    this.httpServer = httpServer;
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://yourdomain.com'] 
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 10000,
      pingInterval: 5000,
    });

    this.initializeAdminId();
    this.initializeSocket();
  }

  private async initializeAdminId() {
    try {
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true }
      });
      this.adminId = admin?.id || null;
      console.log(`[Socket] Admin ID set to: ${this.adminId}`);
    } catch (error) {
      console.error('[Socket] Error fetching admin ID:', error);
    }
  }

  private initializeSocket() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      const { userId, token } = socket.handshake.auth;
      
      if (!userId || !token) {
        console.log(`[Socket] Authentication failed - missing credentials`);
        return next(new Error('Authentication failed'));
      }

      try {
        // Verify user exists and token is valid
        const user = await prisma.user.findUnique({
          where: { id: userId, isVerified: true },
          select: { id: true, role: true, email: true }
        });

        if (!user) {
          console.log(`[Socket] User not found or not verified: ${userId}`);
          return next(new Error('User not found or not verified'));
        }

        // Store user data in socket
        socket.data.user = {
          id: user.id,
          role: user.role,
          email: user.email
        };

        next();
      } catch (error) {
        console.error('[Socket] Auth error:', error);
        next(new Error('Authentication error'));
      }
    });

    // Handle connections
    this.io.on('connection', (socket) => {
      const { id: socketId } = socket;
      const { id: userId, role } = socket.data.user;
      
      console.log(`[Socket] New connection: ${socketId} (User: ${userId}, Role: ${role})`);

      // Add user to active users
      this.activeUsers.set(userId, {
        userId,
        role,
        socketId,
        connectedAt: new Date(),
        isOnline: true
      });

      // Notify user of successful connection
      socket.emit('connection_established', { 
        userId,
        isAdmin: role === 'ADMIN',
        adminId: this.adminId
      });

      // Handle sending messages
      socket.on('send_message', async (data: MessageData, callback: Function) => {
        try {
          const { to, content } = data;
          const from = userId;
          
          if (!to || !content) {
            throw new Error('Missing required fields');
          }

          // Verify the recipient exists and is valid
          const recipient = await prisma.user.findUnique({
            where: { id: to, isVerified: true },
            select: { id: true }
          });

          if (!recipient) {
            throw new Error('Recipient not found or not verified');
          }

          // Save message to database
          const message = await prisma.message.create({
            data: {
              content,
              senderId: from,
              receiverId: to,
              isRead: false
            },
            include: {
              sender: {
                select: { id: true, name: true, email: true, role: true }
              },
              receiver: {
                select: { id: true, name: true, email: true, role: true }
              }
            }
          });

          // Prepare message data
          const messageData = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            receiverId: message.receiverId,
            createdAt: message.createdAt,
            isRead: message.isRead,
            sender: message.sender,
            receiver: message.receiver
          };

          // Check if recipient is online
          const recipientData = this.activeUsers.get(to);
          
          if (recipientData && recipientData.isOnline) {
            // Send message directly to online user
            this.io.to(recipientData.socketId).emit('new_message', messageData);
          } else {
            // Queue message for offline user
            if (!this.messageQueue.has(to)) {
              this.messageQueue.set(to, []);
            }
            this.messageQueue.get(to)?.push({
              to,
              message: messageData
            });
          }

          // Send delivery confirmation to sender
          callback({
            status: 'delivered',
            message: messageData,
            timestamp: new Date().toISOString()
          });

        } catch (error: any) {
          console.error(`[Socket] Error sending message:`, error);
          callback({
            status: 'error',
            error: error.message || 'Failed to send message'
          });
        }
      });

      // Handle message read status
      socket.on('mark_as_read', async (messageIds: string[], callback: Function) => {
        try {
          await prisma.message.updateMany({
            where: {
              id: { in: messageIds },
              receiverId: userId
            },
            data: { isRead: true }
          });

          callback({ status: 'success' });
        } catch (error) {
          console.error(`[Socket] Error marking messages as read:`, error);
          callback({ status: 'error' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${userId} (${socketId})`);
        
        // Mark user as offline but keep in activeUsers for message queuing
        const user = this.activeUsers.get(userId);
        if (user) {
          this.activeUsers.set(userId, { ...user, isOnline: false });
        }
      });

      // Send any queued messages when user reconnects
      if (this.messageQueue.has(userId)) {
        const queuedMessages = this.messageQueue.get(userId) || [];
        if (queuedMessages.length > 0) {
          console.log(`[Socket] Sending ${queuedMessages.length} queued messages to ${userId}`);
          queuedMessages.forEach(({ message }) => {
            socket.emit('new_message', message);
          });
          this.messageQueue.delete(userId);
        }
      }
    });
  }

  public start() {
    console.log('[Socket] WebSocket server started');
  }

  public stop() {
    this.io.close(() => {
      console.log('[Socket] WebSocket server stopped');
    });
  }
}

export default SocketIOServer;
