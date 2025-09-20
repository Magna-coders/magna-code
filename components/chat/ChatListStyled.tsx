'use client';

import { useState, useEffect } from 'react';
import { Conversation } from '@/types/chat';
import { getUserConversations, getOrCreateDirectConversation } from '@/lib/supabase/chat';
import { formatDistanceToNow } from 'date-fns';

interface ChatListStyledProps {
  onConversationSelect: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
}

export default function ChatListStyled({ onConversationSelect, selectedConversation }: ChatListStyledProps) {
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
    <div className="bg-black rounded-lg border border-[#E70008]/30">
      <div className="p-4 border-b border-[#E70008]/20">
        <h2 className="text-lg font-bold font-mono text-[#F9E4AD] mb-3">Conversations</h2>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-black border border-[#E70008]/50 rounded-md text-[#F9E4AD] font-mono focus:border-[#FF9940] focus:outline-none focus:ring-1 focus:ring-[#FF9940]"
        />
      </div>

      <div className="overflow-y-auto max-h-96">
        {isLoading ? (
          <div className="p-4 text-center text-[#F9E4AD]/60 font-mono">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-[#F9E4AD]/60 font-mono">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onConversationSelect(conversation)}
              className={`p-4 border-b border-[#E70008]/20 cursor-pointer hover:bg-[#E70008]/10 transition-colors ${
                selectedConversation?.id === conversation.id ? 'bg-[#E70008]/20 border-[#FF9940]' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold font-mono text-[#F9E4AD] truncate">
                    {getConversationName(conversation)}
                  </h3>
                  <p className="text-sm text-[#F9E4AD]/80 font-mono truncate mt-1">
                    {getLastMessagePreview(conversation)}
                  </p>
                </div>
                {conversation.last_message && (
                  <span className="text-xs text-[#F9E4AD]/60 font-mono ml-2">
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