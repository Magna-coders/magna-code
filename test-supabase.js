// Test Supabase connection and auth
const { createClient } = require('@supabase/supabase-js');

// Replace with your actual values from .env.local
const supabaseUrl = 'https://uzsaaxuifuoimgqjxynz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6c2FheHVpZnVvaW1ncWp4eW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjIyODIsImV4cCI6MjA3MzMzODI4Mn0.-yWbaRlxKYQ07biSxdtqZka49bc7VIFroNbGfx4y8jI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test 1: Basic connection
    const { data, error } = await supabase.from('users').select('*').limit(1);
    console.log(' Database connection:', error ? '❌ Failed' : '✅ Working');
    if (error) console.error('Database error:', error.message);
    
    // Test 2: Auth check
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (authError) {
      console.error(' Auth error:', authError.message);
      console.error('Error details:', authError);
    } else {
      console.log(' Auth signup working');
      console.log('User ID:', authData.user?.id);
    }
    
  } catch (error) {
    console.error(' Connection failed:', error);
  }
}

testSupabase();