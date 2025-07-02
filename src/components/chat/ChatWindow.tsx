import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UserRole } from '@prisma/client';
import useSocket from '@/hooks/useSocket';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: Date;
  isRead: boolean;
  sender: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

interface ChatWindowProps {
  userId: string;
  userRole: UserRole;
  token: string;
  conversationId: string;
  otherUser: {
    id: string;
    name: string;
    role: UserRole;
  };
  initialMessages?: Message[];
}

export default function ChatWindow({
  userId,
  userRole,
  token,
  conversationId,
  otherUser,
  initialMessages = [],
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  // Debounce input updates
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  // Memoize messages to avoid re-renders
  const renderedMessages = useMemo(() => (
    messages.map((msg) => (
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
          <p className="text-sm">{msg.content}</p>
          <p className="text-xs mt-1 opacity-70 text-right">
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    ))
  ), [messages]);

  // Handle new messages from socket
  const handleNewMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
    // Auto-scroll to bottom when new message arrives
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Initialize socket connection
  const { sendMessage, isConnected } = useSocket(
    userId,
    userRole,
    token,
    handleNewMessage
  );

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected()) {
      return;
    }

    try {
      // Optimistically add the message to the UI
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        content: newMessage,
        senderId: userId,
        receiverId: otherUser.id,
        createdAt: new Date(),
        isRead: false,
        sender: {
          id: userId,
          name: 'You',
          email: '',
          role: userRole,
        },
        receiver: {
          ...otherUser,
          email: '',
        },
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage('');

      // Send the message via WebSocket
      await sendMessage(otherUser.id, newMessage, conversationId);

      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally show an error message to the user
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {otherUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">{otherUser.name}</h3>
            <p className="text-sm text-gray-500">
              {isConnected() ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {renderedMessages}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
