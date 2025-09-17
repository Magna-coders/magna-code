-- 🔍 DEBUG: Identify the exact RLS violation for conversations
-- Run these queries in your Supabase SQL editor to find the problem

-- Step 1: Check current policies on conversations
SELECT 'Current Conversation Policies' as step, 
       policyname,
       cmd,
       qual,
       with_check
FROM pg_policies 
WHERE tablename = 'conversations'
ORDER BY policyname;

-- Step 2: Check if RLS is enabled
SELECT 'RLS Status' as step,
       tablename,
       rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'conversations';

-- Step 3: Test what happens when we try to insert
-- This will show the exact violation
SELECT 'Testing INSERT with auth context' as step,
       auth.uid() as current_user_id,
       CASE 
         WHEN auth.uid() IS NULL THEN '❌ No authenticated user'
         ELSE '✅ User authenticated: ' || auth.uid()
       END as auth_status;

-- Step 4: Check table structure for required fields
SELECT 'Table Structure' as step,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_name = 'conversations'
ORDER BY ordinal_position;

-- Step 5: Check for any constraints or triggers
SELECT 'Constraints' as step,
       conname as constraint_name,
       contype as type,
       pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.conversations'::regclass;

-- Step 6: Try a manual insert to see exact error
-- DO NOT run this in production, just for testing:
-- INSERT INTO conversations (type, created_at) 
-- VALUES ('direct', NOW()) 
-- RETURNING id;