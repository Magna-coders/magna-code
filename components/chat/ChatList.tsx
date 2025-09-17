'use client';

import { useState, useEffect } from 'react';
import { Conversation } from '@/types/chat';
import { getUserConversations, getOrCreateDirectConversation } from '@/lib/supabase/chat';
import { formatDistanceToNow } from 'date-fns';

interface ChatListProps {
  onConversationSelect: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
}

export default function ChatList({ onConversationSelect, selectedConversation }: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const data = await getUserConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStartChat = async (userId: string) => {
    try {
      const conversation = await getOrCreateDirectConversation(userId);
      await loadConversations(); // Refresh list
      onConversationSelect(conversation);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const searchTerm = searchQuery.toLowerCase();
    if (conv.type === 'direct') {
      return conv.participants.some(p => 
        p.user.username.toLowerCase().includes(searchTerm)
      );
    }
    return conv.name?.toLowerCase().includes(searchTerm);
  });

  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === 'direct') {
      return conversation.participants.map(p => p.user.username).join(', ');
    }
    return conversation.name || 'Group Chat';
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.last_message) return 'No messages yet';
    const { content, sender } = conversation.last_message;
    return `${sender.username}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;
  };

  return (
    <div className="w-80 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold mb-3">Messages</h2>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onConversationSelect(conversation)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {getConversationName(conversation)}
                  </h3>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {getLastMessagePreview(conversation)}
                  </p>
                </div>
                {conversation.last_message && (
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}