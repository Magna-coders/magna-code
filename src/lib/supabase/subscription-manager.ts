import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Message, Conversation } from '../../../types/chat';

// Type interfaces for Supabase query results
interface SupabaseMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  created_at: string;
  edited_at?: string;
  is_edited?: boolean;
  sender: {
    id: string;
    username: string;
    avatar_url?: string;
  } | {
    id: string;
    username: string;
    avatar_url?: string;
  }[];
}

interface SupabaseConversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  created_at: string;
  updated_at: string;
  participants: {
    user_id: string;
    joined_at: string;
    last_read_at?: string;
    user: {
      id: string;
      username: string;
      avatar_url?: string;
    } | {
      id: string;
      username: string;
      avatar_url?: string;
    }[];
  }[];
  last_message?: {
    content: string;
    created_at: string;
    sender: {
      id: string;
      username: string;
      avatar_url?: string;
    } | {
      id: string;
      username: string;
      avatar_url?: string;
    }[];
  } | {
    content: string;
    created_at: string;
    sender: {
      id: string;
      username: string;
      avatar_url?: string;
    } | {
      id: string;
      username: string;
      avatar_url?: string;
    }[];
  }[];
}

class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private messageSubscribers: Map<string, Set<(message: Message) => void>> = new Map();
  private conversationSubscribers: Map<string, Set<(conversation: Conversation) => void>> = new Map();

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  /**
   * Subscribe to messages for a conversation
   * Reuses existing channel if already subscribed
   */
  subscribeToMessages(conversationId: string, callback: (message: Message) => void): () => void {
    const channelKey = `messages:${conversationId}`;
    
    // Add callback to message subscribers
    if (!this.messageSubscribers.has(channelKey)) {
      this.messageSubscribers.set(channelKey, new Set());
    }
    this.messageSubscribers.get(channelKey)!.add(callback);

    // Create channel if it doesn't exist
    if (!this.subscriptions.has(channelKey)) {
      const channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          async (payload) => {
            // Fetch complete message data
            const { data, error } = await supabase
              .from('messages')
              .select('id, conversation_id, sender_id, content, message_type, created_at, edited_at, is_edited, sender:users(id, username, avatar_url)')
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              const messageData = data as SupabaseMessage;
              // Transform data to match Message interface
              const transformedMessage: Message = {
                id: messageData.id,
                conversation_id: messageData.conversation_id,
                sender_id: messageData.sender_id,
                content: messageData.content,
                message_type: (messageData.message_type as 'text' | 'image' | 'file') || 'text',
                created_at: messageData.created_at,
                edited_at: messageData.edited_at,
                is_edited: messageData.is_edited || false,
                sender: Array.isArray(messageData.sender) ? messageData.sender[0] : messageData.sender
              };

              // Notify all message subscribers
              const callbacks = this.messageSubscribers.get(channelKey);
              if (callbacks) {
                callbacks.forEach(cb => cb(transformedMessage));
              }
            }
          }
        )
        .subscribe();

      this.subscriptions.set(channelKey, channel);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.messageSubscribers.get(channelKey);
      if (callbacks) {
        callbacks.delete(callback);
        
        // If no more subscribers, remove the channel
        if (callbacks.size === 0) {
          const channel = this.subscriptions.get(channelKey);
          if (channel) {
            supabase.removeChannel(channel);
            this.subscriptions.delete(channelKey);
            this.messageSubscribers.delete(channelKey);
          }
        }
      }
    };
  }

  /**
   * Subscribe to conversation updates for a user
   * Only one subscription per user
   */
  subscribeToConversations(userId: string, callback: (conversation: Conversation) => void): () => void {
    const channelKey = `conversations:${userId}`;
    
    if (!this.conversationSubscribers.has(channelKey)) {
      this.conversationSubscribers.set(channelKey, new Set());
    }
    this.conversationSubscribers.get(channelKey)!.add(callback);

    if (!this.subscriptions.has(channelKey)) {
      const channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friend_conversations',
            filter: `or(user1_id.eq.${userId},user2_id.eq.${userId})`
          },
          async (payload) => {
            // Fetch complete conversation data
            const { data, error } = await supabase
              .from('conversations')
              .select('id, type, name, created_at, updated_at, participants:user_conversations(user_id, joined_at, last_read_at, user:users(id, username, avatar_url)), last_message:messages!inner(content, created_at, sender:sender_id(id, username, avatar_url))')
              .eq('id', payload.new.conversation_id)
              .single();

            if (!error && data) {
              const conversationData = data as SupabaseConversation;
              // Transform data to match Conversation interface
              const transformedConversation: Conversation = {
                id: conversationData.id,
                type: conversationData.type,
                name: conversationData.name,
                created_at: conversationData.created_at,
                updated_at: conversationData.updated_at,
                participants: (conversationData.participants || []).map((participant) => ({
                  user_id: participant.user_id,
                  joined_at: participant.joined_at,
                  last_read_at: participant.last_read_at,
                  user: Array.isArray(participant.user) ? participant.user[0] : participant.user
                })),
                last_message: conversationData.last_message ? (() => {
                  const lastMsg = Array.isArray(conversationData.last_message) ? conversationData.last_message[0] : conversationData.last_message;
                  const sender = Array.isArray(lastMsg.sender) ? lastMsg.sender[0] : lastMsg.sender;
                  return {
                    content: lastMsg.content,
                    created_at: lastMsg.created_at,
                    sender: {
                      username: sender?.username || ''
                    }
                  };
                })() : undefined
              };

              // Notify all conversation subscribers
              const callbacks = this.conversationSubscribers.get(channelKey);
              if (callbacks) {
                callbacks.forEach(cb => cb(transformedConversation));
              }
            }
          }
        )
        .subscribe();

      this.subscriptions.set(channelKey, channel);
    }

    return () => {
      const callbacks = this.conversationSubscribers.get(channelKey);
      if (callbacks) {
        callbacks.delete(callback);
        
        if (callbacks.size === 0) {
          const channel = this.subscriptions.get(channelKey);
          if (channel) {
            supabase.removeChannel(channel);
            this.subscriptions.delete(channelKey);
            this.conversationSubscribers.delete(channelKey);
          }
        }
      }
    };
  }

  /**
   * Clean up all subscriptions (call on app unmount)
   */
  cleanup(): void {
    this.subscriptions.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    this.messageSubscribers.clear();
    this.conversationSubscribers.clear();
  }

  /**
   * Get active subscription count for monitoring
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

export const subscriptionManager = SubscriptionManager.getInstance();