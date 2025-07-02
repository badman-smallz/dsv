'use client';

import { useAuth } from '@/hooks/use-auth';
import { getSocket } from '@/lib/socket';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  timestamp: string;
  read: boolean;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load messages for the current conversation
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/chat/messages/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);
  
  // Handle new message received via socket
  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    
    // Mark message as read if it's for the current user
    if (message.receiverId === user?.id) {
      // You can add an API call here to mark the message as read
      console.log('Marking message as read:', message.id);
    }
  }, [user?.id]);
  
  // Initialize socket connection and set up event listeners
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('Initializing socket connection...');
    const socket = getSocket(
      user.id,
      user.role || 'CLIENT'
    );
    
    socketRef.current = socket;
    
    // Set up event listeners
    const onConnect = () => {
      console.log('Connected to WebSocket server, socket ID:', socket.id);
      if (conversationId) {
        console.log('Joining conversation:', conversationId);
        socket.emit('joinConversation', { conversationId }, (response: any) => {
          console.log('joinConversation response:', response);
        });
      }
    };

    // Add error handler
    const onConnectError = (error: any) => {
      console.error('Socket connection error:', error);
    };
    
    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('newMessage', handleNewMessage);
    
    // Log socket connection status
    console.log('Socket connection status:', socket.connected ? 'Connected' : 'Disconnected');
    
    // Load initial messages
    if (conversationId) {
      console.log('Loading initial messages for conversation:', conversationId);
      loadMessages();
    }
    
    // Clean up on unmount
    return () => {
      console.log('Cleaning up socket connection...');
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('newMessage', handleNewMessage);
      
      if (conversationId) {
        console.log('Leaving conversation:', conversationId);
        socket.emit('leaveConversation', { conversationId });
      }
      
      // Only disconnect if there are no more listeners
      if (socket.listeners('newMessage').length === 0) {
        console.log('No more message listeners, disconnecting socket');
        socket.disconnect();
      }
    };
  }, [conversationId, user?.id, user?.role, loadMessages, handleNewMessage]);

  if (!user) {
    return <div className="p-4 text-gray-400">You must be logged in to use chat.</div>;
  }
  
  const userId = user.id;
  const role = user.role || 'CLIENT';

  // Get or create a conversation with the other user
  const getOrCreateConversation = useCallback(async (targetUserId: string) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: targetUserId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      return data.id;
    } catch (err) {
      console.error('Error getting/creating conversation:', err);
      setError('Failed to start conversation');
      return null;
    }
  }, []);

  // Find the other user's ID from the URL if not provided
  const findOtherUserId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    // Try to get from URL path
    const pathParts = window.location.pathname.split('/');
    const userIdFromUrl = pathParts[pathParts.length - 1];
    
    return userIdFromUrl && userIdFromUrl !== 'chat' ? userIdFromUrl : null;
  }, []);

  // Initialize conversation when component mounts or props change
  useEffect(() => {
    const initializeConversation = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);

      try {
        // If we have a conversation ID, use it
        if (conversationId) {
          return;
        }

        // Otherwise, we need to find or create a conversation
        const targetOtherUserId = otherUserId || await findOtherUserId();
        if (!targetOtherUserId) {
          setError('No recipient specified');
          setLoading(false);
          return;
        }

        const newConversationId = await getOrCreateConversation(targetOtherUserId);
        if (newConversationId) {
          setConversationId(newConversationId);
          setOtherUserId(targetOtherUserId);
        }
      } catch (err) {
        console.error('Error initializing conversation:', err);
        setError('Failed to initialize chat');
      } finally {
        setLoading(false);
      }
    };

    initializeConversation();
  }, [user?.id, conversationId, otherUserId, getOrCreateConversation, findOtherUserId]);

  // Handle sending a message - single implementation
  const sendMessage = useCallback(async () => {
    if (!input.trim()) {
      console.error('No message content');
      return;
    }
    if (!user?.id) {
      console.error('No user ID');
      return;
    }
    if (!conversationId) {
      console.error('No conversation ID');
      return;
    }
    if (!otherUserId) {
      console.error('No receiver ID');
      return;
    }

    console.log('Sending message with data:', {
      content: input,
      conversationId,
      senderId: user.id,
      receiverId: otherUserId
    });

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    
    // Create optimistic message
    const tempMessage: Message = {
      id: tempId,
      content: input,
      senderId: user.id,
      receiverId: otherUserId,
      conversationId,
      timestamp: new Date().toISOString(),
      read: false,
    };

    try {
      // Add message to UI optimistically
      console.log('Adding optimistic message:', tempMessage);
      setOptimisticMessages(prev => [...prev, tempMessage]);
      setInput('');

      // Send via socket
      if (socketRef.current) {
        const messageData = {
          content: input,
          conversationId,
          senderId: user.id,
          receiverId: otherUserId
        };
        
        console.log('Emitting sendMessage event with data:', messageData);
        socketRef.current.emit('sendMessage', messageData, (response: any) => {
          console.log('sendMessage acknowledgment:', response);
          if (response?.status === 'error') {
            console.error('Error from server:', response);
            setError('Failed to send message: ' + (response.message || 'Unknown error'));
            // Remove optimistic message on error
            setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
          }
        });
      } else {
        console.error('Socket not connected');
        throw new Error('Socket not connected');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error in sendMessage:', errorMessage);
      setError('Failed to send message: ' + errorMessage);
      // Remove optimistic message on error
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [input, user?.id, conversationId, otherUserId]);

  // Function to mark messages as read
  const markAsRead = async (messageIds: string | string[]) => {
    try {
      const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
      await fetch('/api/chat/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: ids }),
      });
      
      // Update local state to mark messages as read
      setMessages(prev => 
        prev.map(msg => 
          ids.includes(msg.id) ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Set up socket connection and event listeners
  useEffect(() => {
    if (!user?.id || !conversationId) return;

    console.log('Setting up socket connection for user:', { userId: user.id, conversationId });
    
    // Get or create socket connection
    const socket = getSocket(user.id, user.role || 'CLIENT');
    socketRef.current = socket;

    // Join conversation room
    const joinConversation = () => {
      if (socket.connected) {
        console.log('Joining conversation:', conversationId);
        socket.emit('joinConversation', { conversationId }, (response: any) => {
          if (response?.status === 'error') {
            console.error('Failed to join conversation:', response);
            setError(`Failed to join conversation: ${response.code || 'Unknown error'}`);
          } else {
            console.log('Successfully joined conversation:', conversationId);
          }
        });
      } else {
        console.log('Socket not connected, will join when connected');
      }
    };

    // Handle new messages
    const handleNewMessage = (msg: Message) => {
      console.log('Received new message:', msg);
      
      // Remove any matching optimistic message
      setOptimisticMessages(prev => 
        prev.filter(m => !(m.content === msg.content && m.senderId === msg.senderId))
      );
      
      // Add the real message
      setMessages(prev => [...prev, msg]);
      
      // Mark message as read if it's for the current user
      if (msg.receiverId === user.id) {
        markAsRead(msg.id);
      }
      
      // Scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle connection events
    const onConnect = () => {
      console.log('Socket connected, joining conversation...');
      joinConversation();
    };

    // Set up event listeners
    socket.on('connect', onConnect);
    socket.on('newMessage', handleNewMessage);

    // Join conversation if already connected
    if (socket.connected) {
      joinConversation();
    }

    // Load existing messages
    const loadMessages = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/chat/messages/${conversationId}?page=1&pageSize=50`);
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
          
          // Mark all messages as read
          const unreadMessages = data
            .filter((m: Message) => !m.read && m.receiverId === user.id)
            .map((m: Message) => m.id);
            
          if (unreadMessages.length > 0) {
            await markAsRead(unreadMessages);
          }
          
          // Scroll to bottom after messages load
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();

    // Cleanup function
    return () => {
      console.log('Cleaning up socket listeners');
      socket.off('connect', onConnect);
      socket.off('newMessage', handleNewMessage);
      
      // Clean up
      socket.off('newMessage', handleNewMessage);
      if (conversationId) {
        socket.emit('leaveConversation', { conversationId });
      }
      
      // Only disconnect if there are no more listeners
      if (socket.listeners('newMessage').length === 0) {
        console.log('No more message listeners, disconnecting socket');
        socket.disconnect();
      }
    };
  }, [conversationId, user?.id, user?.role, handleNewMessage]);

  // Handle key down events for the message input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !sending) {
        sendMessage();
      }
    }
  };

  // Remove duplicate sendMessage function

  // Group messages by date for display
  const groupedMessages = useMemo(() => {
    return messages.reduce<MessageGroup[]>((groups: MessageGroup[], message: Message) => {
      const date = new Date(message.timestamp).toDateString();
      const group = groups.find((g: MessageGroup) => g.date === date);
      
      if (group) {
        group.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }
      
      return groups;
    }, []);
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMessages]);

  if (loading) {
    return <div className="p-4 text-gray-500">Loading conversation...</div>;
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
      <div className="p-4 border-b flex items-center">
        {onBack && (
          <button 
            onClick={onBack}
            className="md:hidden mr-2 text-gray-600 hover:text-gray-900"
            aria-label="Back to conversations"
          >
            ←
          </button>
        )}
        <h2 className="text-lg font-semibold">
          {otherUserId ? `Chat with ${otherUserId}` : 'Chat'}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.senderId === user?.id
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
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
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-end space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            rows={1}
            disabled={sending || !conversationId}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || !conversationId}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
