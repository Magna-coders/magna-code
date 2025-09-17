'use client';

import { useState } from 'react';

import { supabase } from '@/lib/supabase/client';

export default function DebugChat() {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runDebugTests = async () => {
    setIsLoading(true);
    setDebugInfo('Starting debug tests...\n');

    try {
      // Test 1: Authentication
      setDebugInfo(prev => prev + '\n=== Authentication Test ===\n');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        setDebugInfo(prev => prev + `Auth Error: ${authError.message}\n`);
        return;
      }
      
      if (!user) {
        setDebugInfo(prev => prev + 'No authenticated user found\n');
        return;
      }
      
      setDebugInfo(prev => prev + `✓ User authenticated: ${user.email} (${user.id})\n`);

      // Test 2: Database tables
      setDebugInfo(prev => prev + '\n=== Database Tables Test ===\n');
      
      const tables = ['users', 'conversations', 'conversation_participants', 'messages'];
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('count()')
            .single();
          
          if (error) {
            setDebugInfo(prev => prev + `❌ ${table}: ${error.message}\n`);
          } else {
            setDebugInfo(prev => prev + `✓ ${table}: ${data.count} records\n`);
          }
        } catch (e) {
          const error = e as Error;
          setDebugInfo(prev => prev + `❌ ${table}: ${error.message}\n`);
        }
      }

      // Test 3: RLS Policies
      setDebugInfo(prev => prev + '\n=== RLS Policy Test ===\n');
      
      // Test reading from conversations
      const { data: convTest, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .limit(1);
      
      if (convError) {
        setDebugInfo(prev => prev + `❌ Conversations RLS: ${convError.message}\n`);
      } else {
        setDebugInfo(prev => prev + `✓ Conversations RLS: ${convTest?.length || 0} records accessible\n`);
      }

      // Test 4: User data
      setDebugInfo(prev => prev + '\n=== User Data Test ===\n');
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        setDebugInfo(prev => prev + `❌ User profile: ${profileError.message}\n`);
      } else {
        setDebugInfo(prev => prev + `✓ User profile: ${userProfile.username} (${userProfile.email})\n`);
      }

      setDebugInfo(prev => prev + '\n✅ All tests completed! Check browser console for more details.\n');

} catch (error) {
      const err = error as Error;
      setDebugInfo(prev => prev + `\n❌ Unexpected error: ${err.message}\n`);
      console.error('Debug test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Chat System Debug</h3>
      <button
        onClick={runDebugTests}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Running...' : 'Run Debug Tests'}
      </button>
      
      {debugInfo && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Debug Results:</h4>
          <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-auto max-h-96">
            {debugInfo}
          </pre>
        </div>
      )}
    </div>
  );
}