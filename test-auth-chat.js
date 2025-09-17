// 🧪 Quick test to verify auth is working with chat button
// Run this in your browser console when on the members page

async function testAuthAndChat() {
  try {
    console.log('🔍 Testing auth and chat functionality...');
    
    // Test 1: Check if user is authenticated
    const { data: { user }, error: authError } = await window.supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Auth Error:', authError?.message || 'User not authenticated');
      alert('Not logged in. Please log in first.');
      return false;
    }
    
    console.log('✅ User authenticated:', user.id, user.email);
    
    // Test 2: Check if we can access the chat functions
    console.log('📞 Testing chat function access...');
    
    // Test 3: Try to get a test conversation (replace with actual member ID)
    const members = document.querySelectorAll('[data-user-id]');
    if (members.length > 0) {
      const targetUserId = members[0].getAttribute('data-user-id');
      console.log('🎯 Target user ID:', targetUserId);
      
      // Test the chat function directly
      const response = await fetch('/api/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });
      
      const result = await response.json();
      console.log('📋 Test result:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Simple auth check function
async function checkAuthStatus() {
  try {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    if (error) throw error;
    
    console.log('✅ Auth Status:', {
      authenticated: !!user,
      userId: user?.id,
      email: user?.email
    });
    
    return user;
  } catch (error) {
    console.error('❌ Auth Check Failed:', error.message);
    return null;
  }
}

// Run the auth check
console.log('🏃 Running auth check...');
checkAuthStatus();