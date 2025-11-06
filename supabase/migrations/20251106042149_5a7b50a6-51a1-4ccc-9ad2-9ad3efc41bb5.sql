-- Make receipts bucket public and allow public read
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = true;

-- Allow anyone to read files in receipts bucket
create policy "Public read for receipts"
  on storage.objects for select
  using (bucket_id = 'receipts');