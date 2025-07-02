import React, { useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

interface ChatBubbleProps {
  message: {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
    updatedAt?: string;
  };
  currentUserId: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, currentUserId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text);
  const socket = useSocket();

  const handleEdit = () => {
    console.log('Emitting edit:', { 
      messageId: message.id, 
      newText: editedText,
      userId: currentUserId
    });
    socket.emit('editMessage', {
      messageId: message.id,
      newText: editedText,
      userId: currentUserId,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    console.log('Emitting delete:', { 
      messageId: message.id,
      userId: currentUserId
    });
    socket.emit('deleteMessage', {
      messageId: message.id,
      userId: currentUserId,
    });
  };

  return (
    <div className="relative group p-3 rounded-lg max-w-xs bg-gray-100">
      {isEditing ? (
        <input
          className="w-full p-2 border rounded"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          onBlur={handleEdit}
          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
          autoFocus
        />
      ) : (
        <p>{message.text}</p>
      )}
      
      {message.senderId === currentUserId && (
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => setIsEditing(true)}
            className="p-1 text-xs text-blue-500 hover:text-blue-700"
          >
            Edit
          </button>
          <button 
            onClick={handleDelete}
            className="p-1 text-xs text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      )}
      
      {message.updatedAt && (
        <span className="text-xs text-gray-500 block mt-1">
          (edited)
        </span>
      )}
    </div>
  );
};

export default ChatBubble; 