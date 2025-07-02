'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@prisma/client';
import ChatWindow from '@/components/chat/ChatWindow';

interface User {
  id: string;
  name: string;
  role: UserRole;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Fetch conversation and other user data
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const isAdmin = session.user.role === 'ADMIN';
        let otherUserData: User | null = null;
        
        // Fetch the other user (admin or client)
        const roleToFetch = isAdmin ? 'CLIENT' : 'ADMIN';
        const response = await fetch(`/api/users?role=${roleToFetch}&limit=1`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${roleToFetch.toLowerCase()} user`);
        }
        
        const data = await response.json();
        
        if (data.users && data.users.length > 0) {
          otherUserData = {
            id: data.users[0].id,
            name: data.users[0].name,
            role: roleToFetch as UserRole,
          };
          setOtherUser(otherUserData);
          
          // Only proceed to create conversation if we have both users
          if (otherUserData) {
            // Get or create conversation
            const convResponse = await fetch('/api/conversations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                participantIds: [session.user.id, otherUserData.id],
              }),
            });
            
            if (!convResponse.ok) {
              throw new Error('Failed to create/fetch conversation');
            }
            
            const convData = await convResponse.json();
            setConversationId(convData.id);
          }
        } else {
          throw new Error(`No ${roleToFetch.toLowerCase()} user found`);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        // Optionally show an error message to the user
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, status, router]);

  if (status === 'loading' || isLoading || !otherUser || !conversationId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl h-[calc(100vh-8rem)]">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Chat with {otherUser.name}
      </h1>
      
      <div className="h-full">
        <ChatWindow
          userId={session.user.id}
          userRole={session.user.role}
          token={session.accessToken}
          conversationId={conversationId}
          otherUser={otherUser}
        />
      </div>
    </div>
  );
}
