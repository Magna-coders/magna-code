-- 🚨 URGENT FIX: Infinite recursion in conversation_participants RLS policies
-- Run this in your Supabase SQL editor to fix the chat button error

-- Step 1: Emergency cleanup - drop all problematic policies
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Force drop all policies on conversation_participants
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'conversation_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_participants', policy_record.policyname);
    END LOOP;
    
    -- Force drop all policies on conversations
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'conversations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', policy_record.policyname);
    END LOOP;
    
    -- Force drop all policies on messages
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', policy_record.policyname);
    END LOOP;
END $$;

-- Step 2: Create safe, non-recursive policies

-- 🔒 Conversation participants policies (simplified)
CREATE POLICY "Users view own participation" ON public.conversation_participants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users add themselves" ON public.conversation_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own participation" ON public.conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users remove themselves" ON public.conversation_participants
    FOR DELETE USING (user_id = auth.uid());

-- 🔒 Conversations policies (using EXISTS to avoid recursion)
CREATE POLICY "Users view their conversations" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM public.conversation_participants cp 
            WHERE cp.conversation_id = conversations.id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users create conversations" ON public.conversations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users update their conversations" ON public.conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 
            FROM public.conversation_participants cp 
            WHERE cp.conversation_id = conversations.id 
            AND cp.user_id = auth.uid()
        )
    );

-- 🔒 Messages policies (using EXISTS to avoid recursion)
CREATE POLICY "Users view messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 
            FROM public.conversation_participants cp 
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users send messages" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() 
        AND EXISTS (
            SELECT 1 
            FROM public.conversation_participants cp 
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users edit own messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users delete own messages" ON public.messages
    FOR DELETE USING (sender_id = auth.uid());

-- Step 3: Ensure RLS is properly enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_conv_part_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_part_conv_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- ✅ Verification
SELECT '✅ Fix applied successfully' as status,
       (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations') as conv_policies,
       (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversation_participants') as part_policies,
       (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages') as msg_policies;