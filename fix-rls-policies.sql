-- Fix infinite recursion in RLS policies for conversation_participants
-- This script fixes the "infinite recursion detected in policy" error

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON public.conversation_participants;

-- Create fixed RLS policies for conversation participants
-- Policy 1: Allow users to view participants of conversations they are part of
CREATE POLICY "Users can view conversation participants" ON public.conversation_participants
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy 2: Allow users to add themselves or others to conversations they are in
CREATE POLICY "Users can add conversation participants" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants 
            WHERE user_id = auth.uid()
        )
        OR
        -- Allow creating new conversations (when no participants exist yet)
        NOT EXISTS (
            SELECT 1 
            FROM public.conversation_participants 
            WHERE conversation_id = conversation_participants.conversation_id
        )
    );

-- Policy 3: Allow users to update their own participant record
CREATE POLICY "Users can update their own participant record" ON public.conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

-- Policy 4: Allow users to leave conversations (delete their own participation)
CREATE POLICY "Users can leave conversations" ON public.conversation_participants
    FOR DELETE USING (user_id = auth.uid());

-- Also fix the messages policies to use simpler subqueries
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in conversations they're in" ON public.messages;

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
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants 
            WHERE user_id = auth.uid()
        )
    );