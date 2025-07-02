// src/lib/socket.ts
import { io, type Socket, type ManagerOptions, type SocketOptions, type Manager } from 'socket.io-client';

// Types
export interface SocketInstance extends Socket {
  connected: boolean;
  connect: () => this;
  disconnect: () => this;
  id: string;
  io: Manager & {
    engine: {
      transport: {
        name: string;
        on: (event: string, callback: (...args: any[]) => void) => void;
      };
      on: (event: string, callback: (...args: any[]) => void) => void;
    };
  };
}

// State
let socketInstance: SocketInstance | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000; // Start with 1 second delay

// Constants
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

// Track connection state
let isConnected = false;
let isConnecting = false;
const connectionListeners: Array<() => void> = [];
let pendingConnection: Promise<SocketInstance> | null = null;

// Helper functions
const getWebSocketUrl = (url: string): string => {
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return url;
  }
  return url.startsWith('https') 
    ? url.replace('https', 'wss')
    : url.replace('http', 'ws');
};

export const socket = io(
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001",
  { transports: ["websocket"] } // Force WebSocket transport
);

export async function getSocket(userId: string, role: string): Promise<SocketInstance> {
  // Return existing socket if it exists and is connected
  if (socketInstance?.connected) {
    return socketInstance;
  }

  // If we're already in the process of connecting, return the pending promise
  if (isConnecting && pendingConnection) {
    return pendingConnection;
  }

  // Set up the connection promise
  isConnecting = true;
  pendingConnection = new Promise<SocketInstance>((resolve, reject) => {
    // Disconnect existing socket if any
    if (socketInstance) {
      socketInstance.disconnect();
    }

    // Reset connection state
    isConnected = false;
    isConnecting = true;

    // Get the WebSocket URL and ensure it's properly formatted
    const socketUrl = getWebSocketUrl(WS_URL);
    
    console.log('[Socket] Creating new socket connection to:', socketUrl);
    
    const socketOptions: Partial<ManagerOptions & SocketOptions> = {
      path: "/socket.io/",
      auth: { userId, role },
      // Try WebSocket first, then fall back to polling
      transports: ["websocket", "polling"],
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: 10000,
      // Timeout settings
      timeout: 30000,
      // Auto-connect
      autoConnect: true,
      // Force new connection
      forceNew: true,
      // Security
      secure: socketUrl.startsWith('wss'),
      // Enable cookies if needed
      withCredentials: true,
      // Add timestamp to prevent caching
      query: { 
        t: Date.now(),
        EIO: '4' // Force Engine.IO protocol v4
      }
    };

    // Initialize new socket connection
    const newSocket = io(socketUrl, socketOptions) as unknown as SocketInstance;
    socketInstance = newSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[Socket] Connected with ID:', newSocket.id);
      console.log('[Socket] Auth:', newSocket.auth);
      
      isConnected = true;
      isConnecting = false;
      reconnectAttempts = 0;
      
      // Log transport information if available
      if (newSocket.io?.engine) {
        console.log('[Socket] Transport:', newSocket.io.engine.transport.name);
        
        newSocket.io.engine.on('upgrade', (transport: any) => {
          console.log(`[Socket] Transport upgraded to: ${transport.name}`);
        });
        
        newSocket.io.engine.on('packet', ({ type, data }: { type: string; data: any }) => {
          console.log(`[Socket] Packet: type=${type}, data=`, data);
        });
        
        newSocket.io.engine.on('packetCreate', (packet: any) => {
          console.log('[Socket] Packet created:', packet);
        });
      }
      
      // Notify all listeners that we're connected
      connectionListeners.forEach(cb => cb());
      
      // Resolve the promise with the connected socket
      resolve(newSocket);
    });

    // Handle connection errors first to catch any issues during connection
    const onConnectError = (error: Error) => {
      console.error('[Socket] Connection error:', error.message);
      isConnected = false;
      isConnecting = false;
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        pendingConnection = null;
        reject(error);
      }
    };

    // Handle socket errors (non-connection related)
    const onError = (error: Error) => {
      console.error('[Socket] Error:', error);
      // Don't reject the promise for non-connection errors
      // as they might be recoverable
    };

    // Handle disconnection
    const onDisconnect = (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
      isConnected = false;
      
      // Notify listeners about disconnection
      connectionListeners.forEach(cb => cb());
      
      // Attempt to reconnect if not explicitly disconnected
      if (reason !== 'io client disconnect') {
        const delay = Math.min(RECONNECTION_DELAY * Math.pow(2, reconnectAttempts), 30000);
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          console.log(`[Socket] Will attempt to reconnect in ${delay}ms...`);
          setTimeout(() => {
            if (newSocket && !newSocket.connected) {
              reconnectAttempts++;
              newSocket.connect();
            }
          }, delay);
        } else {
          console.error('[Socket] Max reconnection attempts reached');
        }
      }
    };

    // Set up event listeners
    newSocket.on('connect_error', onConnectError);
    newSocket.on('error', onError);
    newSocket.on('disconnect', onDisconnect);
  });

  return pendingConnection;
}

// Export a function to check connection status
export function isSocketConnected(): boolean {
  return isConnected;
}

// Add a connection listener
export function onConnect(callback: () => void): () => void {
  if (isConnected) {
    callback();
  }
  connectionListeners.push(callback);
  
  // Return cleanup function
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) {
      connectionListeners.splice(index, 1);
    }
  };
}

// Export a function to manually reconnect
export function reconnectSocket(): void {
  if (socketInstance && !socketInstance.connected) {
    socketInstance.connect();
  }
}

// Export a function to manually disconnect
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    isConnected = false;
    socketInstance = null;
  }
}

// Get the current socket instance
export function getSocketInstance(): SocketInstance | null {
  return socketInstance;
}

// Get the current socket ID
export function getSocketId(): string | undefined {
  return socketInstance?.id;
}

// Helper function to ensure socket is connected
export async function ensureConnected(userId: string, role: string): Promise<SocketInstance> {
  const currentSocket = await getSocket(userId, role);
  
  if (currentSocket.connected) {
    return currentSocket;
  }
  
  // If not connected, connect and wait for connection
  currentSocket.connect();
  
  return new Promise<SocketInstance>((resolve, reject) => {
    let timeout: NodeJS.Timeout;
    
    const onConnect = () => {
      cleanup();
      resolve(currentSocket);
    };
    
    const onConnectError = (error: Error) => {
      cleanup();
      reject(error);
    };
    
    const cleanup = () => {
      clearTimeout(timeout);
      currentSocket.off('connect', onConnect);
      currentSocket.off('connect_error', onConnectError);
    };
    
    // Set timeout for connection attempt
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Connection timeout'));
    }, 10000); // 10 second timeout
    
    currentSocket.on('connect', onConnect);
    currentSocket.on('connect_error', onConnectError);
  });
}
