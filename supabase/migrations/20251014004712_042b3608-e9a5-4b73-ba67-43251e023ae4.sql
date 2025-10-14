-- Add next_email_at for custom schedules
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS next_email_at timestamptz;

-- Create a cron job to process custom emails every 5 minutes
select
  cron.schedule(
    'process-custom-emails-every-5-min',
    '*/5 * * * *',
    $$
    select
      net.http_post(
          url:='https://dwxrdgimwuhlcjsdugzu.supabase.co/functions/v1/schedule-expense-emails',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.supabase_anon_key', true) || '"}'::jsonb,
          body:='{"frequency": "custom"}'::jsonb
      ) as request_id;
    $$
  );