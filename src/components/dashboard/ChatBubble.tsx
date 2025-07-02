// WhatsApp-style chat bubble with grouping, avatar, timestamp, and unread indicator
import React from 'react';

interface ChatBubbleProps {
  message: any;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  avatar?: string | null;
  name?: string;
  unread?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwn,
  showAvatar,
  showTimestamp,
  avatar,
  name,
  unread,
}) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} w-full`}>
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0 mr-2">
          {avatar ? (
            <img src={avatar} alt={name || ''} className="w-8 h-8 rounded-full border" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold border">
              {name ? name[0].toUpperCase() : '?'}
            </div>
          )}
        </div>
      )}
      <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-2 mb-0.5 shadow-sm whitespace-pre-line ${isOwn ? 'bg-green-100 text-gray-900' : 'bg-white text-gray-900'} transition-all`}>
          {message.content}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {showTimestamp && (
            <span className="text-xs text-gray-400 select-none">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {unread && (
            <span className="ml-1 text-green-500 text-xs font-bold">● Unread</span>
          )}
        </div>
      </div>
      {isOwn && showAvatar && (
        <div className="flex-shrink-0 ml-2">
          {avatar ? (
            <img src={avatar} alt={name || ''} className="w-8 h-8 rounded-full border" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold border">
              {name ? name[0].toUpperCase() : '?'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
