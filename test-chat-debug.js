// Test script to debug chat creation issues
// Run this in your browser console when on the members page

async function testChatCreation() {
  console.log('=== Starting Chat Creation Test ===');
  
  try {
    // Test 1: Check authentication
    console.log('1. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth Error:', authError?.message || 'No user logged in');
      return;
    }
    console.log('✓ User authenticated:', user.id);

    // Test 2: Get available members
    console.log('2. Getting available members...');
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, username')
      .neq('id', user.id)
      .limit(5);
    
    if (membersError) {
      console.error('Members Error:', membersError);
      return;
    }
    
    if (!members || members.length === 0) {
      console.log('⚠ No members found to test with');
      return;
    }
    
    console.log('✓ Found members:', members);
    const testMember = members[0];
    console.log('Testing with member:', testMember.id);

    // Test 3: Try to create conversation
    console.log('3. Creating conversation...');
    
    // Import the function dynamically
    const { getOrCreateDirectConversation } = await import('/lib/supabase/chat-fixed.js');
    
    console.log('Function loaded, attempting to create conversation...');
    const conversation = await getOrCreateDirectConversation(testMember.id);
    console.log('✓ Conversation created:', conversation);
    
    // Test 4: Try to send a message
    console.log('4. Sending test message...');
    const { sendMessage } = await import('/lib/supabase/chat-fixed.js');
    const message = await sendMessage(conversation.id, 'Hello! This is a test message.');
    console.log('✓ Message sent:', message);

    console.log('=== All tests passed! ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the test
console.log('Available test function: testChatCreation()');
console.log('Run: await testChatCreation()');