-- Ensure 'receipts' bucket exists and is public
DO $$
BEGIN
  -- Create or update the bucket to be public
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('receipts', 'receipts', true)
  ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
END $$;

-- Create a public read policy for the receipts bucket if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read for receipts'
  ) THEN
    CREATE POLICY "Public read for receipts"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'receipts');
  END IF;
END $$;
