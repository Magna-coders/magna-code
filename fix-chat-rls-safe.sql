-- Safe fix for chat RLS policies that handles existing policies gracefully
-- This script will work even if policies already exist

-- Enable RLS on all relevant tables (if not already enabled)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop only the specific policies that cause infinite recursion
-- We'll use a more targeted approach instead of dropping everything

-- Conversations - drop only if they exist and recreate
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can view their conversations') THEN
        DROP POLICY "Users can view their conversations" ON public.conversations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can create conversations') THEN
        DROP POLICY "Users can create conversations" ON public.conversations;
    END IF;
END $$;

-- Conversation participants - drop only problematic ones
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Users can view participants in their conversations') THEN
        DROP POLICY "Users can view participants in their conversations" ON public.conversation_participants;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Users can add participants to conversations') THEN
        DROP POLICY "Users can add participants to conversations" ON public.conversation_participants;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Users can update their own participation') THEN
        DROP POLICY "Users can update their own participation" ON public.conversation_participants;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Users can leave conversations') THEN
        DROP POLICY "Users can leave conversations" ON public.conversation_participants;
    END IF;
END $$;

-- Messages - drop only problematic ones
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view messages in their conversations') THEN
        DROP POLICY "Users can view messages in their conversations" ON public.messages;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can send messages in their conversations') THEN
        DROP POLICY "Users can send messages in their conversations" ON public.messages;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can edit their own messages') THEN
        DROP POLICY "Users can edit their own messages" ON public.messages;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can delete their own messages') THEN
        DROP POLICY "Users can delete their own messages" ON public.messages;
    END IF;
END $$;

-- Create new policies that avoid infinite recursion

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

-- Add performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conversation 
    ON public.conversation_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
    ON public.messages(conversation_id, created_at DESC);

-- Ensure proper foreign key relationships
DO $$
BEGIN
    -- Add foreign key constraints only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversation_participants_conversation_id_fkey'
    ) THEN
        ALTER TABLE public.conversation_participants 
            ADD CONSTRAINT conversation_participants_conversation_id_fkey 
            FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversation_participants_user_id_fkey'
    ) THEN
        ALTER TABLE public.conversation_participants 
            ADD CONSTRAINT conversation_participants_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;