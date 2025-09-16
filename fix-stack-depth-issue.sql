-- CRITICAL FIX: Stack depth limit exceeded error
-- This resolves circular dependencies in database triggers

-- Step 1: Drop the problematic triggers causing infinite loops
DROP TRIGGER IF EXISTS update_user_completeness ON public.users;
DROP TRIGGER IF EXISTS update_skills_completeness ON public.user_skills;

-- Step 2: Create an improved completeness function that avoids infinite loops
CREATE OR REPLACE FUNCTION public.update_profile_completeness()
RETURNS TRIGGER AS $$
DECLARE
    current_completeness INTEGER;
    new_completeness INTEGER;
BEGIN
    -- Only update if the completeness actually changed
    SELECT profile_complete_percentage INTO current_completeness 
    FROM public.users WHERE id = NEW.id;
    
    new_completeness := public.calculate_profile_completeness(NEW.id);
    
    -- Only update if the value actually changed to prevent infinite loops
    IF new_completeness IS DISTINCT FROM current_completeness THEN
        UPDATE public.users 
        SET profile_complete_percentage = new_completeness
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the trigger with a condition to prevent recursion
CREATE TRIGGER update_user_completeness
    AFTER UPDATE ON public.users
    FOR EACH ROW 
    WHEN (OLD.profile_complete_percentage IS DISTINCT FROM public.calculate_profile_completeness(NEW.id))
    EXECUTE FUNCTION public.update_profile_completeness();

-- Step 4: Create trigger for skills changes (only affects completeness, not updated_at)
CREATE TRIGGER update_skills_completeness
    AFTER INSERT OR DELETE OR UPDATE ON public.user_skills
    FOR EACH ROW EXECUTE FUNCTION public.update_profile_completeness();

-- Step 5: Run this to fix any existing infinite loop issues
-- This will recalculate completeness for all users without triggering updates
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM public.users LOOP
        UPDATE public.users 
        SET profile_complete_percentage = public.calculate_profile_completeness(user_record.id)
        WHERE id = user_record.id
        AND profile_complete_percentage IS DISTINCT FROM public.calculate_profile_completeness(user_record.id);
    END LOOP;
END $$;

-- Step 6: Test the fix
-- Run this to verify the fix works:
/*
-- Test profile update
UPDATE public.users 
SET bio = 'Test bio update ' || NOW()::text
WHERE id = (SELECT id FROM public.users LIMIT 1);

-- Should complete without stack depth errors
SELECT 'SUCCESS: Profile update completed without stack depth errors';
*/

-- Step 7: Additional debugging - Check for any remaining trigger issues
/*
-- View all triggers on users table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND event_object_schema = 'public';

-- Check for any circular dependencies
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'users';
*/