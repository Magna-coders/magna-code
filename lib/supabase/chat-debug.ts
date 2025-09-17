import { supabase } from '../supabase/client';
import { Message, Conversation, ChatParticipant } from '../../types/chat';

// Enhanced version with better error handling and debugging

// Get or create direct conversation with detailed error handling
export async function getOrCreateDirectConversation(otherUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  if (!otherUserId) {
    throw new Error('Target user ID is required');
  }

  if (user.id === otherUserId) {
    throw new Error('Cannot create conversation with yourself');
  }

  console.log('Starting getOrCreateDirectConversation with:', {
    currentUserId: user.id,
    targetUserId: otherUserId
  });

  try {
    // Step 1: Check if a direct conversation already exists
    console.log('Step 1: Checking for existing conversations...');
    
    // Get all conversations for the current user
    const { data: userConversations, error: userError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (userError) {
      console.error('Error getting user conversations:', userError);
      throw new Error(`Failed to get user conversations: ${userError.message}`);
    }

    console.log('User conversations found:', userConversations?.length || 0);

    if (userConversations && userConversations.length > 0) {
      const conversationIds = userConversations.map(uc => uc.conversation_id);
      console.log('Checking conversation IDs:', conversationIds);

      // Check each conversation for the target user
      for (const convId of conversationIds) {
        console.log(`Checking conversation ${convId}...`);
        
        const { data: participants, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convId);

        if (participantsError) {
          console.error(`Error checking participants for conversation ${convId}:`, participantsError);
          continue;
        }

        const participantIds = participants?.map(p => p.user_id) || [];
        console.log(`Conversation ${convId} participants:`, participantIds);

        // Check if this is a direct conversation with exactly these two users
        const hasCurrentUser = participantIds.includes(user.id);
        const hasTargetUser = participantIds.includes(otherUserId);
        const isDirect = participantIds.length === 2;

        if (hasCurrentUser && hasTargetUser && isDirect) {
          console.log(`Found existing direct conversation: ${convId}`);
          
          // Get full conversation details
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

          if (fullError) {
            console.error('Error getting full conversation:', fullError);
            continue;
          }

          console.log('Returning existing conversation:', fullConversation);
          return fullConversation;
        }
      }
    }

    // Step 2: Create new conversation
    console.log('Step 2: Creating new conversation...');
    
    const conversation = await createConversation('direct');
    console.log('Created conversation:', conversation);

    // Step 3: Add participants
    console.log('Step 3: Adding participants...');
    
    try {
      await Promise.all([
        addConversationParticipant(conversation.id, user.id),
        addConversationParticipant(conversation.id, otherUserId)
      ]);
      console.log('Successfully added both participants');
    } catch (participantError) {
      console.error('Error adding participants:', participantError);
      // Clean up the conversation if adding participants fails
      await supabase.from('conversations').delete().eq('id', conversation.id);
      throw new Error(`Failed to add participants: ${participantError instanceof Error ? participantError.message : 'Unknown error'}`);
    }

    // Step 4: Get the complete conversation
    console.log('Step 4: Getting complete conversation...');
    
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

    if (newError) {
      console.error('Error getting new conversation:', newError);
      throw new Error(`Failed to get new conversation: ${newError.message}`);
    }

    console.log('Successfully created new conversation:', newConversation);
    return newConversation;

  } catch (error) {
    console.error('Critical error in getOrCreateDirectConversation:', error);
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

// Create a new conversation with error handling
async function createConversation(type: 'direct' | 'group' = 'direct') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ type })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data;
}

// Add a participant with error handling
async function addConversationParticipant(conversationId: string, userId: string) {
  if (!conversationId || !userId) {
    throw new Error('Conversation ID and User ID are required');
  }

  const { data, error } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: conversationId,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding participant:', error);
    throw new Error(`Failed to add participant: ${error.message}`);
  }

  return data;
}

// Export the enhanced version
export { createConversation, addConversationParticipant };