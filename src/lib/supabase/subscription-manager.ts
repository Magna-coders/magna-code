import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Message, Conversation } from '../../../types/chat';

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
              // Transform data to match Message interface
              const messageData: Message = {
                id: data.id,
                conversation_id: data.conversation_id,
                sender_id: data.sender_id,
                content: data.content,
                message_type: data.message_type || 'text',
                created_at: data.created_at,
                edited_at: data.edited_at,
                is_edited: data.is_edited || false,
                sender: Array.isArray(data.sender) ? data.sender[0] : data.sender
              };

              // Notify all message subscribers
              const callbacks = this.messageSubscribers.get(channelKey);
              if (callbacks) {
                callbacks.forEach(cb => cb(messageData));
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
              // Transform data to match Conversation interface
              const conversationData: Conversation = {
                id: data.id,
                type: data.type,
                name: data.name,
                created_at: data.created_at,
                updated_at: data.updated_at,
                participants: (data.participants || []).map((participant: any) => ({
                  user_id: participant.user_id,
                  joined_at: participant.joined_at,
                  last_read_at: participant.last_read_at,
                  user: Array.isArray(participant.user) ? participant.user[0] : participant.user
                })),
                last_message: data.last_message ? {
                  content: Array.isArray(data.last_message) ? (data.last_message[0] as any).content : (data.last_message as any).content,
                  created_at: Array.isArray(data.last_message) ? (data.last_message[0] as any).created_at : (data.last_message as any).created_at,
                  sender: {
                    username: Array.isArray(data.last_message) ? 
                      ((data.last_message[0] as any).sender?.username || '') : 
                      ((data.last_message as any).sender?.username || '')
                  }
                } : undefined
              };

              // Notify all conversation subscribers
              const callbacks = this.conversationSubscribers.get(channelKey);
              if (callbacks) {
                callbacks.forEach(cb => cb(conversationData));
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