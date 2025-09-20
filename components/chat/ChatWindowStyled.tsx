'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Conversation } from '@/types/chat';
import { sendMessage, getMessages, subscribeToMessages } from '@/lib/supabase/chat';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatWindowStyledProps {
  conversation: Conversation;
  onClose: () => void;
}

export default function ChatWindowStyled({ conversation, onClose }: ChatWindowStyledProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, setSubscription] = useState<RealtimeChannel | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!conversation?.id || !currentUserId) return;

    // Load existing messages
    loadMessages();

    // Subscribe to new messages
    const sub = subscribeToMessages(conversation.id, (message) => {
      setMessages(prev => [message, ...prev]);
    });
    setSubscription(sub);

    return () => {
      if (sub) {
        sub.unsubscribe();
      }
    };
  }, [conversation?.id, currentUserId, subscribeToMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = useCallback(async () => {
    if (!conversation?.id) return;
    try {
      setIsLoading(true);
      const data = await getMessages(conversation.id);
      setMessages(data.reverse());
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversation?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage(conversation.id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getOtherParticipantName = () => {
    if (conversation.type === 'direct') {
      return conversation.participants.find(p => p.user_id !== currentUserId)?.user.username || 'User';
    }
    return conversation.name || 'Group Chat';
  };

  return (
    <div className="h-full bg-black border border-[#E70008]/30 rounded-lg flex flex-col">
      {/* Header */}
      <div className="bg-[#E70008]/20 border-b border-[#E70008]/30 p-4 rounded-t-lg flex justify-between items-center">
        <h3 className="font-mono font-bold text-[#F9E4AD]">{getOtherParticipantName()}</h3>
        <button
          onClick={onClose}
          className="text-[#F9E4AD] hover:text-[#FF9940] text-xl font-bold transition-colors"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="text-center text-[#F9E4AD]/60 font-mono">Loading messages...</div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg border ${
                message.sender_id === currentUserId
                  ? 'bg-[#E70008] text-black border-[#E70008]'
                  : 'bg-[#E70008]/10 text-[#F9E4AD] border-[#E70008]/30'
              }`}
            >
              {conversation.type === 'group' && message.sender_id !== currentUserId && (
                <div className="text-xs font-medium text-[#FF9940] mb-1 font-mono">
                  {message.sender.username}
                </div>
              )}
              <div className="text-sm font-mono">{message.content}</div>
              <div className="text-xs opacity-75 mt-1 font-mono">
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t border-[#E70008]/30 p-4">
        <div className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-black border border-[#E70008]/50 rounded-md text-[#F9E4AD] font-mono focus:border-[#FF9940] focus:outline-none focus:ring-1 focus:ring-[#FF9940]"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-[#E70008] text-black font-mono font-bold rounded-md hover:bg-[#FF9940] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF9940]"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}