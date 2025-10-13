-- Add last_email_sent column to profiles table for tracking automated emails
ALTER TABLE public.profiles 
ADD COLUMN last_email_sent timestamp with time zone;

-- Create index for efficient querying of users due for emails
CREATE INDEX idx_profiles_email_frequency ON public.profiles(email_frequency, last_email_sent);

-- Create function to send scheduled expense emails
CREATE OR REPLACE FUNCTION public.get_users_due_for_email(frequency_type text)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  superior_email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.superior_email
  FROM public.profiles p
  WHERE p.email_frequency = frequency_type
    AND p.superior_email IS NOT NULL
    AND (
      p.last_email_sent IS NULL OR
      (frequency_type = 'daily' AND p.last_email_sent < NOW() - INTERVAL '1 day') OR
      (frequency_type = 'weekly' AND p.last_email_sent < NOW() - INTERVAL '7 days') OR
      (frequency_type = 'monthly' AND p.last_email_sent < NOW() - INTERVAL '1 month')
    );
END;
$$;

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily email sends at 9 AM UTC
SELECT cron.schedule(
  'send-daily-expense-emails',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dwxrdgimwuhlcjsdugzu.supabase.co/functions/v1/schedule-expense-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3eHJkZ2ltd3VobGNqc2R1Z3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mjc5NjIsImV4cCI6MjA3NTUwMzk2Mn0.huMVkjzazENXNyNHFcXYSbRHGQx3biK7WJcaUz7iGYA"}'::jsonb,
    body := '{"frequency": "daily"}'::jsonb
  );
  $$
);

-- Schedule weekly email sends every Monday at 9 AM UTC
SELECT cron.schedule(
  'send-weekly-expense-emails',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://dwxrdgimwuhlcjsdugzu.supabase.co/functions/v1/schedule-expense-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3eHJkZ2ltd3VobGNqc2R1Z3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mjc5NjIsImV4cCI6MjA3NTUwMzk2Mn0.huMVkjzazENXNyNHFcXYSbRHGQx3biK7WJcaUz7iGYA"}'::jsonb,
    body := '{"frequency": "weekly"}'::jsonb
  );
  $$
);

-- Schedule monthly email sends on the 1st at 9 AM UTC
SELECT cron.schedule(
  'send-monthly-expense-emails',
  '0 9 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://dwxrdgimwuhlcjsdugzu.supabase.co/functions/v1/schedule-expense-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3eHJkZ2ltd3VobGNqc2R1Z3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mjc5NjIsImV4cCI6MjA3NTUwMzk2Mn0.huMVkjzazENXNyNHFcXYSbRHGQx3biK7WJcaUz7iGYA"}'::jsonb,
    body := '{"frequency": "monthly"}'::jsonb
  );
  $$
);