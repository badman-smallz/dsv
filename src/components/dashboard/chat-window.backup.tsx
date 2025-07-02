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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!user) {
    return <div className="p-4 text-gray-400">You must be logged in to use chat.</div>;
  }
  
  const userId = user.id;
  const role = user.role || 'CLIENT';

  // Get or create a conversation with the other user
  const getOrCreateConversation = async (otherUserId: string) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: otherUserId }),
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
  };

  // Get the other user's ID from the URL or props
  const getOtherUserId = (): string | null => {
    // First check if we have a prop for the other user
    if (conversationIdProp) {
      // In a real implementation, you might want to fetch the other user's ID
      // from the conversation details. For now, we'll return null.
      return null;
    }
    
    // Otherwise, try to extract from URL
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const userIdFromUrl = pathParts[pathParts.length - 1];
      return userIdFromUrl && userIdFromUrl !== 'chat' ? userIdFromUrl : null;
    }
    return null;
  };

  // Initialize conversation when component mounts or conversationId changes
  useEffect(() => {
    const initConversation = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        if (conversationIdProp) {
          // Use the provided conversation ID
          setConversationId(conversationIdProp);
          setLoading(false);
          return;
        }
        
        // Otherwise, find or create a conversation with the other user
        const otherUserId = getOtherUserId();
        if (!otherUserId) {
          setError('No recipient specified');
          setLoading(false);
          return;
        }
        
        const convId = await getOrCreateConversation(otherUserId);
        if (convId) {
          setConversationId(convId);
        }
      } catch (err) {
        console.error('Error initializing conversation:', err);
        setError('Failed to start conversation');
      } finally {
        setLoading(false);
      }
    };

    initConversation();
  }, [userId, conversationIdProp]);

  // Debug: Log the user and conversation info
  console.log('ChatWindow - User:', { id: userId, email: user.email, role });
  console.log('ChatWindow - Conversation ID:', conversationId);
  const [input, setInput] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const [sending, setSending] = useState(false);
  const [unreadIndex, setUnreadIndex] = useState<number | null>(null);

  // For demo: avatars are just initials, but you could extend to use real avatar URLs
  const getAvatar = (uid: string, name?: string) => {
    return null; // Placeholder for avatar URL, fallback to initial
  }

  // Fetch messages paginated
  const fetchMessages = async (pageNum = 1, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/messages/${conversationId}?page=${pageNum}&pageSize=20`);
      let data = await res.json();
      if (!Array.isArray(data)) {
        data = [];
      }
      setMessages((prev) => append ? [...data, ...prev] : data);
      setHasMore(data.length === 20);
    } catch (e) {
      setError('Failed to load messages.');
    }
    setLoading(false);
  };

  // Join conversation room when conversation is available
  useEffect(() => {
    if (!userId || !conversationId) return;

    console.log('Joining conversation:', conversationId);
    const socket = getSocket(userId, role);
    socketRef.current = socket;

    socket.emit('joinConversation', { conversationId });

    socket.on('newMessage', (msg: Message) => {
      console.log('Received new message:', msg);
      setMessages(prev => [...prev, msg]);
      setOptimisticMessages([]); // Remove any optimistic messages
      // Mark as read if received
      if (msg.receiverId === user.id) {
        fetch(`/api/chat/messages/${conversationId}`, { method: 'PATCH' });
      }
    });

    // Load existing messages
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chat/messages/${conversationId}?page=1&pageSize=50`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      }
    };

    loadMessages();

    return () => {
      socket.off('newMessage');
      // disconnectSocket();
    };
  }, [userId, conversationId, role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMessages]);

  const sendMessage = async () => {
    if (!input.trim() || !userId || !conversationId) return;
    
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const receiverId = getOtherUserId();
    
    if (!receiverId) {
      setError('Cannot determine message recipient');
      setSending(false);
      return;
    }

    const tempMessage: Message = {
      id: tempId,
      content: input,
      senderId: userId,
      receiverId,
      conversationId,
      timestamp: new Date().toISOString(),
      read: false,
    };

    try {
      // Optimistically add message to UI
      setMessages(prev => [...prev, {...tempMessage, id: tempId}]);
      setInput('');

      let targetConversationId = conversationId;
      
      // If no conversation exists, create one (shouldn't happen due to early return)
      if (!targetConversationId) {
        const otherUserId = getOtherUserId();
        if (!otherUserId) {
          throw new Error('Cannot determine recipient');
        }
        
        const newConversationId = await getOrCreateConversation(otherUserId);
        if (!newConversationId) {
          throw new Error('Failed to create conversation');
        }
        
        targetConversationId = newConversationId;
        setConversationId(newConversationId);
      }

      // Send via socket
      if (socketRef.current) {
        socketRef.current.emit('sendMessage', {
          conversationId: targetConversationId,
          content: input,
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Initialize conversation when component mounts or userId changes
  const initConversation = async () => {
    if (!userId) return;
    
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

  initConversation();
}, [userId, conversationIdProp, conversationId, otherUserId, findOtherUserId, getOrCreateConversation]);

// Debug: Log the user and conversation info
useEffect(() => {
  if (user) {
    console.log('ChatWindow - User:', { id: user.id, email: user.email, role: user.role });
    console.log('ChatWindow - Conversation ID:', conversationId);
  }
}, [user, conversationId]);

const [input, setInput] = useState('');
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const messagesEndRef = useRef<HTMLDivElement>(null);
const socketRef = useRef<any>(null);
const [sending, setSending] = useState(false);
const [unreadIndex, setUnreadIndex] = useState<number | null>(null);

// For demo: avatars are just initials, but you could extend to use real avatar URLs
const getAvatar = (uid: string, name?: string) => {
  return null; // Placeholder for avatar URL, fallback to initial
}

// Fetch messages paginated
const fetchMessages = async (pageNum = 1, append = false) => {
  setLoading(true);
  setError(null);
  try {
    const res = await fetch(`/api/chat/messages/${conversationId}?page=${pageNum}&pageSize=20`);
    let data = await res.json();
    if (!Array.isArray(data)) {
      data = [];
    }
    setMessages((prev) => append ? [...data, ...prev] : data);
    setHasMore(data.length === 20);
  } catch (e) {
    setError('Failed to load messages.');
  }
  setLoading(false);
};

// Join conversation room when conversation is available
useEffect(() => {
  if (!userId || !conversationId) return;

  console.log('Joining conversation:', conversationId);
  const socket = getSocket(userId, role);
  socketRef.current = socket;

  socket.emit('joinConversation', { conversationId });

  socket.on('newMessage', (msg: Message) => {
    console.log('Received new message:', msg);
    setMessages(prev => [...prev, msg]);
    setOptimisticMessages([]); // Remove any optimistic messages
    // Mark as read if received
    if (msg.receiverId === user.id) {
      fetch(`/api/chat/messages/${conversationId}`, { method: 'PATCH' });
    }
  });

  // Load existing messages
  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages/${conversationId}?page=1&pageSize=50`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  loadMessages();

  return () => {
    socket.off('newMessage');
    // disconnectSocket();
  };
}, [userId, conversationId, role]);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, optimisticMessages]);

const sendMessage = async () => {
  if (!input.trim() || !userId || !conversationId) return;
  
  setSending(true);
  const tempId = `temp-${Date.now()}`;
  const receiverId = getOtherUserId();
  
  if (!receiverId) {
    setError('Cannot determine message recipient');
    setSending(false);
    return;
  }

  const tempMessage: Message = {
    id: tempId,
    content: input,
    senderId: userId,
    receiverId,
    conversationId,
    timestamp: new Date().toISOString(),
    read: false,
  };

  try {
    // Optimistically add message to UI
    setMessages(prev => [...prev, {...tempMessage, id: tempId}]);
    setInput('');

    let targetConversationId = conversationId;
    
    // If no conversation exists, create one (shouldn't happen due to early return)
    if (!targetConversationId) {
      const otherUserId = getOtherUserId();
      if (!otherUserId) {
        throw new Error('Cannot determine recipient');
      }
      
      const newConversationId = await getOrCreateConversation(otherUserId);
      if (!newConversationId) {
        throw new Error('Failed to create conversation');
      }
      
      targetConversationId = newConversationId;
      setConversationId(newConversationId);
    }

    // Send via socket
    if (socketRef.current) {
      socketRef.current.emit('sendMessage', {
        conversationId: targetConversationId,
        content: input,
      });
    }
  } catch (err) {
    console.error('Error sending message:', err);
    setError('Failed to send message');
    // Remove the optimistic message on error
    setMessages(prev => prev.filter(m => m.id !== tempId));
  } finally {
    setSending(false);
  }
};

// Input: handle Enter/Shift+Enter
const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

// Group messages by date for display
const groupedMessages = useMemo(() => {
  return groupMessagesByDate([...messages, ...optimisticMessages]);
}, [messages, optimisticMessages]);

// Typing indicator state
const [partnerTyping, setPartnerTyping] = useState(false);
const partnerName = 'Chat Partner'; // Replace with actual partner name logic if available

// Typing indicator socket logic
useEffect(() => {
  if (!socketRef.current) return;
  const socket = socketRef.current;
  socket.on('typing', () => setPartnerTyping(true));
  socket.on('stopTyping', () => setPartnerTyping(false));
  return () => {
    socket.off('typing');
    socket.off('stopTyping');
  };
}, [socketRef.current]);

// Emit typing events
const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setInput(e.target.value);
  if (socketRef.current) {
    socketRef.current.emit('typing', { conversationId });
    clearTimeout(socketRef.current._typingTimeout);
    socketRef.current._typingTimeout = setTimeout(() => {
      socketRef.current.emit('stopTyping', { conversationId });
    }, 1200);
  }
};

// Chat header with typing indicator
return (
  <div className="flex flex-col h-full bg-[#f0f2f5]">
    <ChatHeader
      name={partnerName}
      avatar={null}
      online={true}
      typing={partnerTyping}
    />
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {hasMore && (
        <button className="mb-2 text-xs text-green-600 font-medium hover:underline" onClick={() => { setPage((p) => { fetchMessages(p + 1, true); return p + 1; }); }}>Load earlier...</button>
      )}
      {loading && <div className="text-gray-400">Loading...</div>}
      {error && (
        <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded mb-2">
          {error}
        </div>
      )}
      {!loading && messages.length === 0 && <EmptyChatState />}
      {/* Unread divider */}
      {unreadIndex !== null && messages.length > 0 && unreadIndex < messages.length && (
        <div className="flex items-center my-2">
          <div className="flex-1 border-t border-gray-300" />
          <span className="mx-2 text-xs text-green-600 bg-white px-2 rounded-full shadow">Unread</span>
          <div className="flex-1 border-t border-gray-300" />
        </div>
      )}
      {/* Grouped messages */}
      {groupedMessages.map((group, i) => (
        <div key={i} className="mb-4">
          <div className="text-center text-xs text-gray-500 mb-2">
            {group.date}
          </div>
          {group.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex mb-2 ${
                msg.senderId === userId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.senderId === userId
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs opacity-70 text-right mt-1">
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
      <div ref={messagesEndRef} />
          onKeyDown={handleInputKeyDown}
          placeholder="Type your message..."
          rows={1}
        />
        <button
          className={`bg-green-500 text-white px-4 py-1 rounded transition-all ${!input.trim() || sending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'}`}
          onClick={sendMessage}
          disabled={!input.trim() || sending}
        >
          Send
        </button>
      </div>
    </div>
  );
}
