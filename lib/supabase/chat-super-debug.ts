import { supabase } from '../supabase/client';
import { Message, Conversation, ChatParticipant } from '../../types/chat';

// Ultra-debug version with maximum error visibility

export async function getOrCreateDirectConversation(otherUserId: string) {
  try {
    // Step 0: Validate environment
    console.log('=== DEBUG: Environment Check ===');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Step 1: Get current user
    console.log('=== DEBUG: Authentication Check ===');
    const authResult = await supabase.auth.getUser();
    console.log('Auth result:', authResult);
    
    if (authResult.error) {
      throw new Error(`Auth error: ${authResult.error.message}`);
    }
    
    const user = authResult.data.user;
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    console.log('Current user:', { id: user.id, email: user.email });
    console.log('Target user ID:', otherUserId);
    
    // Validate inputs
    if (!otherUserId) {
      throw new Error('Target user ID is required');
    }
    
    if (user.id === otherUserId) {
      throw new Error('Cannot create conversation with yourself');
    }
    
    // Step 2: Test basic database connectivity
    console.log('=== DEBUG: Database Connectivity Test ===');
    
    // Test users table
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .limit(2);
    
    console.log('Users test:', { data: usersTest?.length, error: usersError });
    
    // Test conversations table
    const { data: convTest, error: convError } = await supabase
      .from('conversations')
      .select('id, type')
      .limit(1);
    
    console.log('Conversations test:', { data: convTest?.length, error: convError });
    
    // Test conversation_participants table
    const { data: partTest, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .limit(1);
    
    console.log('Participants test:', { data: partTest?.length, error: partError });
    
    // Step 3: Check for existing conversations
    console.log('=== DEBUG: Existing Conversations Check ===');
    
    // Get current user's conversations
    const { data: currentUserConversations, error: currentUserError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);
    
    console.log('Current user conversations:', { 
      count: currentUserConversations?.length, 
      error: currentUserError,
      data: currentUserConversations 
    });
    
    if (currentUserError) {
      throw new Error(`Failed to get current user conversations: ${currentUserError.message}`);
    }
    
    // Check target user's conversations
    const { data: targetUserConversations, error: targetUserError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId);
    
    console.log('Target user conversations:', { 
      count: targetUserConversations?.length, 
      error: targetUserError,
      data: targetUserConversations 
    });
    
    if (targetUserError) {
      throw new Error(`Failed to get target user conversations: ${targetUserError.message}`);
    }
    
    // Find common conversations
    if (currentUserConversations && targetUserConversations) {
      const currentUserConvIds = currentUserConversations.map(c => c.conversation_id);
      const targetUserConvIds = targetUserConversations.map(c => c.conversation_id);
      
      console.log('Current user conv IDs:', currentUserConvIds);
      console.log('Target user conv IDs:', targetUserConvIds);
      
      const commonConvIds = currentUserConvIds.filter(id => targetUserConvIds.includes(id));
      console.log('Common conversation IDs:', commonConvIds);
      
      // Check each common conversation
      for (const convId of commonConvIds) {
        console.log(`=== DEBUG: Checking conversation ${convId} ===`);
        
        const { data: allParticipants, error: allParticipantsError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convId);
        
        console.log(`Conversation ${convId} participants:`, { 
          count: allParticipants?.length, 
          users: allParticipants?.map(p => p.user_id),
          error: allParticipantsError 
        });
        
        if (!allParticipantsError && allParticipants) {
          const participantIds = allParticipants.map(p => p.user_id);
          const isDirect = participantIds.length === 2 && 
                          participantIds.includes(user.id) && 
                          participantIds.includes(otherUserId);
          
          if (isDirect) {
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
            } else {
              console.log('Returning existing conversation:', fullConversation);
              return fullConversation;
            }
          }
        }
      }
    }
    
    // Step 4: Create new conversation
    console.log('=== DEBUG: Creating New Conversation ===');
    
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .single();
    
    console.log('New conversation creation:', { data: newConversation, error: createError });
    
    if (createError) {
      throw new Error(`Failed to create conversation: ${createError.message}`);
    }
    
    if (!newConversation) {
      throw new Error('Conversation creation returned no data');
    }
    
    // Step 5: Add participants
    console.log('=== DEBUG: Adding Participants ===');
    
    const participantPromises = [
      supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConversation.id, user_id: user.id })
        .select()
        .single(),
      supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConversation.id, user_id: otherUserId })
        .select()
        .single()
    ];
    
    const participantResults = await Promise.allSettled(participantPromises);
    console.log('Participant insertion results:', participantResults);
    
    // Check for any failures
    const failures = participantResults.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('Participant insertion failures:', failures);
      
      // Clean up conversation
      console.log('Cleaning up failed conversation...');
      await supabase.from('conversations').delete().eq('id', newConversation.id);
      
      throw new Error(`Failed to add participants: ${failures[0].reason}`);
    }
    
    // Step 6: Return complete conversation
    console.log('=== DEBUG: Returning Complete Conversation ===');
    
    const { data: completeConversation, error: finalError } = await supabase
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
    
    console.log('Complete conversation:', { data: completeConversation, error: finalError });
    
    if (finalError) {
      throw new Error(`Failed to get complete conversation: ${finalError.message}`);
    }
    
    return completeConversation;
    
  } catch (error) {
    console.error('=== DEBUG: CRITICAL ERROR ===');
    const err = error as Error;
    console.error('Error type:', err.constructor.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    // Re-throw with enhanced information
    const finalErr = error as Error;
    throw new Error(`Chat system error: ${finalErr.message}`);
  }
}

// Helper function to test database connectivity
export async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  try {
    const tests = await Promise.allSettled([
      supabase.from('users').select('count()').single(),
      supabase.from('conversations').select('count()').single(),
      supabase.from('conversation_participants').select('count()').single(),
      supabase.from('messages').select('count()').single()
    ]);
    
    const results = {
      users: tests[0],
      conversations: tests[1],
      participants: tests[2],
      messages: tests[3]
    };
    
    console.log('Database connection test results:', results);
    return results;
  } catch (error) {
    console.error('Database connection test failed:', error);
    const err = error as Error;
    return { error: err.message };
  }
}