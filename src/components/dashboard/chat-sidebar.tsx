// ChatSidebar.tsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getSocket } from '@/lib/socket';
import { toast } from 'react-hot-toast';

// Helper for avatar initials
const getInitial = (name?: string | null, email?: string | null) => 
  (name ? name[0].toUpperCase() : (email ? email[0].toUpperCase() : '?'));

interface ClientUser {
  id: string;
  name: string | null;
  email: string | null;
  status: 'PENDING' | 'VERIFIED';
  role: 'ADMIN' | 'CLIENT';
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  conversationId?: string; // Add conversationId to track existing conversations
}

interface ChatSidebarProps {
  onSelect: (conversationId: string, userId: string) => void;
  activeId: string | null;
}

export function ChatSidebar({ onSelect, activeId }: ChatSidebarProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchClients = async () => {
      setLoading(true);
      try {
        console.log('Fetching clients from:', '/api/chat/clients');
        const response = await fetch('/api/chat/clients', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch clients: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Fetched clients:', data);
        setClients(data);
      } catch (error) {
        console.error('Error in fetchClients:', {
          error,
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        toast.error('Failed to load clients. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();

    // Set up real-time updates if needed
    // const socket = getSocket();
    // socket.on('client:updated', fetchClients);
    // return () => {
    //   socket.off('client:updated', fetchClients);
    // };
  }, [user]);

  const handleUserClick = async (userId: string) => {
    if (!user?.id) {
      toast.error('You must be logged in to start a conversation');
      return;
    }

    console.log('Starting conversation with user:', userId);
    
    // Check if we already have a conversation with this user
    const existingClient = clients.find(c => c.id === userId);
    if (existingClient?.conversationId) {
      console.log('Using existing conversation:', existingClient.conversationId);
      onSelect(existingClient.conversationId, userId);
      return;
    }

    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: userId,
        }),
      });

      console.log('Response status:', response.status);
      
      let data;
      try {
        data = await response.json();
        console.log('Response data:', data);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        // If the conversation already exists, use the existing one
        if (response.status === 409 && data.id) {
          console.log('Using existing conversation from error response:', data.id);
          // Update the clients list with the conversation ID
          setClients(prevClients => 
            prevClients.map(c => 
              c.id === userId ? { ...c, conversationId: data.id } : c
            )
          );
          onSelect(data.id, userId);
          return;
        }
        
        console.error('API Error:', data);
        throw new Error(data.error || `Failed to create conversation (${response.status})`);
      }

      if (!data || !data.id) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      console.log('Conversation created successfully:', data.id);
      
      // Update the clients list with the new conversation ID
      setClients(prevClients => 
        prevClients.map(c => 
          c.id === userId ? { ...c, conversationId: data.id } : c
        )
      );
      
      onSelect(data.id, userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      console.error('Error creating conversation:', {
        error,
        message: errorMessage,
        userId,
        timestamp: new Date().toISOString()
      });
      toast.error(errorMessage);
    }
  };

  const handleClientClick = async (client: ClientUser) => {
    if (client.status !== 'VERIFIED') {
      toast.error('You can only chat with verified clients');
      return;
    }
    
    // Use the conversation ID if it exists, otherwise create a new one
    if (client.conversationId) {
      onSelect(client.conversationId, client.id);
    } else {
      handleUserClick(client.id);
    }
  };

  return (
    <aside className="w-80 bg-white border-r h-full flex flex-col">
      <div className="p-4 border-b font-bold text-lg">
        {user?.role === 'ADMIN' ? 'All Clients' : 'Conversations'}
      </div>
      {loading ? (
        <div className="p-4 text-gray-500">Loading clients...</div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {clients.length > 0 ? (
            clients.map((client) => (
              <li
                key={client.id}
                className={`flex items-center px-4 py-3 border-b cursor-pointer transition-colors duration-100 ${
                  activeId === client.id 
                    ? 'bg-blue-50 border-l-4 border-blue-500' 
                    : 'hover:bg-gray-50'
                } ${!client.verified ? 'opacity-60' : ''}`}
                onClick={() => handleClientClick(client)}
              >
                {/* Avatar/initials */}
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold mr-3 border">
                  {getInitial(client.name, client.email)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900 truncate">
                      {client.name || client.email}
                    </span>
                    {client.status === 'VERIFIED' ? (
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    ) : (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 truncate">
                    {client.email}
                  </span>
                </div>
                {client.unreadCount ? (
                  <span className="ml-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {client.unreadCount}
                  </span>
                ) : null}
              </li>
            ))
          ) : (
            <li className="px-4 py-4 text-gray-400 text-center">No clients found</li>
          )}
        </ul>
      )}
    </aside>
  );
}
