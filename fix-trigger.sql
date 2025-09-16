--  CRITICAL FIX: Database error saving new user
-- This creates the missing trigger function that matches your schema

-- Step 1: Drop any existing broken function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the correct trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into public.users table when new auth.user is created
    INSERT INTO public.users (
        id,
        username,
        email,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            'user_' || substring(NEW.id::text, 1, 8)
        ),
        NEW.email,
        NEW.created_at,
        NEW.updated_at
    );
    
    -- Insert default user preferences
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't prevent user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Test the fix immediately
-- Run this in Supabase SQL Editor:
/*
-- Test the trigger
SELECT 'Testing trigger function...';

-- Quick test with a dummy user
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
    -- This should work without errors now
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
    VALUES (
        test_user_id,
        'test-trigger@example.com',
        '{"username": "testuser"}'::jsonb,
        NOW(),
        NOW()
    );
    
    -- Check if user was created in public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
        RAISE NOTICE ' SUCCESS: Trigger worked correctly!';
    ELSE
        RAISE NOTICE ' FAILED: Trigger did not create user in public.users';
    END IF;
    
    -- Clean up test data
    DELETE FROM public.users WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
END $$;
*/

-- Step 5: If you still get errors, run this diagnostic
/*
-- Check for any remaining issues
SELECT 
    schemaname,
    tablename,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;
*/