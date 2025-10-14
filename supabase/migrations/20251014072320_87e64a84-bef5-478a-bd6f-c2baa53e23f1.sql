-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to check for custom scheduled emails every 5 minutes
SELECT cron.schedule(
  'schedule-custom-expense-emails-every-5-min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://dwxrdgimwuhlcjsdugzu.supabase.co/functions/v1/schedule-expense-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3eHJkZ2ltd3VobGNqc2R1Z3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mjc5NjIsImV4cCI6MjA3NTUwMzk2Mn0.huMVkjzazENXNyNHFcXYSbRHGQx3biK7WJcaUz7iGYA"}'::jsonb,
        body:='{"frequency": "custom"}'::jsonb
    ) as request_id;
  $$
);