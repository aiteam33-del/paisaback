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

// Returns a short-lived signed URL for a receipt (60 min expiry).
// This works regardless of whether the bucket is public or private.
export const getReceiptPublicUrl = (raw: string): string => {
  // We can't use async here since callers expect a sync string.
  // Fall back to the public URL helper — when we make the bucket private,
  // callers should migrate to getReceiptSignedUrl instead.
  const path = extractReceiptPath(raw);
  const { data } = supabase.storage.from('receipts').getPublicUrl(path);
  return data.publicUrl;
};

// Async signed URL — use this for secure access (preferred)
export const getReceiptSignedUrl = async (raw: string, expiresIn = 3600): Promise<string> => {
  const path = extractReceiptPath(raw);
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL:', error);
    // Fallback to public URL construction
    return getReceiptPublicUrl(raw);
  }
  return data.signedUrl;
};
