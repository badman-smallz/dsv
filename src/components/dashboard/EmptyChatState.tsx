// WhatsApp-style empty chat state component
import React from 'react';

export const EmptyChatState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-gray-400">
    <svg width="56" height="56" fill="none" viewBox="0 0 24 24" className="mb-4"><path fill="#a3a3a3" d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm-1-9v2h2v-2h-2Zm0-6v4h2V7h-2Z"/></svg>
    <div className="text-lg font-medium mb-2">No messages yet</div>
    <div className="text-sm">Start the conversation!</div>
  </div>
);
