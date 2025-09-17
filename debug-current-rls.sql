-- 🐛 DEBUG: Find exactly what's causing the RLS violation
-- Run these queries to diagnose the issue

-- 1. Check current policies on conversations
SELECT 
    policyname,
    cmd,
    with_check,
    permissive
FROM pg_policies 
WHERE tablename = 'conversations' AND cmd = 'INSERT';

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'conversations';

-- 3. Test what auth.uid() returns
SELECT auth.uid() as current_user_id;

-- 4. Check if user exists in auth.users
SELECT * FROM auth.users WHERE id = auth.uid();

-- 5. Test a simple INSERT to see exact error
INSERT INTO conversations (title, type, created_by) 
VALUES ('Test conversation', 'direct', auth.uid())
RETURNING *;