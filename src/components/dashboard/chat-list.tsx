'use client';

import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Participant {
  id: string;
  name: string;
  email: string;
}

interface LastMessage {
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  participants: Participant[];
  lastMessage?: LastMessage;
  unreadCount: number;
}

interface ChatListProps {
  onSelectConversation: (conversationId: string, userId: string) => void;
}

export function ChatList({ onSelectConversation }: ChatListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const response = await fetch('/api/chat/conversations');
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        const data = await response.json();
        setConversations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="p-4 text-gray-500">
        Loading conversations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        {error}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        No conversations yet. Start a new chat!
      </div>
    );
  }

  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch users to start a chat with
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      // Filter out current user
      const otherUsers = data.filter((u: any) => u.id !== user?.id);
      setUsers(otherUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleConversationClick = useCallback((conversationId: string, userId: string) => {
    onSelectConversation(conversationId, userId);
  }, [onSelectConversation]);

  const handleNewChat = async (participantId?: string) => {
    try {
      setLoading(true);
      
      if (!participantId) {
        // If no participant ID provided, show user list
        setShowUserList(true);
        await fetchUsers();
        return;
      }

      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: participantId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create new conversation');
      }

      const newConversation = await response.json();
      handleConversationClick(newConversation.id, participantId);
      
      // Refresh the conversations list
      const refreshResponse = await fetch('/api/chat/conversations');
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setConversations(Array.isArray(data) ? data : []);
      }
      
      // Hide user list after selection
      setShowUserList(false);
    } catch (err) {
      console.error('Error creating new chat:', err);
      setError('Failed to start a new chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="p-4 border-b">
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => handleNewChat()}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center justify-center transition-colors"
            disabled={loading}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" 
                clipRule="evenodd" 
              />
            </svg>
            New Chat
          </button>

          {showUserList && (
            <div className="mt-2 border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
              {loadingUsers ? (
                <div className="p-4 text-center text-gray-500">Loading users...</div>
              ) : users.length > 0 ? (
                <div className="divide-y">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleNewChat(user.id)}
                      className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-3">
                        {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.name || user.email}</div>
                        {user.name && <div className="text-xs text-gray-500">{user.email}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">No users found</div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
        {conversations.map((conversation) => {
          const otherUser = conversation.participants.find(p => p.id !== user?.id);
          const displayName = otherUser?.name || otherUser?.email || 'Unknown User';
          
          return (
            <div
              key={conversation.id}
              onClick={() => {
                // Find the other participant's ID
                const otherParticipant = conversation.participants.find(p => p.id !== user?.id);
                if (otherParticipant) {
                  handleConversationClick(conversation.id, otherParticipant.id);
                } else {
                  handleConversationClick(conversation.id, '');
                }
              }}
              className="block p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="font-medium">{displayName}</div>
                {conversation.unreadCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              {conversation.lastMessage && (
                <div className="text-sm text-gray-500 truncate mt-1">
                  {conversation.lastMessage.content}
                </div>
              )}
              {conversation.lastMessage?.timestamp && (
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
