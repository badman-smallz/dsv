// WhatsApp-style chat header for chat window
import React from 'react';

interface ChatHeaderProps {
  name: string;
  avatar?: string | null;
  online?: boolean;
  lastSeen?: string | null;
  typing?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ name, avatar, online, lastSeen, typing }) => (
  <div className="flex items-center px-4 py-3 border-b bg-white shadow-sm">
    {avatar ? (
      <img src={avatar} alt={name} className="w-10 h-10 rounded-full mr-3 border" />
    ) : (
      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold mr-3 border">
        {name ? name[0].toUpperCase() : '?'}
      </div>
    )}
    <div className="flex flex-col flex-1">
      <span className="font-semibold text-gray-900">{name}</span>
      {typing ? (
        <span className="text-green-500 text-xs font-medium animate-pulse">Typing...</span>
      ) : online ? (
        <span className="text-green-500 text-xs font-medium">Online</span>
      ) : lastSeen ? (
        <span className="text-gray-400 text-xs">last seen {lastSeen}</span>
      ) : null}
    </div>
  </div>
);
