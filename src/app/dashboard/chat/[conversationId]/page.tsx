'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/dashboard/chat-window-fixed';
import { useAuth } from '@/hooks/use-auth';

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useParams();
  const conversationId = Array.isArray(params.conversationId) 
    ? params.conversationId[0] 
    : params.conversationId;

  // Handle back to conversations list on mobile
  const handleBack = () => {
    router.push('/dashboard/chat');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please sign in to access chat</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Mobile header with back button */}
      <div className="md:hidden p-4 border-b flex items-center">
        <button 
          onClick={handleBack}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold">Chat</h1>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatWindow 
          conversationId={conversationId}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
