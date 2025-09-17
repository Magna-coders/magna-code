'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Conversation } from '@/types/chat';
import { sendMessage, getMessages, subscribeToMessages } from '@/lib/supabase/chat';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatWindowProps {
  conversation: Conversation;
  onClose: () => void;
}

export default function ChatWindow({ conversation, onClose }: ChatWindowProps) {
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
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <h3 className="font-semibold">{getOtherParticipantName()}</h3>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-xl font-bold"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="text-center text-gray-500">Loading messages...</div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg ${
                message.sender_id === currentUserId
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {conversation.type === 'group' && (
                <div className="text-sm font-medium">{message.sender.username}</div>
              )}
              <div className="text-sm">{message.content}</div>
              <div className="text-xs opacity-75 mt-1">
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}