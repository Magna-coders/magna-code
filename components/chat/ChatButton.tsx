'use client';

import { useState } from 'react';
import { Conversation } from '@/types/chat';
import { getOrCreateDirectConversation } from '@/lib/supabase/chat-fixed';
import { useAuth } from '@/lib/supabase/auth-context';
import ChatWindow from './ChatWindow';

interface ChatButtonProps {
  targetUserId: string;
  targetUsername: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export default function ChatButton({ 
  targetUserId, 
  targetUsername, 
  className = '',
  size = 'medium',
  showLabel = true 
}: ChatButtonProps) {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    // Check if user is logged in
    if (!user) {
      alert('Please log in to start a chat');
      return;
    }

    try {
      setIsLoading(true);
      const conv = await getOrCreateDirectConversation(targetUserId);
      setConversation(conv);
      setIsChatOpen(true);
    } catch (error) {
      const err = error as Error;
      console.error('Error starting chat:', err);
      alert(`Error starting chat: ${err.message || 'Please try again'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-1 text-xs';
      case 'large':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  return (
    <>
      <button
        onClick={handleStartChat}
        disabled={isLoading || !user}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${getSizeClasses()} ${className}`}
        title={!user ? 'Please log in to chat' : 'Start chat'}
      >
        <svg
          className={`${showLabel ? 'mr-2' : ''} ${size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-5 w-5' : 'h-4 w-4'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {showLabel && (isLoading ? 'Starting...' : !user ? 'Login to Chat' : 'Chat')}
      </button>

      {isChatOpen && conversation && (
        <ChatWindow
          conversation={conversation}
          onClose={() => {
            setIsChatOpen(false);
            setConversation(null);
          }}
        />
      )}
    </>
  );
}