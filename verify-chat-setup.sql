-- Verify chat system setup and RLS policies
-- Run these queries in your Supabase SQL editor

-- 1. Check if tables exist
SELECT 'conversations' as table_name, count(*) as row_count FROM conversations
UNION ALL
SELECT 'conversation_participants' as table_name, count(*) as row_count FROM conversation_participants
UNION ALL
SELECT 'messages' as table_name, count(*) as row_count FROM messages;

-- 2. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename, policyname;

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages');

-- 4. Test basic insert (run as authenticated user)
-- This should work if RLS policies are correct
INSERT INTO conversations (type) VALUES ('direct') RETURNING id;

-- 5. Check for any constraint violations
SELECT 
    conname,
    contype,
    convalidated
FROM pg_constraint 
WHERE conrelid::regclass::text IN ('conversations', 'conversation_participants', 'messages');