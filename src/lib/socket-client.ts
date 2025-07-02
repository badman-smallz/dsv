import { io, Socket } from 'socket.io-client';
import { UserRole } from '@prisma/client';

interface SocketOptions {
  userId: string;
  role: UserRole;
  token: string;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onNewMessage?: (message: any) => void;
  onMessageDelivered?: (data: any) => void;
}

export class SocketClient {
  private socket: Socket | null = null;
  private options: SocketOptions;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private maxReconnectDelay: number = 30000; // Max 30 seconds

  constructor(options: SocketOptions) {
    this.options = options;
    this.initialize();
  }

  private initialize() {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
    const url = `${protocol}//${host}`;

    console.log(`[Socket] Connecting to ${url}`);

    this.socket = io(url, {
      auth: {
        userId: this.options.userId,
        token: this.options.token
      },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      timeout: 20000,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.options.onConnect?.();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`);
      this.isConnected = false;
      this.options.onDisconnect?.(reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      this.options.onError?.(error as Error);
    });

    this.socket.on('new_message', (message) => {
      console.log('[Socket] New message received:', message);
      this.options.onNewMessage?.(message);
    });

    this.socket.on('message_delivered', (data) => {
      console.log('[Socket] Message delivered:', data);
      this.options.onMessageDelivered?.(data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );

      console.log(`[Socket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, delay);
    } else {
      console.error('[Socket] Max reconnection attempts reached');
    }
  }

  public sendMessage(message: { to: string; content: string; conversationId?: string }) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error('Not connected to server'));
      }

      this.socket.emit('send_message', message, (response: any) => {
        if (response.status === 'delivered') {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to send message'));
        }
      });
    });
  }

  public markAsRead(messageIds: string[]) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Not connected, cannot mark messages as read');
      return;
    }
    this.socket.emit('mark_as_read', messageIds);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public isConnectedToServer(): boolean {
    return this.isConnected;
  }
}

export default SocketClient;
