// WebSocket configuration
export const WS_CONFIG = {
  // Connection settings
  path: '/api/socket',
  transports: ['websocket'],
  
  // Reconnection settings
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  reconnectDelayMax: 5000,
  
  // Timeout settings
  connectionTimeout: 10000,
  pingTimeout: 60000,
  pingInterval: 25000,
  
  // Debug mode
  debug: process.env.NODE_ENV !== 'production',
  
  // CORS settings
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://yourdomain.com']
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
} as const;

// WebSocket events
export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Message events
  SEND_MESSAGE: 'sendMessage',
  NEW_MESSAGE: 'newMessage',
  MESSAGE_SENT: 'messageSent',
  MESSAGE_DELIVERED: 'messageDelivered',
  MESSAGE_READ: 'messageRead',
  
  // Typing indicators
  TYPING: 'typing',
  USER_TYPING: 'userTyping',
  
  // Conversation events
  JOIN_CONVERSATION: 'joinConversation',
  LEAVE_CONVERSATION: 'leaveConversation',
  CONVERSATION_UPDATED: 'conversationUpdated',
  
  // Status events
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
  
  // Error events
  ERROR: 'error',
} as const;
