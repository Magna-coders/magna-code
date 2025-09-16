-- Add availability column to user_skills table
ALTER TABLE public.user_skills 
ADD COLUMN availability VARCHAR(20) DEFAULT 'available' 
CHECK (availability IN ('available', 'busy', 'unavailable'));

-- Update existing records to have 'available' as default
UPDATE public.user_skills 
SET availability = 'available' 
WHERE availability IS NULL;