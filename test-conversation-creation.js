// Test script to verify conversation creation works
// Run this in your browser console after applying the SQL fix

async function testConversationCreation() {
  try {
    console.log('Testing conversation creation...');
    
    // Test 1: Check if we can create a conversation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return;
    }

    console.log('Authenticated as:', user.id);

    // Test 2: Try to create a conversation
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({ 
        type: 'direct',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create conversation:', createError);
    } else {
      console.log('✅ Conversation created successfully:', conversation.id);
    }

    // Test 3: Try to add participants
    if (conversation) {
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          joined_at: new Date().toISOString()
        });

      if (participantError) {
        console.error('Failed to add participant:', participantError);
      } else {
        console.log('✅ Participant added successfully');
      }

      // Clean up test conversation
      await supabase.from('conversations').delete().eq('id', conversation.id);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testConversationCreation();