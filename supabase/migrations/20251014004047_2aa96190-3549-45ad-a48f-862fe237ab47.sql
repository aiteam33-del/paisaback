-- Add 'custom' to the allowed email_frequency values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_frequency_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_frequency_check 
CHECK (email_frequency IN ('daily', 'weekly', 'monthly', 'custom'));