-- 🔍 Verify auth context is working for chat functionality
-- Run these queries to check if auth is properly configured

-- Test 1: Check if auth.users table has your user
SELECT 'Auth Users Check' as test_name, 
       count(*) as user_count,
       (SELECT email FROM auth.users LIMIT 1) as first_user_email
FROM auth.users;

-- Test 2: Check RLS policies are using auth.uid() correctly
SELECT 'RLS Policies Check' as test_name,
       tablename,
       policyname,
       cmd,
       qual
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename, policyname;

-- Test 3: Test if auth.uid() works in Supabase SQL editor
SELECT 'Current Auth User' as test_name,
       auth.uid() as current_user_id,
       CASE 
         WHEN auth.uid() IS NOT NULL THEN '✅ Auth working'
         ELSE '❌ Auth not working'
       END as status;

-- Test 4: Check if your user can see conversations
SELECT 'User Conversations Access' as test_name,
       count(*) as accessible_conversations
FROM conversations c
WHERE EXISTS (
  SELECT 1 FROM conversation_participants cp 
  WHERE cp.conversation_id = c.id 
  AND cp.user_id = auth.uid()
);