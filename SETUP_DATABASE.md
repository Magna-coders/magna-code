#  Quick Database Setup Guide

## Step 1: Reset Your Database (Optional)
If you want to start completely fresh, run this in Supabase SQL Editor:

```sql
-- Drop all existing tables (CAUTION: This deletes all data)
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.user_categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.project_contributors CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.user_skills CASCADE;
DROP TABLE IF EXISTS public.project_applications CASCADE;
DROP TABLE IF EXISTS public.project_technologies CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
```

## Step 2: Run the Minimal Schema

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Select your project**: `uzsaaxuifuoimgqjxynz`
3. **Click**: "SQL Editor" in left sidebar
4. **Copy & Paste**: The entire `minimal-schema.sql` file content
5. **Click**: "RUN" (or Ctrl+Enter)

## Step 3: Verify Setup

Run this test query to confirm everything is working:

```sql
-- Check if tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'user_categories', 'user_roles');

-- Test inserting a dummy user (this simulates what the form will do)
INSERT INTO public.users (id, username, email, created_at, updated_at) 
VALUES (gen_random_uuid(), 'testuser', 'test@example.com', NOW(), NOW());

-- Test inserting categories
INSERT INTO public.user_categories (user_id, category_name) 
VALUES ((SELECT id FROM users WHERE username='testuser'), 'Developer');

-- Test inserting roles  
INSERT INTO public.user_roles (user_id, role_name) 
VALUES ((SELECT id FROM users WHERE username='testuser'), 'Frontend Developer');

-- Verify the data
SELECT * FROM public.users u
JOIN public.user_categories uc ON u.id = uc.user_id
JOIN public.user_roles ur ON u.id = ur.user_id;
```

## Step 4: Test the Create Account Form

1. **Restart your dev server**: `npm run dev`
2. **Visit**: http://localhost:3001/create-account
3. **Try creating a new account**

## What the Form Actually Does

The create account form performs these exact steps:

1. **Signs up user with Supabase Auth** ✅ (This works)
2. **Inserts into `users` table**:
   - `id` (from auth.user.id)
   - `username` (from form)
   - `email` (from form)
   - `created_at` (current timestamp)
   - `updated_at` (current timestamp)

3. **Inserts into `user_categories` table**:
   - `user_id` (from auth.user.id)
   - `category_name` (selected categories like "Developer")

4. **Inserts into `user_roles` table**:
   - `user_id` (from auth.user.id)
   - `role_name` (selected roles like "Frontend Developer")

## If You Get Errors

- **"relation does not exist"**: Tables weren't created - re-run the schema
- **"permission denied"**: RLS policies need adjustment - the schema includes proper policies
- **"duplicate key"**: Username or email already exists - try different values

## Success Indicators

 Tables appear in Supabase dashboard
 No console errors in browser
 User can successfully register
 Data appears in all three tables

The minimal schema is now ready for your create account form!