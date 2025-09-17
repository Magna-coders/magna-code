import { supabase } from './client';
import { Message, Conversation, ChatParticipant } from '@/types/chat';

// Create a new conversation
export async function createConversation(type: 'direct' | 'group', name?: string) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ type, name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Add participants to a conversation
export async function addConversationParticipant(conversationId: string, userId: string) {
  const { data, error } = await supabase
    .from('conversation_participants')
    .insert({ conversation_id: conversationId, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Send a message
export async function sendMessage(conversationId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      message_type: messageType
    })
    .select(`
      *,
      sender:sender_id(username, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Get messages for a conversation
export async function getMessages(conversationId: string, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id(id, username, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Get user's conversations - optimized query to avoid RLS recursion
export async function getUserConversations() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // First, get user's conversation IDs
  const { data: userConversations, error: ucError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id);

  if (ucError) throw ucError;
  if (!userConversations?.length) return [];

  const conversationIds = userConversations.map(uc => uc.conversation_id);

  // Then get full conversation details
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants(
        user_id,
        user:user_id(username, avatar_url),
        joined_at
      ),
      last_message:messages(
        content,
        created_at,
        sender:sender_id(username)
      )
    `)
    .in('id', conversationIds)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Get or create direct conversation - optimized version
export async function getOrCreateDirectConversation(otherUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // First, get all direct conversations for current user
    const { data: userConversations, error: userError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (userError) throw userError;
    if (!userConversations?.length) {
      return await createNewDirectConversation(user.id, otherUserId);
    }

    const conversationIds = userConversations.map(uc => uc.conversation_id);

    // Check each conversation to see if it contains both users
    for (const convId of conversationIds) {
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId);

      if (participantsError) continue;

      const participantIds = participants?.map(p => p.user_id) || [];
      if (participantIds.includes(user.id) && participantIds.includes(otherUserId) && participantIds.length === 2) {
        // Found existing conversation
        const { data: fullConversation, error: fullError } = await supabase
          .from('conversations')
          .select(`
            *,
            participants:conversation_participants(
              user_id,
              user:user_id(username, avatar_url),
              joined_at
            )
          `)
          .eq('id', convId)
          .single();

        if (!fullError && fullConversation) {
          return fullConversation;
        }
      }
    }

    // No existing conversation found, create new one
    return await createNewDirectConversation(user.id, otherUserId);

  } catch (error) {
    console.error('Error in getOrCreateDirectConversation:', error);
    throw error;
  }
}

// Helper function to create new direct conversation
async function createNewDirectConversation(userId: string, otherUserId: string) {
  const conversation = await createConversation('direct');
  
  await Promise.all([
    addConversationParticipant(conversation.id, userId),
    addConversationParticipant(conversation.id, otherUserId)
  ]);

  const { data: newConversation, error: newError } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants(
        user_id,
        user:user_id(username, avatar_url),
        joined_at
      )
    `)
    .eq('id', conversation.id)
    .single();

  if (newError) throw newError;
  return newConversation;
}

// Subscribe to new messages in real-time
export function subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
  const subscription = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();

  return subscription;
}

// Mark messages as read
export async function markMessagesAsRead(conversationId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  if (error) throw error;
}

// Get unread message count
export async function getUnreadMessageCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      last_read_at,
      messages:messages(count)
    `)
    .eq('user_id', user.id)
    .not('messages.created_at', 'is', null)
    .filter('messages.created_at', 'gt', 'last_read_at');

  if (error) throw error;
  return data;
}