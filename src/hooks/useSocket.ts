import { useEffect, useRef, useCallback, useMemo } from 'react';
import { UserRole } from '@prisma/client';
import SocketClient, { SocketOptions } from '@/lib/socket-client';

export function useSocket(
  userId: string,
  userRole: UserRole,
  token: string,
  onNewMessage?: (message: any) => void
) {
  const socketRef = useRef<SocketClient | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!userId || !token) {
      console.warn('[useSocket] Missing userId or token');
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const options: SocketOptions = {
      userId,
      role: userRole,
      token,
      onConnect: () => {
        console.log('[useSocket] Connected to WebSocket server');
        reconnectAttempts.current = 0;
      },
      onDisconnect: (reason) => {
        console.log(`[useSocket] Disconnected: ${reason}`);
      },
      onError: (error) => {
        console.error('[useSocket] Error:', error);
      },
      onNewMessage: (message) => {
        console.log('[useSocket] New message:', message);
        onNewMessage?.(message);
      },
      onMessageDelivered: (data) => {
        console.log('[useSocket] Message delivered:', data);
      },
    };

    socketRef.current = new SocketClient(options);
  }, [userId, userRole, token, onNewMessage]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async (to: string, content: string, conversationId?: string) => {
    if (!socketRef.current) {
      throw new Error('Socket not connected');
    }
    return socketRef.current.sendMessage({ to, content, conversationId });
  }, []);

  const markAsRead = useCallback((messageIds: string[]) => {
    if (socketRef.current) {
      socketRef.current.markAsRead(messageIds);
    }
  }, []);

  const isConnected = useCallback(() => {
    return socketRef.current?.isConnectedToServer() || false;
  }, []);

  // Auto-connect on mount and when dependencies change
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return useMemo(() => ({
    sendMessage,
    markAsRead,
    isConnected,
    disconnect,
    connect,
  }), [sendMessage, markAsRead, isConnected, disconnect, connect]);
}

export default useSocket;
