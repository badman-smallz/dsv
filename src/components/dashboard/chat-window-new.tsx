'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useRouter } from 'next/navigation';

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
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [otherUserId, setOtherUserId] = useState<string | null>(initialOtherUserId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = session?.user?.id;
  
  // Get or create a conversation with the other user
  const getOrCreateConversation = useCallback(async (targetUserId: string): Promise<string | null> => {
    if (!userId) return null;
    
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
  }, [userId]);

  // Load messages for the current conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const data = await response.json();
      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
      }
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== userId) {
        setIsTyping(data.isTyping);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('typing', handleTyping);

    // Clean up
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket, conversationId, userId]);

  // Load messages when conversationId or otherUserId changes
  useEffect(() => {
    const initializeChat = async () => {
      if (conversationId) {
        await loadMessages(conversationId);
      } else if (otherUserId) {
        // If we have a user ID but no conversation ID, create a new conversation
        const newConversationId = await getOrCreateConversation(otherUserId);
        if (newConversationId) {
          setConversationId(newConversationId);
          await loadMessages(newConversationId);
        }
      }
    };

    initializeChat();
  }, [conversationId, otherUserId, loadMessages, getOrCreateConversation]);
  
  // Handle input change and typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Notify other user that we're typing
    if (socket && conversationId && userId) {
      socket.emit('typing', { 
        conversationId, 
        userId,
        isTyping: true 
      });

      // Clear typing indicator after 3 seconds of inactivity
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (socket && conversationId && userId) {
          socket.emit('typing', { 
            conversationId, 
            userId,
            isTyping: false 
          });
        }
      }, 3000);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If we have a user ID but no conversation ID, create a new conversation first
    let targetConversationId = conversationId;
    if (!targetConversationId && otherUserId) {
      const newConversationId = await getOrCreateConversation(otherUserId);
      if (!newConversationId) {
        setError('Failed to start conversation');
        return;
      }
      targetConversationId = newConversationId;
      setConversationId(newConversationId);
    }

    if (!input.trim() || !targetConversationId || !otherUserId || !socket || sending) return;

    const tempId = Date.now().toString();
    const newMessage = {
      id: tempId,
      content: input,
      senderId: userId!,
      receiverId: otherUserId,
      conversationId: targetConversationId,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Optimistic update
    setOptimisticMessages(prev => [...prev, newMessage]);
    setInput('');
    setSending(true);

    try {
      // Send message through socket
      socket.emit('sendMessage', {
        ...newMessage,
        tempId,
      });

      // Send message to API
      const response = await fetch(`/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.content,
          conversationId: targetConversationId,
          receiverId: otherUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      // Remove optimistic message on error
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Handle key down in the input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  // Handle input blur
  const handleBlur = () => {
    // Notify other user that we stopped typing
    if (socket && conversationId && userId) {
      socket.emit('typing', { 
        conversationId, 
        userId,
        isTyping: false 
      });
    }
  };

  // Group messages by date
  const groupedMessages = useCallback(() => {
    const groups: MessageGroup[] = [];
    const allMessages = [...messages, ...optimisticMessages];
    
    allMessages.forEach(message => {
      const date = new Date(message.timestamp).toDateString();
      const group = groups.find(g => g.date === date);
      
      if (group) {
        group.messages.push(message);
      } else {
        groups.push({
          date,
          messages: [message]
        });
      }
    });
    
    return groups.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [messages, optimisticMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMessages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
        <button 
          onClick={() => conversationId && loadMessages(conversationId)}
          className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
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
        {!isConnected && (
          <div className="flex items-center text-xs text-yellow-600">
            <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
            Connecting...
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {groupedMessages().length === 0 && optimisticMessages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Say hello!
          </div>
        ) : (
          <>
            {groupedMessages().map((group, groupIndex) => (
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
                      msg.senderId === userId ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.senderId === userId
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <div className="text-sm">{msg.content}</div>
                      <div
                        className={`text-xs opacity-70 mt-1 ${
                          msg.senderId === userId ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {msg.senderId === userId && (
                          <span className="ml-2">
                            {msg.read ? '✓✓' : '✓'}
                          </span>
                        )}
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
                className="flex justify-end"
              >
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-500 text-white rounded-br-none opacity-80">
                  <div className="text-sm">{msg.content}</div>
                  <div className="text-xs text-blue-100 opacity-70 mt-1">
                    Sending...
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="Type a message..."
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={!conversationId || !isConnected}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || sending || !conversationId || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
