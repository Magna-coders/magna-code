import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

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
  subscribeToMessages(conversationId: string, callback: (message: any) => void): () => void {
    const channelKey = `messages:${conversationId}`;
    
    // Add callback to subscribers
    if (!this.subscribers.has(channelKey)) {
      this.subscribers.set(channelKey, new Set());
    }
    this.subscribers.get(channelKey)!.add(callback);

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
              .select('id, sender_id, content, created_at, sender:users(id, username, avatar_url)')
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              // Notify all subscribers
              const callbacks = this.subscribers.get(channelKey);
              if (callbacks) {
                callbacks.forEach(cb => cb(data));
              }
            }
          }
        )
        .subscribe();

      this.subscriptions.set(channelKey, channel);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(channelKey);
      if (callbacks) {
        callbacks.delete(callback);
        
        // If no more subscribers, remove the channel
        if (callbacks.size === 0) {
          const channel = this.subscriptions.get(channelKey);
          if (channel) {
            supabase.removeChannel(channel);
            this.subscriptions.delete(channelKey);
            this.subscribers.delete(channelKey);
          }
        }
      }
    };
  }

  /**
   * Subscribe to conversation updates for a user
   * Only one subscription per user
   */
  subscribeToConversations(userId: string, callback: (conversation: any) => void): () => void {
    const channelKey = `conversations:${userId}`;
    
    if (!this.subscribers.has(channelKey)) {
      this.subscribers.set(channelKey, new Set());
    }
    this.subscribers.get(channelKey)!.add(callback);

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
          (payload) => {
            const callbacks = this.subscribers.get(channelKey);
            if (callbacks) {
              callbacks.forEach(cb => cb(payload.new));
            }
          }
        )
        .subscribe();

      this.subscriptions.set(channelKey, channel);
    }

    return () => {
      const callbacks = this.subscribers.get(channelKey);
      if (callbacks) {
        callbacks.delete(callback);
        
        if (callbacks.size === 0) {
          const channel = this.subscriptions.get(channelKey);
          if (channel) {
            supabase.removeChannel(channel);
            this.subscriptions.delete(channelKey);
            this.subscribers.delete(channelKey);
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
    this.subscribers.clear();
  }

  /**
   * Get active subscription count for monitoring
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

export const subscriptionManager = SubscriptionManager.getInstance();