-- Update profile schema additions
-- This script adds missing fields for the profile update functionality

-- Create user_skills table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(20) DEFAULT 'beginner' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, skill_name)
);

-- Add availability field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS availability VARCHAR(20) DEFAULT 'available' 
CHECK (availability IN ('available', 'busy', 'unavailable'));

-- Add profile completeness tracking
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_complete_percentage INTEGER DEFAULT 0;

-- Create or replace function to calculate profile completeness
CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    completeness INTEGER := 0;
    user_record public.users%ROWTYPE;
    skill_count INTEGER;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM public.users WHERE id = user_id;
    
    -- Calculate completeness based on filled fields
    IF user_record.avatar_url IS NOT NULL AND user_record.avatar_url != '' THEN
        completeness := completeness + 15;
    END IF;
    
    IF user_record.bio IS NOT NULL AND user_record.bio != '' THEN
        completeness := completeness + 15;
    END IF;
    
    IF user_record.location IS NOT NULL AND user_record.location != '' THEN
        completeness := completeness + 10;
    END IF;
    
    IF user_record.website_url IS NOT NULL AND user_record.website_url != '' THEN
        completeness := completeness + 10;
    END IF;
    
    IF user_record.github_url IS NOT NULL AND user_record.github_url != '' THEN
        completeness := completeness + 10;
    END IF;
    
    IF user_record.linkedin_url IS NOT NULL AND user_record.linkedin_url != '' THEN
        completeness := completeness + 10;
    END IF;
    
    IF user_record.twitter_url IS NOT NULL AND user_record.twitter_url != '' THEN
        completeness := completeness + 10;
    END IF;
    
    -- Count skills (handle case where user_skills table might not exist)
    BEGIN
        SELECT COUNT(*) INTO skill_count FROM public.user_skills WHERE user_id = user_id;
        IF skill_count > 0 THEN
            completeness := completeness + 20;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- If user_skills table doesn't exist, skip skills contribution
            skill_count := 0;
    END;
    
    RETURN LEAST(completeness, 100);
END;
$$ LANGUAGE plpgsql;

-- Create function to update profile completeness automatically
CREATE OR REPLACE FUNCTION public.update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET profile_complete_percentage = public.calculate_profile_completeness(NEW.id)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update completeness
DROP TRIGGER IF EXISTS update_user_completeness ON public.users;
CREATE TRIGGER update_user_completeness
    AFTER UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_profile_completeness();

-- Create trigger for skills affecting completeness
DROP TRIGGER IF EXISTS update_skills_completeness ON public.user_skills;
CREATE TRIGGER update_skills_completeness
    AFTER INSERT OR DELETE ON public.user_skills
    FOR EACH ROW EXECUTE FUNCTION public.update_profile_completeness();

-- Update RLS policies for new fields
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Ensure users can update their own availability
-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Users can update their own availability" ON public.users;
CREATE POLICY "Users can update their own availability" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- User skills policies
DROP POLICY IF EXISTS "Users can view all user skills" ON public.user_skills;
CREATE POLICY "Users can view all user skills" ON public.user_skills
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own skills" ON public.user_skills;
CREATE POLICY "Users can manage their own skills" ON public.user_skills
    FOR ALL USING (auth.uid() = user_id);