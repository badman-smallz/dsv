import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { PrismaClient, UserRole, User } from '@prisma/client';

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
  private activeConnections: Map<string, { userId: string; role: string }> = new Map();

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
      this.adminId = null;
    }
  }

  constructor(httpServer: HttpServer) {
    this.httpServer = httpServer;
    
    // Configure CORS based on environment
    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, success: boolean) => void) => {
        const allowedOrigins = [
          'http://localhost:3000',
          'ws://localhost:3000',
          'http://localhost:3001',
          'ws://localhost:3001',
          process.env.NEXT_PUBLIC_SITE_URL,
          process.env.NEXT_PUBLIC_WS_URL
        ].filter(Boolean) as string[];

        // Allow connections with no origin (like mobile apps or curl requests)
        if (!origin) {
          console.log('[Socket] Allowing connection with no origin (non-browser client)');
            return callback(null, true);
          }
          
        // Check if the origin is allowed
        const isAllowed = allowedOrigins.some(allowed => 
          origin === allowed || 
          origin.startsWith(allowed.replace(/^http/, 'ws')) ||
          origin.startsWith(allowed.replace(/^ws/, 'http'))
        );

        if (isAllowed) {
          console.log(`[Socket] Allowed origin: ${origin}`);
            return callback(null, true);
          }

        console.warn(`[Socket] Blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-socket-id'],
      credentials: true,
      exposedHeaders: ['x-socket-id']
    };

    // Initialize Socket.IO server
    this.io = new Server(httpServer, {
      cors: corsOptions,
      path: '/socket.io/',
      transports: ['websocket'],
      pingTimeout: 10000,
      pingInterval: 5000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e8, // 100MB
      cookie: process.env.NODE_ENV === 'production',
      perMessageDeflate: {
        threshold: 1024,
        serverNoContextTakeover: true,
        clientNoContextTakeover: true,
        zlibDeflateOptions: {
          level: 3
        }
      },
      // Remove unsupported option
      // allowHTTP1: true,
      // Custom request handling
      allowRequest: (req: any, callback: (err: string | null | undefined, success: boolean) => void) => {
        // Log incoming connection attempts
        const origin = req.headers.origin || req.headers.host;
        console.log(`[Socket] New connection from: ${origin} (${req.headers['user-agent']})`);
        
        // Add any additional request validation here
        callback(null, true);
      },
      // Enable connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true
      }
    });

    // Initialize socket handlers
    this.initializeSocket();
  }

  private initializeSocket() {
    // Log when a client connects
    this.io.on('connection', (socket) => {
      console.log(`[Socket] New connection - ID: ${socket.id}`);
      console.log(`[Socket] Handshake headers:`, socket.handshake.headers);
      console.log(`[Socket] Handshake auth:`, socket.handshake.auth);
      
      // Log transport information
      console.log(`[Socket] Transport: ${socket.conn.transport.name}`);
      
      // Log transport upgrade
      socket.conn.on('upgrade', (transport) => {
        console.log(`[Socket] Transport upgraded to: ${transport.name}`);
      });
      
      // Log disconnection
      socket.on('disconnect', (reason) => {
        console.log(`[Socket] Disconnected - ID: ${socket.id}, Reason: ${reason}`);
      });
      
      // Log errors
      socket.on('error', (error) => {
        console.error(`[Socket] Error - ID: ${socket.id}:`, error);
      });
    });
    
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const { userId, role } = socket.handshake.auth;
        
        console.log(`[Socket] Authentication attempt - ID: ${socket.id}, User: ${userId}, Role: ${role}`);
        
        if (!userId || !role) {
          const error = 'Authentication failed: Missing userId or role';
          console.error(`[Socket] ${error}`);
          return next(new Error(error));
        }

        // Validate user exists (optional)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, status: true }
        });

        if (!user) {
          console.error(`User not found: ${userId}`);
          return next(new Error('Authentication error: User not found'));
        }

        // Store user info in the socket
        socket.data = {
          ...socket.data,
          userId: user.id,
          role: user.role,
          status: user.status,
          connectedAt: new Date()
        };
        
        console.log(`Authenticated user: ${userId} (${role})`);
        next();
      } catch (error) {
        console.error('Authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`[Socket] New connection: ${socket.id} (User: ${socket.data.userId}, Role: ${socket.data.role})`);

      // Track the connection with additional metadata
      this.activeConnections.set(socket.id, {
        userId: socket.data.userId,
        role: socket.data.role
      });

      // Log all events for debugging
      socket.onAny((event, ...args) => {
        console.log(`[Socket] Event received: ${event}`, args);
      });

      const userId = socket.data.userId;
      const socketId = socket.id;
      
      if (!userId) {
        console.error('No userId found for socket:', socketId);
        return socket.disconnect(true);
      }
      
      try {
        // Join user's personal room
        socket.join(userId);
        
        // Update active connections with socket reference
        this.activeConnections.set(socketId, {
          userId,
          role: socket.data.role
        });
        
        console.log(`User connected: ${socketId} (${userId})`);
        
        // Notify user of successful connection
        socket.emit('connection_established', { 
          socketId,
          userId,
          timestamp: new Date().toISOString() 
        });
        
        // Handle disconnection
        socket.on('disconnect', (reason) => {
          console.log(`User disconnected: ${socketId} (${userId}) - Reason: ${reason}`);
          this.activeConnections.delete(socketId);
          
          // Clean up any conversation rooms
          const rooms = Array.from(socket.rooms);
          rooms.forEach(room => {
            if (room !== socketId) {
              socket.leave(room);
            }
          });
        });

        // Enhanced joinConversation handler
        socket.on('joinConversation', async (data: any, callback: (response: any) => void) => {
          // Ensure callback is a function
          const cb = typeof callback === 'function' ? callback : () => {};
          
          try {
            console.log('=== SOCKET SERVER === joinConversation event ===');
            console.log('Socket data:', JSON.stringify(socket.data, null, 2));
            console.log('Raw join data:', JSON.stringify(data, null, 2));
            
            // Handle different data formats
            const conversationId = data?.conversationId || data;
            const userId = socket.data?.userId || data?.userId;
            const userRole = socket.data?.role || data?.role;
            
            console.log('Processed IDs:', { conversationId, userId, userRole });
            
            if (!conversationId) {
              const error = { status: 'error', code: 'INVALID_REQUEST', message: 'No conversationId provided' };
              console.error('No conversationId provided in data:', error);
              return cb(error);
            }
            
            if (!userId) {
              const error = { status: 'error', code: 'UNAUTHORIZED', message: 'User not authenticated' };
              console.error('No userId found:', error);
              return cb(error);
            }
            
            console.log(`User ${userId} (${userRole}) joining conversation ${conversationId}`);
            
            // Verify conversation exists and user is a participant
            let conversation;
            try {
              console.log(`[Socket] Fetching conversation ${conversationId} for user ${userId}`);
              conversation = await prisma.conversation.findUnique({
              where: { id: conversationId },
                include: { 
                  messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: {
                      sender: { select: { id: true, name: true } },
                      receiver: { select: { id: true, name: true } }
                    }
                  },
                  admin: { select: { id: true, name: true } },
                  client: { select: { id: true, name: true } }
                }
              });
              console.log(`[Socket] Conversation data:`, JSON.stringify(conversation, null, 2));
            } catch (error) {
              console.error(`[Socket] Error fetching conversation ${conversationId}:`, error);
              return cb({ 
                status: 'error', 
                code: 'DATABASE_ERROR',
                message: 'Error fetching conversation',
                details: error instanceof Error ? error.message : 'Unknown error'
              });
            }

            if (!conversation) {
              console.error(`[Socket] Conversation ${conversationId} not found`);
              return cb({ 
                status: 'error', 
                code: 'CONVERSATION_NOT_FOUND',
                message: 'Conversation not found',
                conversationId,
                userId
              });
            }

            // Extract admin and client IDs safely
            const adminId = conversation.admin?.id;
            const clientId = conversation.client?.id;
            const currentUserId = userId;

            console.log(`[Socket] Conversation participants:`, {
              adminId,
              clientId,
              currentUserId,
              conversationId
            });

            if (!adminId || !clientId) {
              const error = {
                status: 'error', 
                code: 'INVALID_CONVERSATION',
                message: 'Invalid conversation data',
                conversation: { 
                  id: conversationId,
                  adminId,
                  clientId,
                  hasAdmin: !!conversation.admin,
                  hasClient: !!conversation.client
                }
              };
              console.error(`[Socket] Invalid conversation data:`, error);
              return cb(error);
            }

            const isAdmin = currentUserId === adminId;
            const isClient = currentUserId === clientId;
            
            if (!isAdmin && !isClient) {
              console.error(`[Socket] User ${currentUserId} unauthorized for conversation ${conversationId}`);
              return cb({ 
                status: 'error', 
                code: 'UNAUTHORIZED',
                message: 'You are not a participant in this conversation',
                conversationId,
                currentUserId,
                adminId,
                clientId
              });
            }

            const roomName = `conversation_${conversationId}`;
            console.log(`[Socket] Attempting to join room: ${roomName}`);
            
            // Leave any existing conversation rooms
            const currentRooms = Array.from(socket.rooms).filter(room => 
              room.startsWith('conversation_') && room !== roomName
            );
            
            for (const room of currentRooms) {
              console.log(`[Socket] Leaving room: ${room}`);
              socket.leave(room);
            }
            
            // Join the new room
            try {
              await new Promise<void>((resolve, reject) => {
                socket.join(roomName, (err) => {
                  if (err) {
                    console.error(`[Socket] Error joining room ${roomName}:`, err);
                    return reject(new Error(`Failed to join room: ${err.message}`));
                  }
                  console.log(`[Socket] User ${socket.data.userId} (${socket.data.role}) joined room ${roomName}`);
                  resolve();
                });
              });
            } catch (error) {
              console.error(`[Socket] Error in room join promise:`, error);
              return cb({ 
                status: 'error', 
                code: 'JOIN_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error joining room',
                room: roomName,
                userId: socket.data.userId
              });
            }
            
            try {
              // Get all sockets in this room (single source of truth)
              const socketsInRoom = await this.io.in(roomName).fetchSockets();
              const members = socketsInRoom.map(s => ({
                id: s.data.userId,
                role: s.data.role,
                socketId: s.id
              }));
              
              console.log(`[Socket] Room ${roomName} now has ${members.length} members`);
              
              // Format messages for the client with complete user info
              const formattedMessages = (conversation.messages || []).map(msg => {
                const sender = msg.sender || { id: msg.senderId, name: 'Unknown', email: null, role: 'USER' };
                const receiver = msg.receiver || { id: msg.receiverId, name: 'Unknown', email: null, role: 'USER' };
                
                return {
                  id: msg.id,
                  content: msg.content,
                  senderId: sender.id,
                  receiverId: receiver.id,
                  conversationId: conversationId,
                  timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
                  read: msg.read || false,
                  sender: {
                    id: sender.id,
                    name: sender.name || sender.email?.split('@')[0] || 'User',
                    email: sender.email || null,
                    role: sender.role || 'USER'
                  },
                  receiver: {
                    id: receiver.id,
                    name: receiver.name || receiver.email?.split('@')[0] || 'User',
                    email: receiver.email || null,
                    role: receiver.role || 'USER'
                  }
                };
              });
              
              // Prepare user data for the response
              const adminUser = {
                id: conversation.admin.id,
                name: conversation.admin.name || conversation.admin.email?.split('@')[0] || 'Admin',
                email: conversation.admin.email || null,
                role: 'ADMIN' as const
              };
              
              const clientUser = {
                id: conversation.client.id,
                name: conversation.client.name || conversation.client.email?.split('@')[0] || 'Client',
                email: conversation.client.email || null,
                role: 'CLIENT' as const
              };
              
              // Send success response with room info
              const response = { 
                status: 'success' as const,
                room: roomName,
                members: members.map(m => ({ id: m.id, role: m.role })),
                previousMessages: formattedMessages,
                conversation: {
                  id: conversation.id,
                  admin: adminUser,
                  client: clientUser,
                  createdAt: conversation.createdAt?.toISOString() || new Date().toISOString(),
                  updatedAt: conversation.updatedAt?.toISOString() || new Date().toISOString()
                }
              };
              
              console.log('[Socket] Prepared join response with conversation data:', {
                admin: { id: adminUser.id, name: adminUser.name },
                client: { id: clientUser.id, name: clientUser.name },
                messageCount: formattedMessages.length,
                room: roomName,
                memberCount: members.length
              });
              
              // Ensure callback is a function before calling it
              if (typeof callback === 'function') {
                try {
                  callback(response);
                  console.log('[Socket] Successfully called joinConversation callback');
                } catch (callbackError) {
                  console.error('[Socket] Error in joinConversation callback:', callbackError);
                  socket.emit('error', { 
                    code: 'CALLBACK_ERROR', 
                    message: 'Error in joinConversation callback',
                    details: callbackError instanceof Error ? callbackError.message : 'Unknown error'
                  });
                }
              } else {
                console.error('[Socket] joinConversation callback is not a function');
                socket.emit('error', { 
                  code: 'INVALID_CALLBACK', 
                  message: 'joinConversation callback is not a function' 
                });
              }
            } catch (error) {
              console.error('[Socket] Error getting room info:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              const errorStack = error instanceof Error ? error.stack : undefined;
              
              console.error(`[Socket] Error details:`, {
                message: errorMessage,
                stack: errorStack,
                room: roomName,
                userId: socket.data.userId
              });
              
              callback({ 
                status: 'error', 
                code: 'ROOM_ERROR',
                message: `Failed to get room info: ${errorMessage}`,
                details: process.env.NODE_ENV === 'development' ? errorStack : undefined
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            
            console.error(`[Socket] Error joining conversation ${conversationId}:`, {
              message: errorMessage,
              stack: errorStack,
              userId: socket.data?.userId,
              conversationId
            });
            
            callback({ 
              status: 'error', 
              code: 'INTERNAL_ERROR',
              message: `Failed to join conversation: ${errorMessage}`,
              details: process.env.NODE_ENV === 'development' ? errorStack : undefined
            });
          }
        });

        // Admin-only action handler
        socket.on('adminAction', (data, callback) => {
          if (socket.data.role !== 'ADMIN') {
            console.error(`[Socket] Unauthorized admin action by user ${socket.data.userId}`);
            return callback({ status: 'error', code: 'ADMIN_ONLY' });
          }
          console.log(`[Socket] Admin action by user ${socket.data.userId}`, data);
          callback({ status: 'success' });
        });

        // Handle sending a message
        socket.on('sendMessage', async (message, callback) => {
          console.log('=== SOCKET SERVER === Received sendMessage event ===');
          console.log('Message details:', JSON.stringify(message, null, 2));
          console.log('Socket user:', socket.data.userId, 'role:', socket.data.role);
          console.log('Active users:', Array.from(this.activeUsers.keys()));
          
          try {
            const { conversationId, content, senderId, receiverId } = message;
            
            // Input validation
            if (!conversationId || !content || !senderId || !receiverId) {
              const error = new Error('Missing required message fields');
              console.error('Validation error:', error.message, { conversationId, content, senderId, receiverId });
              
              if (typeof callback === 'function') {
                callback({ 
                  status: 'error', 
                code: 'INVALID_MESSAGE',
                message: 'Missing required message fields' 
              });
              }
              return;
            }
            
            console.log('Saving message to database...');
            
            // Save message to database
            const savedMessage = await prisma.message.create({
              data: {
                content,
                sender: { connect: { id: senderId } },
                receiver: { connect: { id: receiverId } },
                conversation: { connect: { id: conversationId } },
                read: false,
              },
              include: {
                sender: {
                  select: { id: true, name: true, email: true },
                },
                receiver: {
                  select: { id: true, name: true, email: true },
                },
              },
            });

            console.log('Message saved to database:', savedMessage);
            
            // Format the message for the client
            const formattedMessage = {
              ...savedMessage,
              timestamp: savedMessage.timestamp.toISOString()
            };
            
            // Emit the message to the conversation room
            const roomName = `conversation_${conversationId}`;
            const roomSockets = await this.io.in(roomName).fetchSockets();
            console.log(`=== SOCKET SERVER === Emitting newMessage to room: ${roomName} ===`);
            console.log(`Room has ${roomSockets.length} connected clients`);
            roomSockets.forEach(s => {
              console.log(`- Socket ${s.id} (user: ${s.data.userId}, role: ${s.data.role})`);
            });
            
            this.io.to(roomName).emit('newMessage', formattedMessage);
            console.log('Emitted message:', JSON.stringify({
              id: formattedMessage.id,
              content: formattedMessage.content,
              senderId: formattedMessage.senderId,
              timestamp: formattedMessage.timestamp
            }, null, 2));
            
            // Also send to the receiver's personal room if they're not in the conversation
            this.io.to(`user_${receiverId}`).emit('newMessage', formattedMessage);
            console.log(`Emitted newMessage to user_${receiverId}`);
            
            // Send delivery receipt to sender
            socket.emit('messageDelivered', {
              messageId: savedMessage.id,
              timestamp: new Date().toISOString(),
            });
            console.log('Sent messageDelivered receipt to sender');
            
            // Acknowledge the message was sent successfully
            if (typeof callback === 'function') {
              callback({ 
                status: 'success',
                messageId: savedMessage.id,
                timestamp: new Date().toISOString()
              });
            }
            
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error in sendMessage handler:', errorMessage);
            
            // Send error to the client
            if (typeof callback === 'function') {
              callback({ 
                status: 'error',
                code: 'MESSAGE_SEND_FAILED',
                message: 'Failed to send message',
                details: errorMessage 
              });
            }
            
            // Also emit a general error event
            socket.emit('error', { 
              code: 'MESSAGE_SEND_FAILED',
              message: 'Failed to send message',
              details: errorMessage 
            });
          }
        });

        // Handle typing indicator
        socket.on('typing', ({ conversationId, isTyping }) => {
          socket.to(`conversation_${conversationId}`).emit('userTyping', {
            userId,
            isTyping,
            conversationId,
          });
        });
      } catch (error) {
        console.error('Error handling socket connection:', error);
      }
    });
  }

  private processQueuedMessages(userId: string, socket: Socket) {
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
  }
  
  private async isUserActive(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true }
      });
      return user?.status === 'ACTIVE';
    } catch (error) {
      console.error(`[Socket] Error checking user status for ${userId}:`, error);
      return false;
    }
  }

  private handleSendMessage(socket: Socket) {
    return async (data: MessageData, callback: Function) => {
      const { to, content, conversationId } = data;
      const from = socket.handshake.auth.userId;
      
      if (!to || !content) {
        return callback({
          status: 'error',
          error: 'Missing required fields'
        });
      }

      try {
        // Verify the recipient exists and is active
        const isRecipientActive = await this.isUserActive(to);
        if (!isRecipientActive) {
          return callback({
            status: 'error',
            error: 'Recipient not found or not active'
          });
        }

        // Prepare message data for database
        const messageData: any = {
          content,
          senderId: from,
          receiverId: to,
          read: false,
          timestamp: new Date()
        };

        // Only add conversation if it exists
        if (conversationId) {
          messageData.conversation = {
            connect: { id: conversationId }
          };
        }

        // Save message to database
        const message = await prisma.message.create({
          data: messageData,
          include: {
            sender: {
              select: { id: true, name: true, email: true, role: true }
            },
            receiver: {
              select: { id: true, name: true, email: true, role: true }
            },
            conversation: conversationId ? { select: { id: true } } : undefined
          }
        });

        // Prepare message data for the client
        const clientMessage = {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          receiverId: message.receiverId,
          conversationId: message.conversationId || null,
          timestamp: message.timestamp || new Date(),
          read: message.read || false,
          sender: (message as any).sender,
          receiver: (message as any).receiver
        };

        // Check if recipient is online
        const recipientData = this.activeUsers.get(to);
        
        if (recipientData && recipientData.isOnline) {
          // Find the recipient's socket
          const recipientSocket = this.activeConnections.get(recipientData.socketId);
          if (recipientSocket) {
            recipientSocket.emit('new_message', clientMessage);
          }
        } else {
          // Queue message for offline user
          if (!this.messageQueue.has(to)) {
            this.messageQueue.set(to, []);
          }
          this.messageQueue.get(to)?.push({
            to,
            message: clientMessage
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
    };
  }

  public async start() {
    console.log('[Socket] WebSocket server started');
    
    try {
      // Initialize admin ID
      await this.initializeAdminId();
      
      // Set up socket connection handlers
      this.initializeSocketHandlers();
      
      console.log('[Socket] WebSocket server initialized successfully');
    } catch (error) {
      console.error('[Socket] Error initializing WebSocket server:', error);
      throw error;
    }
  }
  
  private initializeSocketHandlers() {
    this.io.on('connection', (socket) => {
      const { userId, role } = socket.handshake.auth;
      
      if (!userId || !role) {
        console.warn('[Socket] Connection attempt without userId or role');
        socket.disconnect(true);
        return;
      }
      
      console.log(`[Socket] New connection: ${socket.id} (User: ${userId}, Role: ${role})`);
      
      // Store the connection
      this.activeConnections.set(socket.id, {
        userId,
        role
      });
      
      // Update user status to online
      this.activeUsers.set(userId, {
        userId,
        role,
        socketId: socket.id,
        connectedAt: new Date(),
        isOnline: true
      });
      
      // Notify user of successful connection
      socket.emit('connection_established', { 
        userId,
        isAdmin: role === 'ADMIN',
        adminId: this.adminId
      });
      
      // Send any queued messages
      this.processQueuedMessages(userId, socket);
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${userId} (${socket.id})`);
        this.activeConnections.delete(socket.id);
        
        // Update user status to offline
        const user = this.activeUsers.get(userId);
        if (user) {
          this.activeUsers.set(userId, { ...user, isOnline: false });
        }
      });
      
      // Handle message sending
      socket.on('send_message', this.handleSendMessage(socket));
      
      // Handle message read status
      socket.on('mark_as_read', async (messageIds: string[], callback: Function) => {
        try {
          const userId = socket.handshake.auth.userId;
          await prisma.message.updateMany({
            where: {
              id: { in: messageIds },
              receiverId: userId
            },
            data: { read: true }
          });
          
          callback({ status: 'success' });
        } catch (error) {
          console.error('[Socket] Error marking messages as read:', error);
          callback({ status: 'error', error: 'Failed to mark messages as read' });
        }
      });
    });
  }
  
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      console.log('[Socket] Stopping WebSocket server...');
      
      // Disconnect all active connections
      const disconnectPromises = Array.from(this.activeConnections.values()).map(socket => 
        new Promise<void>((res) => {
          socket.once('disconnect', () => res());
          socket.disconnect(true);
        })
      );
      
      // Wait for all connections to close or timeout
      Promise.race([
        Promise.all(disconnectPromises),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]).then(() => {
        this.activeConnections.clear();
        
        // Close the WebSocket server
    this.io.close(() => {
          console.log('[Socket] WebSocket server stopped');
          resolve();
        });
      });
    });
  }
}

export default SocketIOServer;
