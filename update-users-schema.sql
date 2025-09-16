-- Update users table schema to include missing columns
-- Add avatar_url column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add location column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add bio column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add website_url column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add github_url column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS github_url TEXT;

-- Add linkedin_url column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add twitter_url column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS twitter_url TEXT;

-- Add updated_at column with auto-update trigger
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create or replace the update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();