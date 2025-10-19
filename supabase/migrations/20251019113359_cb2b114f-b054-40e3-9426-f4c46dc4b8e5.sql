-- Enforce unique waitlist emails (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_waitlist_emails_email_ci
ON public.waitlist_emails (lower(email));