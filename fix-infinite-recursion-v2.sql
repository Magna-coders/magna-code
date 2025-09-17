-- Fix infinite recursion in conversation_participants RLS policies - VERSION 2
-- Updated to handle existing policies gracefully and prevent duplicate policy errors

-- Step 1: Force drop all existing policies (using DO block to handle any policy names)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on conversation_participants
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename = 'conversation_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, policy_record.tablename);
    END LOOP;
    
    -- Drop all policies on conversations
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename = 'conversations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, policy_record.tablename);
    END LOOP;
    
    -- Drop all policies on messages
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, policy_record.tablename);
    END LOOP;
END $$;

-- Step 2: Create new non-recursive policies

-- Conversation participants policies
CREATE POLICY "Users can view their own participation" ON public.conversation_participants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can add themselves to conversations" ON public.conversation_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" ON public.conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can remove themselves from conversations" ON public.conversation_participants
    FOR DELETE USING (user_id = auth.uid());

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM public.conversation_participants cp 
            WHERE cp.conversation_id = conversations.id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update conversations they participate in" ON public.conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 
            FROM public.conversation_participants cp 
            WHERE cp.conversation_id = conversations.id 
            AND cp.user_id = auth.uid()
        )
    );

-- Messages policies
CREATE POLICY "Users can view messages in conversations they participate in" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM public.conversation_participants cp 
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages in conversations they participate in" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() 
        AND EXISTS (
            SELECT 1 
            FROM public.conversation_participants cp 
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can edit their own messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE USING (sender_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- Quick verification
SELECT 'Policies created successfully' as status, 
       (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations') as conversation_policies,
       (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversation_participants') as participant_policies,
       (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages') as message_policies;