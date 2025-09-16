// Simple browser console test
// Copy and paste this into your browser console on your create-account page

// Test 1: Check if environment variables are loaded
console.log('=== Environment Check ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process?.env?.NEXT_PUBLIC_SUPABASE_URL || 'NOT FOUND');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'NOT FOUND');

// Test 2: Create direct Supabase client
const SUPABASE_URL = 'https://uzsaaxuifuoimgqjxynz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6c2FheHVpZnVvaW1ncWp4eW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MjYxNjMsImV4cCI6MjA1MjMwMjE2M30.XYZ'; // Replace with your actual key

// Test 3: Direct Supabase test
async function testDirectSupabase() {
    try {
        // Create client directly
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        console.log('=== Testing Supabase Auth ===');
        
        // Test auth sign-up
        const { data, error } = await supabase.auth.signUp({
            email: 'debug-' + Date.now() + '@example.com',
            password: 'testpass123'
        });

        if (error) {
            console.error('❌ Auth Error:', error.message);
            console.error('Error Details:', error);
        } else {
            console.log(' Auth Success! User:', data.user);
            console.log(' Session:', data.session);
        }

    } catch (error) {
        console.error('❌ Connection Error:', error.message);
    }
}

// Run the test
testDirectSupabase();