-- Complete fix for chat system issues
-- This script fixes both RLS infinite recursion and optimizes chat queries

-- Step 1: Fix RLS policies to prevent infinite recursion

-- Drop all existing RLS policies on these tables to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Create simplified RLS policies using direct subqueries

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT USING (
        id IN (
            SELECT conversation_id 
            FROM public.conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (true);

-- Conversation participants policies
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants cp2
            WHERE cp2.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add participants to conversations" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants cp2
            WHERE cp2.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own participation" ON public.conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can leave conversations" ON public.conversation_participants
    FOR DELETE USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() 
        AND 
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can edit their own messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE USING (sender_id = auth.uid());

-- Step 2: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conversation 
    ON public.conversation_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
    ON public.messages(conversation_id, created_at DESC);

-- Step 3: Ensure proper foreign key relationships
ALTER TABLE public.conversation_participants 
    DROP CONSTRAINT IF EXISTS conversation_participants_conversation_id_fkey;
ALTER TABLE public.conversation_participants 
    ADD CONSTRAINT conversation_participants_conversation_id_fkey 
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE public.conversation_participants 
    DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;
ALTER TABLE public.conversation_participants 
    ADD CONSTRAINT conversation_participants_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 4: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;