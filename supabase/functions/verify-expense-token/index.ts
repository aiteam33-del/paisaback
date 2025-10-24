import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyTokenRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token }: VerifyTokenRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify token exists and is not expired
    const { data: tokenData, error: tokenError } = await supabase
      .from('expense_access_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token verification error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', tokenData.user_id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all expenses for this user
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', tokenData.user_id)
      .order('date', { ascending: false });

    if (expensesError) {
      console.error('Expenses fetch error:', expensesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expenses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regenerate fresh signed URLs for all attachments (old signed URLs expire)
    const expensesWithFreshUrls = await Promise.all(
      (expenses || []).map(async (expense: any) => {
        if (expense.attachments && Array.isArray(expense.attachments) && expense.attachments.length > 0) {
          const freshUrls = await Promise.all(
            expense.attachments.map(async (url: string) => {
              try {
                // Extract the file path from the existing URL
                // URLs are in format: .../storage/v1/object/sign/receipts/filename?token=...
                const match = url.match(/\/receipts\/([^?]+)/);
                if (!match) return url; // Return original if parsing fails
                
                const fileName = match[1];
                
                // Generate a fresh signed URL (30 days expiration)
                const { data: signedData, error: signError } = await supabase.storage
                  .from('receipts')
                  .createSignedUrl(fileName, 60 * 60 * 24 * 30);
                
                if (signError || !signedData) {
                  console.error('Error generating signed URL:', signError);
                  return url; // Return original if signing fails
                }
                
                return signedData.signedUrl;
              } catch (err) {
                console.error('Error processing attachment URL:', err);
                return url; // Return original on error
              }
            })
          );
          
          return { ...expense, attachments: freshUrls };
        }
        return expense;
      })
    );

    return new Response(
      JSON.stringify({
        user: {
          full_name: profile.full_name,
          email: profile.email
        },
        expenses: expensesWithFreshUrls
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in verify-expense-token function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
