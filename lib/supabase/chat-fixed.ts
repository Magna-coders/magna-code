import { supabase } from '../supabase/client';
import { Conversation } from '../../types/chat';

// Simplified version that avoids infinite recursion by using direct queries

export async function getOrCreateDirectConversation(otherUserId: string) {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error(authError?.message || 'User not authenticated');
    }

    if (!otherUserId) {
      throw new Error('Target user ID is required');
    }

    if (user.id === otherUserId) {
      throw new Error('Cannot create conversation with yourself');
    }

    console.log('Looking for existing conversation between:', user.id, 'and', otherUserId);

    // First, check if a direct conversation already exists between these users
    const { data: existingConversations, error: checkError } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user_id
        )
      `)
      .eq('type', 'direct');

    if (checkError) {
      throw new Error(`Failed to check existing conversations: ${checkError.message}`);
    }

    // Find existing conversation between these two users
    if (existingConversations) {
      for (const conv of existingConversations) {
        const participantIds = conv.participants?.map((p: { user_id: string }) => p.user_id) || [];
        if (participantIds.length === 2 && 
            participantIds.includes(user.id) && 
            participantIds.includes(otherUserId)) {
          console.log('Found existing conversation:', conv.id);
          return conv;
        }
      }
    }

    console.log('No existing conversation found, creating new one...');

    // Create a new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({ 
        type: 'direct',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create conversation: ${createError.message}`);
    }

    console.log('Created conversation:', newConversation.id);

    // Add both users as participants
    try {
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: newConversation.id,
            user_id: user.id,
            joined_at: new Date().toISOString()
          },
          {
            conversation_id: newConversation.id,
            user_id: otherUserId,
            joined_at: new Date().toISOString()
          }
        ]);

      if (participantError) {
        console.error('Failed to add participants:', participantError);
        // Clean up the conversation if participants couldn't be added
        await supabase.from('conversations').delete().eq('id', newConversation.id);
        throw new Error(`Failed to add participants: ${participantError.message}`);
      }

      console.log('Successfully added participants to conversation:', newConversation.id);
      
      // Return the complete conversation with participants
      const { data: completeConversation, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user_id,
            user:user_id(username, avatar_url),
            joined_at
          )
        `)
        .eq('id', newConversation.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch complete conversation: ${fetchError.message}`);
      }

      return completeConversation;

    } catch (participantError) {
      console.error('Error adding participants:', participantError);
      // Clean up the conversation
      await supabase.from('conversations').delete().eq('id', newConversation.id);
      throw participantError;
    }

  } catch (error) {
    console.error('Error in getOrCreateDirectConversation:', error);
    throw error;
  }
}

// Simple function to get conversations for a user
export async function getUserConversations() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error(authError?.message || 'User not authenticated');
    }

    // First, get the conversation IDs the user participates in
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (participantError) {
      throw new Error(`Failed to get participant data: ${participantError.message}`);
    }

    if (!participantData || participantData.length === 0) {
      return [];
    }

    const conversationIds = participantData.map(p => p.conversation_id);

    // Then get the actual conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user_id,
          user:user_id(username, avatar_url)
        )
      `)
      .in('id', conversationIds);

    if (convError) {
      throw new Error(`Failed to get conversations: ${convError.message}`);
    }

    return conversations || [];
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    throw error;
  }
}

// Send a message
export async function sendMessage(conversationId: string, content: string) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error(authError?.message || 'User not authenticated');
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      throw new Error(`Failed to send message: ${messageError.message}`);
    }

    return message;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}

// Get messages for a conversation
export async function getMessages(conversationId: string) {
  try {
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(username, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw new Error(`Failed to get messages: ${messagesError.message}`);
    }

    return messages || [];
  } catch (error) {
    console.error('Error in getMessages:', error);
    throw error;
  }
}