-- Add superior email and email frequency to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS superior_email text,
ADD COLUMN IF NOT EXISTS email_frequency text DEFAULT 'weekly' CHECK (email_frequency IN ('daily', 'weekly', 'monthly'));

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.superior_email IS 'Email of superior for non-org employees';
COMMENT ON COLUMN public.profiles.email_frequency IS 'Frequency of expense summary emails to superior';