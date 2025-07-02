'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatList } from '@/components/dashboard/chat-list';
import { ChatWindow } from '@/components/dashboard/chat-window-fixed';
import { useAuth } from '@/hooks/use-auth';

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleSelectConversation = (conversationId: string, userId: string) => {
    setSelectedConversation(conversationId);
    setOtherUserId(userId);
    if (isMobile) {
      router.push(`/dashboard/chat/${conversationId}`);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please sign in to access chat</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row h-[calc(100vh-200px)]">
        {/* Conversation List */}
        <div className={`w-full md:w-80 border-r ${isMobile && selectedConversation ? 'hidden' : 'block'}`}>
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Conversations</h2>
          </div>
          <div className="overflow-y-auto h-full">
            <ChatList onSelectConversation={handleSelectConversation} />
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 ${isMobile && !selectedConversation ? 'hidden' : 'flex'}`}>
          {selectedConversation ? (
            <div className="flex-1 flex flex-col">
              <ChatWindow 
                conversationId={selectedConversation} 
                otherUserId={otherUserId}
                onBack={isMobile ? () => setSelectedConversation(null) : undefined}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
                <p className="text-gray-500">Select a conversation or start a new chat</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
