-- Add availability column to users table
ALTER TABLE public.users 
ADD COLUMN availability VARCHAR(20) DEFAULT 'available' 
CHECK (availability IN ('available', 'busy', 'unavailable'));

-- Update existing records to have 'available' as default
UPDATE public.users 
SET availability = 'available' 
WHERE availability IS NULL;