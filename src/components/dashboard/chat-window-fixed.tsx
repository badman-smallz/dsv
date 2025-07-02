'use client';

import { useAuth } from '@/hooks/use-auth';
import { getSocket, type SocketInstance } from '@/lib/socket';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface UserInfo {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface ConversationInfo {
  id: string;
  admin: UserInfo;
  client: UserInfo;
}

interface JoinConversationResponse {
  status: 'success' | 'error';
  code?: string;
  message?: string;
  conversation?: ConversationInfo;
  room?: string;
  members?: Array<{ id: string; role: string }>;
  previousMessages?: Message[];
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  timestamp: string;
  read: boolean;
  sender?: UserInfo;
  receiver?: UserInfo;
}

interface MessageGroup {
  date: string;
  messages: Message[];
}

interface ChatWindowProps {
  conversationId?: string;
  otherUserId?: string;
  onBack?: () => void;
}

export function ChatWindow({ 
  conversationId: initialConversationId, 
  otherUserId: initialOtherUserId,
  onBack 
}: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [otherUserId, setOtherUserId] = useState<string | null>(initialOtherUserId || null);
  const [otherUser, setOtherUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string>('User');
  const socketRef = useRef<SocketInstance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketInstanceRef = useRef<SocketInstance | null>(null);

  // Extract other user's info from conversation data
  const extractOtherUserInfo = useCallback((conversation: any, currentUserId: string) => {
    if (!conversation) return null;
    
    // Determine if current user is admin or client
    const isAdmin = conversation.admin?.id === currentUserId;
    const otherUser = isAdmin ? conversation.client : conversation.admin;
    
    if (!otherUser) {
      console.warn('Could not determine other user in conversation:', conversation);
      return null;
    }
    
    return {
      id: otherUser.id,
      name: otherUser.name || otherUser.email?.split('@')[0] || 'User',
      email: otherUser.email
    };
  }, []);

  // Get or create a conversation with the other user
  const getOrCreateConversation = useCallback(async (targetUserId: string) => {
    try {
      console.log('Creating new conversation with user:', targetUserId);
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: targetUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create conversation:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to create conversation');
      }

      const data = await response.json();
      console.log('Created conversation:', data);
      return data.id;
    } catch (err) {
      console.error('Error getting/creating conversation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start conversation';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  // Reset state when conversation or user changes
  useEffect(() => {
    // Reset messages and optimistic messages when conversation changes
    setOptimisticMessages([]);
    setInput('');
    
    // Clean up any existing socket listeners
    const currentSocket = socketRef.current;
    // Clean up function
    return () => {
      if (currentSocket) {
        console.log(`[Chat] Cleaning up socket for conversation: ${conversationId}`);
        currentSocket.off('newMessage');
        currentSocket.off('connect');
        currentSocket.off('disconnect');
        currentSocket.off('error');
        currentSocket.off('connect_error');
        
        // Only disconnect if we're not reusing the socket
        if (currentSocket.connected) {
          currentSocket.disconnect();
        }
      }
      
      console.log(`[Chat] Cleaned up resources for conversation: ${conversationId}`);
    };
  }, [conversationId, otherUserId]);

  // Initialize conversation when component mounts or props change
  useEffect(() => {
    const initializeConversation = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);

      try {
        // If we have both conversationId and otherUserId, we're good to go
        if (conversationId && otherUserId) {
          return;
        }

        // If we have an initialConversationId or initialOtherUserId, use those
        if (initialConversationId || initialOtherUserId) {
          setConversationId(initialConversationId || null);
          setOtherUserId(initialOtherUserId || null);
          return;
        }

        // If we have an otherUserId but no conversationId, create a new conversation
        if (otherUserId && !conversationId) {
          const newConversationId = await getOrCreateConversation(otherUserId);
          if (newConversationId) {
            setConversationId(newConversationId);
            return;
          }
        }

        // Otherwise, try to find the other user ID from the URL
        const targetOtherUserId = await findOtherUserId();
        if (targetOtherUserId) {
          const newConversationId = await getOrCreateConversation(targetOtherUserId);
          if (newConversationId) {
            setConversationId(newConversationId);
            setOtherUserId(targetOtherUserId);
          }
        } else {
          setError('No recipient specified');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing conversation:', err);
        setError('Failed to initialize chat');
      } finally {
        setLoading(false);
      }
    };

    initializeConversation();
  }, [user?.id, initialConversationId, initialOtherUserId, getOrCreateConversation, conversationId, otherUserId]);

  // Find the other user's ID from the URL if not provided
  const findOtherUserId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    // Try to get from URL path
    const pathParts = window.location.pathname.split('/');
    const userIdFromUrl = pathParts[pathParts.length - 1];
    
    return userIdFromUrl && userIdFromUrl !== 'chat' ? userIdFromUrl : null;
  }, []);

  // Handle sending a new message
  const sendMessage = async () => {
    if (!input.trim() || !conversationId || !otherUserId || !user?.id) return;
    
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content: input,
      senderId: user.id,
      receiverId: otherUserId,
      conversationId,
      timestamp: new Date().toISOString(),
      read: false,
      sender: {
        id: user.id,
        name: user.name || 'You',
        email: user.email || '',
      },
    };
    
    try {
      // Add message to UI optimistically
      setOptimisticMessages(prev => [...prev, tempMessage]);
      setInput('');
      
      // Get or create socket instance
      if (!socketInstanceRef.current) {
        socketInstanceRef.current = await getSocket(user.id, user.role || 'CLIENT');
      }
      
      const socket = socketInstanceRef.current;
      
      if (!socket.connected) {
        console.log('[Chat] Socket not connected, attempting to reconnect...');
        await new Promise<void>((resolve, reject) => {
          const onConnect = () => {
            socket.off('connect', onConnect);
            socket.off('connect_error', onError);
            resolve();
          };
          
          const onError = (error: Error) => {
            socket.off('connect', onConnect);
            socket.off('connect_error', onError);
            reject(error);
          };
          
          socket.on('connect', onConnect);
          socket.on('connect_error', onError);
          socket.connect();
        });
      }
      
      console.log('[Chat] Sending message via WebSocket:', {
        conversationId,
        content: input,
        senderId: user.id,
        receiverId: otherUserId,
      });
      
      // Add a timeout for the message sending
      const sendTimeout = setTimeout(() => {
        console.error('[Chat] Message send timeout');
        toast.error('Message send timed out. Trying again...');
        socket.emit('sendMessage', {
          conversationId,
          content: input,
          senderId: user.id,
          receiverId: otherUserId,
        });
      }, 5000);
      
      // Send the message with acknowledgment
      socket.emit('sendMessage', {
        conversationId,
        content: input,
        senderId: user.id,
        receiverId: otherUserId,
      }, (response: any) => {
        // Clear the timeout
        clearTimeout(sendTimeout);
        
        if (response?.success) {
          console.log('[Chat] Message sent successfully');
          // The real message will be added via the newMessage event
        } else {
          console.error('[Chat] Error sending message:', response?.error);
          toast.error('Failed to send message');
          // Remove the optimistic message on error
          setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
        }
      });
      
    } catch (error) {
      console.error('[Chat] Error in sendMessage:', error);
      onError({
        ...error,
        code: 'SEND_MESSAGE_ERROR',
        message: 'Failed to send message',
        isTimeout: false
      });
      // Remove the optimistic message on error
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [input, user, conversationId, otherUserId]);

  const onError = useCallback((error: any) => {
    console.error('=== CLIENT === Error in chat window ===\n', error);
    
    // Extract error details
    const errorMessage = error?.message || 'An error occurred';
    const errorDetails = error?.data || error?.response?.data || {};
    const errorCode = errorDetails.code || 'UNKNOWN_ERROR';
    
    console.error('Error details:', {
      code: errorCode,
      message: errorMessage,
      details: errorDetails,
      stack: error?.stack
    });
    
    // Set error state
    setError(`${errorMessage} (${errorCode})`);
    setLoading(false);
    
    // Show detailed error toast
    toast.error(
      <div className="space-y-1">
        <div className="font-semibold">{errorMessage}</div>
        {errorCode && <div className="text-xs opacity-75">Code: {errorCode}</div>}
        {errorDetails.details && process.env.NODE_ENV === 'development' && (
          <div className="text-xs opacity-50 whitespace-pre-wrap">{errorDetails.details}</div>
        )}
      </div>,
      {
        duration: 5000,
        position: 'top-center',
      }
    );
  }, []);

  // Track the current conversation ID to handle cleanup
  const currentConversationRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up WebSocket connection and load messages
  useEffect(() => {
    if (!conversationId || !user?.id) {
      console.warn('[Chat] Missing required data for chat:', { 
        hasConversationId: !!conversationId, 
        hasUserId: !!user?.id 
      });
      return;
    }

    // Skip if we're already on this conversation
    if (currentConversationRef.current === conversationId) {
      console.log('[Chat] Already on this conversation, skipping re-initialization');
      return;
    }

    // Set loading state and clear previous data
    setIsLoading(true);
    setMessages([]);
    setOptimisticMessages([]);
    setConnectionError(null);
    
    console.log('[Chat] Initializing chat for conversation:', {
      conversationId,
      otherUserId,
      currentUserId: user.id,
      previousConversationId: currentConversationRef.current
    });
    
    // Update the current conversation ref
    currentConversationRef.current = conversationId;
    
    let isMounted = true;
    let socket: SocketInstance | null = null;
    
    console.log('[Chat] Setting up WebSocket for conversation:', { conversationId, otherUserId });
    
    // Load initial messages
    const loadMessages = async () => {
      if (!conversationId || !isMounted) return;
      
      try {
        console.log(`[Chat] Loading messages for conversation: ${conversationId}`);
        const res = await fetch(`/api/chat/messages/${conversationId}?page=1&pageSize=50`, {
          // Prevent caching of conversation data
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to load messages: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        
        // Verify we're still on the same conversation
        if (!isMounted || currentConversationRef.current !== conversationId) {
          console.log('[Chat] Conversation changed while loading messages, ignoring response');
          return;
        }
        
        if (Array.isArray(data)) {
          console.log(`[Chat] Loaded ${data.length} messages for conversation ${conversationId}`);
          // Filter messages to ensure they belong to the current conversation
          const validMessages = data.filter((msg: Message) => 
            msg.conversationId === conversationId
          );
          
          if (validMessages.length !== data.length) {
            console.warn(`[Chat] Filtered out ${data.length - validMessages.length} messages with mismatched conversationId`);
          }
          
          setMessages(validMessages);
        } else {
          console.error('[Chat] Invalid messages data format:', data);
          setMessages([]);
        }
      } catch (err) {
        console.error('[Chat] Error loading messages:', err);
        if (isMounted && currentConversationRef.current === conversationId) {
          setConnectionError('Failed to load messages. Please try again.');
        }
      } finally {
        if (isMounted && currentConversationRef.current === conversationId) {
          setIsLoading(false);
        }
      }
    };

    // Set up WebSocket connection
    const setupSocket = async () => {
      try {
        // Initialize socket
        console.log(`[Chat] Initializing WebSocket for user ${user.id}`);
        socket = await getSocket(user.id, user.role || 'CLIENT');
        
        if (!socket) {
          throw new Error('Failed to initialize WebSocket');
        }
        
        if (!isMounted) return;
        
        // Store the current conversation ID to prevent race conditions
        const currentConversationId = conversationId;
        
        socketInstanceRef.current = socket;
        socketRef.current = socket;
        
        const onConnect = () => {
          if (!isMounted) return;
          console.log('[Chat] Connected to WebSocket server with ID:', socket?.id);
          
          // Only join conversation if we have a valid ID
          if (conversationId && user?.id) {
            console.log('[Chat] Joining conversation:', { 
              conversationId, 
              userId: user.id,
              role: user.role || 'CLIENT'
            });
            
            // Add a small delay to ensure the connection is fully established
            const joinTimeout = setTimeout(async () => {
              if (!isMounted) {
                clearTimeout(joinTimeout);
                return;
              }
              
              console.log(`[Chat] Emitting joinConversation for ${conversationId}`);
              
              const joinData = { 
                conversationId,
                userId: user.id,
                role: user.role || 'CLIENT',
                timestamp: new Date().toISOString()
              };
              
              console.log('[Chat] Emitting joinConversation with data:', joinData);
              
              // Set a timeout for the join operation
              const operationTimeout = setTimeout(() => {
                if (isMounted) {
                  onError({
                    message: 'Failed to join conversation: Operation timed out',
                    code: 'JOIN_TIMEOUT',
                    isTimeout: true
                  });
                }
              }, 10000); // 10 second timeout
              
              try {
                socket.emit('joinConversation', joinData, (response: JoinConversationResponse) => {
                  if (!isMounted) {
                    clearTimeout(operationTimeout);
                    return;
                  }
                  
                  clearTimeout(operationTimeout);
                  
                  if (!response) {
                    const error = new Error('No response from server') as any;
                    error.data = { 
                      code: 'NO_RESPONSE',
                      message: 'The server did not respond to the join request',
                      timestamp: new Date().toISOString()
                    };
                    onError(error);
                    return;
                  }
                  
                  console.log('[Chat] joinConversation response:', response);
                  
                  if (response.status === 'error') {
                    const error = new Error(response.message || 'Failed to join conversation') as any;
                    error.data = response;
                    onError(error);
                    
                    // If it's a conversation not found error, we might want to handle it specially
                    if (response.code === 'CONVERSATION_NOT_FOUND') {
                      console.error('[Chat] Conversation not found, redirecting...');
                      // You might want to redirect to conversations list or show a not found message
                    }
                    return;
                  }
                  
                  console.log('[Chat] Successfully joined conversation:', conversationId, response);
                  
                  // Update the other user's information from the response
                  if (response.conversation) {
                    console.log('[Chat] Full conversation data:', JSON.stringify(response.conversation, null, 2));
                    
                    const isCurrentUserAdmin = response.conversation.admin?.id === user.id;
                    const otherUser = isCurrentUserAdmin 
                      ? response.conversation.client 
                      : response.conversation.admin;
                    
                    console.log('[Chat] Current user is admin:', isCurrentUserAdmin);
                    console.log('[Chat] Other user data:', JSON.stringify(otherUser, null, 2));
                    
                    if (otherUser) {
                      const userName = otherUser.name || otherUser.email?.split('@')[0] || 'User';
                      console.log(`[Chat] Setting other user info:`, {
                        id: otherUser.id,
                        name: userName,
                        email: otherUser.email,
                        role: otherUser.role
                      });
                      
                      setOtherUser({
                        id: otherUser.id,
                        name: userName,
                        email: otherUser.email,
                        role: otherUser.role
                      });
                      
                      // Also update the otherUserId state for backward compatibility
                      setOtherUserId(otherUser.id);
                      console.log('[Chat] Updated other user ID to:', otherUser.id);
                    } else {
                      console.warn('[Chat] Could not determine other user from conversation:', {
                        adminId: response.conversation.admin?.id,
                        clientId: response.conversation.client?.id,
                        currentUserId: user.id
                      });
                    }
                  } else {
                    console.warn('[Chat] No conversation data in join response');
                  }
                  
                  // Reset any error states if we successfully joined
                  setConnectionError(null);
                });
              } catch (error) {
                console.error('[Chat] Error in joinConversation:', error);
                onError({
                  message: 'Failed to join conversation',
                  code: 'JOIN_ERROR',
                  details: error instanceof Error ? error.message : 'Unknown error'
                });
              }
                
                // If it's a conversation not found error, we might want to handle it specially
                if (response.code === 'CONVERSATION_NOT_FOUND') {
                  console.error('[Chat] Conversation not found, redirecting...');
                  // You might want to redirect to conversations list or show a not found message
                }
              } else {
                console.log('[Chat] Successfully joined conversation:', conversationId, response);
                
                // Update the other user's information from the response
                if (response.conversation) {
                  console.log('[Chat] Full conversation data:', JSON.stringify(response.conversation, null, 2));
                  
                  const isCurrentUserAdmin = response.conversation.admin?.id === user.id;
                  const otherUser = isCurrentUserAdmin 
                    ? response.conversation.client 
                    : response.conversation.admin;
                  
                  console.log('[Chat] Current user is admin:', isCurrentUserAdmin);
                  console.log('[Chat] Other user data:', JSON.stringify(otherUser, null, 2));
                  
                  if (otherUser) {
                    const userName = otherUser.name || otherUser.email?.split('@')[0] || 'User';
                    console.log(`[Chat] Setting other user info:`, {
                      id: otherUser.id,
                      name: userName,
                      email: otherUser.email,
                      role: otherUser.role
                    });
                    
                    setOtherUser({
                      id: otherUser.id,
                      name: userName,
                      email: otherUser.email,
                      role: otherUser.role
                    });
                    
                    // Also update the otherUserId state for backward compatibility
                    setOtherUserId(otherUser.id);
                    console.log('[Chat] Updated other user ID to:', otherUser.id);
                  } else {
                    console.warn('[Chat] Could not determine other user from conversation:', {
                      adminId: response.conversation.admin?.id,
                      clientId: response.conversation.client?.id,
                      currentUserId: user.id
                    });
                  }
                } else {
                  console.warn('[Chat] No conversation data in join response. Full response:', JSON.stringify(response, null, 2));
                }
                
                // Reset any error states if we successfully joined
                setConnectionError(null);
              }
              });
            }, 500); // Small delay to ensure connection is ready
            
            // Clean up the timeout if component unmounts
            return () => clearTimeout(joinTimeout);
          } else {
            console.warn('[Chat] Cannot join conversation - missing conversationId or user ID', {
              hasConversationId: !!conversationId,
              hasUserId: !!user?.id
            });
          }
        };
        
        const onDisconnect = (reason: string) => {
          if (!isMounted) return;
          console.log('[Chat] Disconnected from WebSocket server:', reason);
          if (reason === 'io server disconnect') {
            // Attempt to reconnect after a short delay
            setTimeout(() => {
              if (isMounted && socket) {
                console.log('[Chat] Attempting to reconnect...');
                socket.connect();
              }
            }, 1000);
          }
        };
    
        const onNewMessage = (message: Message) => {
          if (!isMounted || !currentConversationId) return;
          
          console.log('[Chat] New message received:', {
            message,
            currentConversationId,
            matchesCurrent: message.conversationId === currentConversationId
          });
          
          // Only process if this message is for the current conversation
          if (message.conversationId !== currentConversationId) {
            console.log(`[Chat] Ignoring message for different conversation: ${message.conversationId}`);
            return;
          }
          
          // Remove any matching optimistic message
          setOptimisticMessages(prev => 
            prev.filter(m => !(
              m.content === message.content && 
              m.senderId === message.senderId &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
            ))
          );
          
          // Add the real message
          setMessages(prev => {
            // Prevent duplicate messages
            if (prev.some(m => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
        };
        
        const onError = (error: Error & { data?: any }) => {
          console.error('[Chat] WebSocket error:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            data: error.data
          });
          
          const errorMessage = error.data?.message || error.message || 'Connection error';
          setConnectionError(`Connection error: ${errorMessage}`);
          
          // Show toast for certain error types
          if (error.data?.code === 'UNAUTHORIZED' || error.data?.code === 'INVALID_CONVERSATION') {
            toast.error(`Error: ${errorMessage}`);
          } else if (error.data?.code === 'CONVERSATION_NOT_FOUND') {
            toast.error('This conversation no longer exists');
          }
        };
        
        // Add event listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('newMessage', onNewMessage);
        socket.on('error', onError);
        socket.on('connect_error', onError);
        
        // Connect if not already connected
        if (!socket.connected) {
          console.log('[Chat] Connecting to WebSocket server...');
          socket.connect();
        } else {
          // If already connected, join the conversation
          socket.emit('joinConversation', { conversationId });
        }
        
        // Clean up function
        return () => {
          console.log('[Chat] Cleaning up WebSocket listeners');
          socket?.off('connect', onConnect);
          socket?.off('disconnect', onDisconnect);
          socket?.off('newMessage', onNewMessage);
          socket?.off('error', onError);
          socket?.off('connect_error', onError);
        };
        
      } catch (error) {
        console.error('[Chat] Error setting up socket:', error);
      }
    };
    
    // Initialize socket and load messages
    const initialize = async () => {
      await loadMessages();
      return setupSocket();
    };
    
    const cleanupPromise = initialize();
    
    // Clean up on unmount
    return () => {
      isMounted = false;
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, [user, conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMessages]);

  // Group messages by date for display
  const groupedMessages = messages
    .filter(message => message.conversationId === conversationId)
    .reduce<MessageGroup[]>((groups, message) => {
      const date = new Date(message.timestamp).toDateString();
      const group = groups.find(g => g.date === date);
      
      if (group) {
        group.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }
      
      return groups;
    }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !sending) {
      sendMessage().catch(error => {
        console.error('Error in handleSubmit:', error);
        toast.error('Failed to send message');
      });
    }
  };
  
  // Handle pressing Enter to send message (with Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Loading conversation...</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Loading conversation details...</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded">
        {error}
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="p-4 text-gray-500">
        No conversation selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b flex items-center bg-white sticky top-0 z-10">
        {onBack && (
          <button 
            onClick={onBack}
            className="md:hidden mr-2 p-1 -ml-1 text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-full"
            aria-label="Back to conversations"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        )}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-600 font-medium">
            {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold truncate">
              {otherUser?.name || 'Chat'}
            </h2>
            {otherUser?.email && (
              <p className="text-xs text-gray-500 truncate">
                {otherUser.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {groupedMessages.length === 0 && optimisticMessages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Say hello!
          </div>
        ) : (
          <>
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-2">
                <div className="text-center text-xs text-gray-500 my-2">
                  {new Date(group.date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                {group.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderId === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg ${
                        msg.senderId === user?.id
                          ? 'bg-blue-500 text-white rounded-br-sm sm:rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm sm:rounded-bl-none'
                      }`}
                      style={{ wordBreak: 'break-word' }}
                    >
                      <div className="text-sm">{msg.content}</div>
                      <div
                        className={`text-xs opacity-70 mt-1 ${
                          msg.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Optimistic messages */}
            {optimisticMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex justify-end opacity-70"
              >
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-400 text-white rounded-br-none">
                  <div className="text-sm">{msg.content}</div>
                  <div className="text-xs opacity-70 text-blue-100 mt-1">
                    Sending...
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full min-h-[44px] max-h-40 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              rows={1}
              disabled={sending || !conversationId}
            />
            <div className="absolute right-2 bottom-2 flex gap-1">
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                onClick={() => {}}
                disabled={sending || !conversationId}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
                <span className="sr-only">Attach file</span>
              </button>
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                onClick={() => {}}
                disabled={sending || !conversationId}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <span className="sr-only">Open emoji picker</span>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || sending || !conversationId}
            className="h-10 w-10 p-0 flex items-center justify-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {sending ? (
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
