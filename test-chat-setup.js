// Simple test to verify chat setup
// Run this in browser console when logged in

async function testChatSetup() {
  try {
    console.log('Testing chat setup...');
    
    // Test 1: Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }
    console.log('✅ User authenticated:', user.id);

    // Test 2: Check if tables exist
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (convError) {
      console.error('❌ Conversations table error:', convError.message);
    } else {
      console.log('✅ Conversations table accessible');
    }

    // Test 3: Check conversation participants table
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('*')
      .limit(1);
    
    if (partError) {
      console.error('❌ Participants table error:', partError.message);
    } else {
      console.log('✅ Participants table accessible');
    }

    // Test 4: Check messages table
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (msgError) {
      console.error('❌ Messages table error:', msgError.message);
    } else {
      console.log('✅ Messages table accessible');
    }

    console.log('🎉 Chat setup test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Instructions for user
console.log('To test chat setup:');
console.log('1. Open browser console (F12)');
console.log('2. Run: testChatSetup()');
console.log('3. Check console output for any errors');