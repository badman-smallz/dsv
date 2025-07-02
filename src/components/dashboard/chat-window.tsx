'use client';

import { useAuth } from '@/hooks/use-auth';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useEffect, useRef, useState, useCallback } from 'react';

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

  // Update state when props change
  useEffect(() => {
    console.log('Props updated:', { initialConversationId, initialOtherUserId });
    
    if (initialConversationId && initialConversationId !== conversationId) {
      console.log('Updating conversationId from props:', initialConversationId);
      setConversationId(initialConversationId);
    }
    if (initialOtherUserId && initialOtherUserId !== otherUserId) {
      console.log('Updating otherUserId from props:', initialOtherUserId);
      setOtherUserId(initialOtherUserId);
    }
  }, [initialConversationId, initialOtherUserId]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get or create a conversation with the other user
  const getOrCreateConversation = useCallback(async (targetUserId: string) => {
    try {
      console.log('Creating or getting conversation with user:', targetUserId);
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: targetUserId }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to create conversation:', error);
        throw new Error(`Failed to create conversation: ${error}`);
      }

      const data = await response.json();
      console.log('Conversation created/retrieved:', data);
      
      // Always set the otherUserId when a new conversation is created
      if (targetUserId) {
        console.log('Setting otherUserId to:', targetUserId);
        setOtherUserId(targetUserId);
      }
      
      return data.id;
    } catch (err) {
      console.error('Error getting/creating conversation:', err);
      setError('Failed to start conversation');
      return null;
    }
  }, []);

  // Initialize conversation when component mounts or props change
  useEffect(() => {
    const initializeConversation = async () => {
      if (!user?.id) {
        console.log('User not authenticated, skipping conversation initialization');
        return;
      }
      
      console.log('Initializing conversation with:', {
        initialConversationId,
        initialOtherUserId,
        currentConversationId: conversationId,
        currentOtherUserId: otherUserId
      });
      
      setLoading(true);
      setError(null);

      try {
        // If we have a conversation ID, use it
        if (conversationId) {
          console.log('Fetching conversation details for:', conversationId);
          const response = await fetch(`/api/chat/conversations/${conversationId}`, {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include' // Important for sessions to work
          });
          
          if (response.ok) {
            const conversation = await response.json();
            console.log('Fetched conversation:', conversation);
            
            if (!conversation) {
              throw new Error('No conversation data returned');
            }
            
            // Determine the other user's ID
            const otherUser = user.id === conversation.adminId ? conversation.clientId : conversation.adminId;
            console.log('Determined other user ID:', otherUser);
            
            if (otherUser) {
              console.log('Setting otherUserId from conversation:', otherUser);
              setOtherUserId(otherUser);
              
              // If we have messages, update the messages state
              if (conversation.messages?.length > 0) {
                console.log('Setting messages from conversation:', conversation.messages.length);
                const formattedMessages = conversation.messages.map((msg: any) => {
                  // Safely parse the timestamp, defaulting to current time if invalid
                  let timestamp: string;
                  try {
                    const date = msg.timestamp ? new Date(msg.timestamp) : new Date();
                    timestamp = date.toISOString();
                  } catch (e) {
                    console.warn('Invalid timestamp for message, using current time:', msg.timestamp);
                    timestamp = new Date().toISOString();
                  }
                  
                  return {
                    id: msg.id,
                    content: msg.content,
                    senderId: msg.senderId,
                    receiverId: msg.receiverId,
                    conversationId: msg.conversationId,
                    timestamp: timestamp,
                    read: msg.read || false
                  };
                });
                setMessages(formattedMessages.reverse()); // Reverse to show oldest first
              }
            } else {
              console.error('Could not determine other user from conversation:', conversation);
              setError('Invalid conversation data');
            }
          } else {
            const errorText = await response.text();
            console.error('Failed to fetch conversation:', response.status, errorText);
            setError(`Failed to load conversation: ${response.status === 401 ? 'Not authenticated' : response.status === 403 ? 'Not authorized' : 'Server error'}`);
          }
          setLoading(false);
          return;
        }

        // If we have an otherUserId but no conversationId, create a new conversation
        if (otherUserId) {
          console.log('Creating new conversation with user:', otherUserId);
          try {
            const newConversationId = await getOrCreateConversation(otherUserId);
            if (newConversationId) {
              console.log('New conversation created:', newConversationId);
              setConversationId(newConversationId);
            } else {
              throw new Error('Failed to create conversation');
            }
          } catch (err) {
            console.error('Error creating conversation:', err);
            setError('Failed to start conversation');
          }
        } else {
          console.log('No conversation ID or other user ID provided');
          setError('Please select a conversation or user to chat with');
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
  }, [user?.id, conversationId, otherUserId, getOrCreateConversation]);

  // Find the other user's ID from the URL if not provided
  const findOtherUserId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    // Try to get from URL path
    const pathParts = window.location.pathname.split('/');
    const userIdFromUrl = pathParts[pathParts.length - 1];
    
    return userIdFromUrl && userIdFromUrl !== 'chat' ? userIdFromUrl : null;
  }, []);

  // Handle sending a message
  const sendMessage = useCallback(async () => {
    // Check for missing required fields
    const missingFields: string[] = [];
    if (!input?.trim()) missingFields.push('message content');
    if (!user?.id) missingFields.push('user ID');
    if (!conversationId) missingFields.push('conversation ID');
    if (!otherUserId) missingFields.push('recipient ID');
    
    if (missingFields.length > 0) {
      const errorMsg = `Cannot send message: Missing ${missingFields.join(', ')}`;
      console.error(errorMsg, {
        hasInput: !!input,
        hasUserId: !!user?.id,
        hasConversationId: !!conversationId,
        hasOtherUserId: !!otherUserId,
        user,
        conversationId,
        otherUserId
      });
      setError(errorMsg);
      return;
    }

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
      setOptimisticMessages(prev => [...prev, tempMessage]);
      setInput('');

      // Ensure we have a valid socket connection
      let socket: any;
      try {
        socket = await getSocket(user.id, user.role || 'CLIENT');
        
        if (!socket.connected) {
          console.log('Socket not connected, attempting to connect...');
          await new Promise<void>((resolve, reject) => {
            const onConnect = () => {
              socket.off('connect', onConnect);
              socket.off('connect_error', onError);
              resolve();
            };
            const onError = (error: Error) => {
              console.error('Socket connection error:', error);
              socket.off('connect', onConnect);
              socket.off('connect_error', onError);
              reject(error);
            };
            
            socket.on('connect', onConnect);
            socket.on('connect_error', onError);
            socket.connect();
          });
        }
      } catch (error) {
        console.error('Error connecting to socket:', error);
        setError('Failed to connect to chat server. Please refresh the page.');
        setSending(false);
        return;
      }

      console.log('Sending message via socket:', {
        conversationId,
        content: input,
        senderId: user.id,
        receiverId: otherUserId
      });
      
      // Send the message with a timeout
      const sendPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message send timed out'));
        }, 10000); // 10 second timeout

        socket.emit('sendMessage', {
          conversationId,
          content: input,
          senderId: user.id,
          receiverId: otherUserId
        }, (response: any) => {
          clearTimeout(timeout);
          
          if (!response) {
            console.error('No response from server');
            reject(new Error('No response from server'));
            return;
          }
          
          console.log('Message send response:', response);
          
          if (response?.status !== 'success') {
            const errorMsg = response?.message || 'Unknown error';
            console.error('Failed to send message:', errorMsg);
            reject(new Error(errorMsg));
          } else {
            console.log('Message sent successfully');
            resolve();
          }
        });
      });

      await sendPromise;
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Remove optimistic message on error
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
      
      // Set user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(`Failed to send message: ${errorMessage}`);
      
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setSending(false);
    }
  }, [input, user?.id, conversationId, otherUserId]);

  // Set up socket connection and event listeners
  useEffect(() => {
    if (!user?.id || !conversationId) return;

    let isMounted = true;
    let socket: any = null;
    console.log('Setting up socket connection...');

    const setupSocket = async () => {
      try {
        console.log('Connecting to socket with user:', { userId: user.id, conversationId });
        socket = await getSocket(user.id, user.role || 'CLIENT');
        if (!isMounted) return;

        socketRef.current = socket;

        // Listen for new messages
        const handleNewMessage = (msg: any) => {
          if (!isMounted) return;
          
          console.log('=== CLIENT === Received newMessage event ===');
          console.log('Message details:', {
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            conversationId: msg.conversationId,
            timestamp: msg.timestamp,
            isFromMe: msg.senderId === user?.id
          });
          
          // Format the message to match our Message type
          const formattedMessage: Message = {
            id: msg.id || `msg-${Date.now()}`,
            content: msg.content,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            conversationId: msg.conversationId,
            timestamp: msg.timestamp || new Date().toISOString(),
            read: msg.read || false
          };
          
          // Remove any matching optimistic message
          setOptimisticMessages(prev => {
            const filtered = prev.filter(m => 
              !(m.content === formattedMessage.content && 
                m.senderId === formattedMessage.senderId &&
                Math.abs(new Date(m.timestamp).getTime() - new Date(formattedMessage.timestamp).getTime()) < 5000
              )
            );
            if (filtered.length !== prev.length) {
              console.log('Removed matching optimistic message');
            }
            return filtered;
          });
          
          // Add the real message if not already in messages
          setMessages(prev => {
            const isDuplicate = prev.some(m => 
              m.id === formattedMessage.id || 
              (m.content === formattedMessage.content && 
               m.senderId === formattedMessage.senderId &&
               Math.abs(new Date(m.timestamp).getTime() - new Date(formattedMessage.timestamp).getTime()) < 5000)
            );
            
            if (isDuplicate) {
              console.log('Ignoring duplicate message');
              return prev;
            }
            
            console.log('Adding new message to state');
            return [...prev, formattedMessage];
          });
        };

        // Listen for connection to complete
        const onConnect = () => {
          if (!isMounted || !socket) return;
          console.log('=== CLIENT === Socket connected, joining conversation ===');
          console.log('Conversation ID:', conversationId);
          console.log('Current user ID:', user?.id);
          
          console.log('=== CLIENT === Emitting joinConversation ===');
          console.log('Conversation ID:', conversationId);
          
          socket.emit('joinConversation', { conversationId }, (response: any) => {
            console.log('=== CLIENT === Received joinConversation response ===');
            console.log('Raw response:', response);
            
            if (response?.status === 'success') {
              console.log('Successfully joined conversation');
              console.log('Room:', response.room);
              console.log('Members:', response.members || 'No members');
              console.log('Previous messages:', response.previousMessages?.length || 0);
              
              // Load previous messages if any
              if (response.previousMessages?.length > 0) {
                console.log(`Loading ${response.previousMessages.length} previous messages`);
                const formattedMessages = response.previousMessages.map((msg: any) => {
                  const formattedMsg = {
                    id: msg.id,
                    content: msg.content,
                    senderId: msg.senderId,
                    receiverId: msg.receiverId,
                    conversationId: msg.conversationId,
                    timestamp: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
                    read: msg.read || false
                  };
                  console.log('Formatted message:', formattedMsg);
                  return formattedMsg;
                });
                
                setMessages(prev => {
                  // Merge with existing messages, removing duplicates
                  const existingIds = new Set(prev.map(m => m.id));
                  const newMessages = formattedMessages.filter((msg: any) => !existingIds.has(msg.id));
                  console.log(`Adding ${newMessages.length} new messages from history`);
                  return [...prev, ...newMessages];
                });
              } else {
                console.log('No previous messages to load');
              }
            } else {
              console.error('=== CLIENT === Failed to join conversation ===');
              console.error('Error:', response?.error || 'Unknown error');
              console.error('Response:', response);
              setError('Failed to join conversation. Please try again.');
            }
          });
        };

        // Set up event listeners
        socket.on('connect', onConnect);
        socket.on('newMessage', handleNewMessage);

        // If already connected, join immediately
        if (socket.connected) {
          onConnect();
        }

        // Cleanup function
        return () => {
          console.log('Cleaning up socket listeners');
          socket?.off('connect', onConnect);
          socket?.off('newMessage', handleNewMessage);
        };
      } catch (error) {
        console.error('Error setting up socket:', error);
      }
    };

    setupSocket();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      // Don't disconnect the socket here as it might be used by other components
    };

    socket.on('newMessage', handleNewMessage);

    // Load existing messages
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chat/messages/${conversationId}?page=1&pageSize=50`);
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages');
      }
    };

    loadMessages();

    // Clean up
    return () => {
      socket.off('newMessage', handleNewMessage);
      // Don't disconnect socket here as it might be used by other components
    };
  }, [conversationId, user?.id, user?.role]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMessages]);

  // Group messages by date for display
  const groupedMessages = messages.reduce<MessageGroup[]>((groups, message) => {
    const date = new Date(message.timestamp).toDateString();
    const group = groups.find(g => g.date === date);
    
    if (group) {
      group.messages.push(message);
    } else {
      groups.push({ date, messages: [message] });
    }
    
    return groups;
  }, []);

  // Handle input key down (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleSendClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void sendMessage();
  };

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
    <div className="flex flex-col h-full bg-white border rounded-lg overflow-hidden max-h-screen">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b flex items-center bg-white sticky top-0 z-10">
        {onBack && (
          <button 
            onClick={onBack}
            className="md:hidden mr-3 p-1 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
            aria-label="Back to conversations"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <h2 className="text-base sm:text-lg font-semibold truncate max-w-[70%]">
          {otherUserId ? `Chat with ${otherUserId}` : 'Chat'}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
        {groupedMessages.length === 0 && optimisticMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 p-4 max-w-xs">
              <p className="text-sm sm:text-base">No messages yet. Say hello! 👋</p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-2">
                <div className="text-center text-xs text-gray-500 my-2 px-2">
                  {new Date(group.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
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
                      className={`max-w-[85%] xs:max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-3 py-2 rounded-lg ${
                        msg.senderId === user?.id
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <div className="text-sm break-words">{msg.content}</div>
                      <div
                        className={`text-[10px] xs:text-xs opacity-70 mt-0.5 text-right ${
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
                <div className="max-w-[85%] xs:max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-3 py-2 rounded-lg bg-blue-400 text-white rounded-br-none">
                  <div className="text-sm break-words">{msg.content}</div>
                  <div className="text-[10px] xs:text-xs opacity-70 text-blue-100 mt-0.5 text-right">
                    Sending...
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} className="h-4 sm:h-6" />
      </div>

      {/* Input area */}
      <div className="p-2 sm:p-3 border-t bg-white sticky bottom-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none text-sm sm:text-base"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={sending || !conversationId}
            />
          </div>
          <button
            onClick={handleSendClick}
            disabled={!input.trim() || sending || !conversationId}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
