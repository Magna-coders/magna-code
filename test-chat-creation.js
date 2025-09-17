// Test script to verify chat creation works
// Run this in browser console at http://localhost:3000/members

async function testChatCreation() {
  console.log('=== Testing Chat Creation ===');
  
  try {
    // Test 1: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      return;
    }
    console.log('✓ User authenticated:', user.id);

    // Test 2: Get list of other users (members)
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, username')
      .neq('id', user.id)
      .limit(1);
    
    if (membersError || !members || members.length === 0) {
      console.error('No members found:', membersError);
      return;
    }
    
    const otherUser = members[0];
    console.log('✓ Found member:', otherUser.username, otherUser.id);

    // Test 3: Try to create a conversation
    console.log('Creating conversation with:', otherUser.username);
    
    // Import the function dynamically
    const { getOrCreateDirectConversation } = await import('/lib/supabase/chat-fixed.js');
    
    const conversation = await getOrCreateDirectConversation(otherUser.id);
    console.log('✓ Conversation created:', conversation);
    
    alert('Chat creation test successful! Check console for details.');
    
  } catch (error) {
    console.error('❌ Chat creation test failed:', error);
    alert('Chat creation failed: ' + error.message);
  }
}

// Instructions for user
console.log('To test chat creation:');
console.log('1. Go to http://localhost:3000/members');
console.log('2. Open browser console (F12)');
console.log('3. Run: testChatCreation()');
console.log('4. Check console for results');

// Make it available globally
window.testChatCreation = testChatCreation;