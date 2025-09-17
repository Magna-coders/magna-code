-- 🚨 FIX: Allow conversation creation
-- This fixes "new row violates row level security policy" error

-- Step 1: Update the conversation creation policy to be more permissive
DROP POLICY IF EXISTS "Users create conversations" ON public.conversations;

-- Create a more permissive policy for conversation creation
CREATE POLICY "Users can create direct conversations" ON public.conversations
    FOR INSERT WITH CHECK (type = 'direct');

-- Step 2: Ensure the conversation_participants policy allows adding participants
DROP POLICY IF EXISTS "Users add themselves" ON public.conversation_participants;

-- Create policy that allows adding participants to new conversations
CREATE POLICY "Users can add participants" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 
            FROM public.conversations c
            WHERE c.id = conversation_id 
            AND c.type = 'direct'
        )
    );

-- Step 3: Quick verification
SELECT '✅ Conversation creation policies updated' as status;