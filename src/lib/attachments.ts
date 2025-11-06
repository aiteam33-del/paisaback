import { supabase } from "@/integrations/supabase/client";

// Extracts the object path inside the 'receipts' bucket from a stored string
// Supports old signed URLs, public URLs, and plain paths
export const extractReceiptPath = (raw: string): string => {
  if (!raw) return '';
  if (!raw.startsWith('http')) {
    // Already a path like "user/123-file.png" or may start with receipts/
    return raw.replace(/^\/?receipts\//, '');
  }
  // Try match both public and signed URL formats
  const m1 = raw.match(/\/storage\/v1\/object\/(?:public|sign)\/receipts\/([^?]+)/);
  if (m1 && m1[1]) return m1[1];
  const m2 = raw.match(/\/receipts\/([^?]+)/);
  if (m2 && m2[1]) return m2[1];
  return raw;
};

// Returns a stable, public URL for a receipt. Requires the bucket to be public.
export const getReceiptPublicUrl = (raw: string): string => {
  const path = extractReceiptPath(raw);
  const { data } = supabase.storage.from('receipts').getPublicUrl(path);
  return data.publicUrl;
};
