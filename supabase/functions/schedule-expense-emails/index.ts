import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleRequest {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frequency }: ScheduleRequest = await req.json();
    
    console.log(`Processing ${frequency} email schedule...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get users due for email
    let users: any[] = [];
    if (frequency === 'custom') {
      const { data: customUsers, error: customErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, superior_email, next_email_at')
        .eq('email_frequency', 'custom')
        .not('superior_email', 'is', null)
        .lte('next_email_at', new Date().toISOString());
      if (customErr) throw customErr;
      users = (customUsers || []).map(u => ({
        user_id: u.id,
        email: u.email,
        full_name: u.full_name,
        superior_email: u.superior_email,
        next_email_at: u.next_email_at,
      }));
    } else {
      const { data: dueUsers, error: usersError } = await supabase
        .rpc('get_users_due_for_email', { frequency_type: frequency });
      if (usersError) throw usersError;
      users = dueUsers || [];
    }

    if (!users || users.length === 0) {
      console.log(`No users due for ${frequency} emails`);
      return new Response(
        JSON.stringify({ message: `No users due for ${frequency} emails`, count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${users.length} users due for ${frequency} emails`);

    // Process each user
    const results = await Promise.allSettled(
      users.map(async (user: any) => {
        try {
          // Fetch user expenses
          const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false });

          if (expensesError) throw expensesError;

          if (!expenses || expenses.length === 0) {
            console.log(`No expenses found for user ${user.email}`);
            return { user: user.email, status: 'skipped', reason: 'no expenses' };
          }

          // Send email via Resend function
          const { error: emailError } = await supabase.functions.invoke('send-expense-email', {
            body: {
              userId: user.user_id,
              recipientEmail: user.superior_email,
              employeeName: user.full_name || user.email,
            }
          });

          if (emailError) throw emailError;

          // Update timestamps after sending
          if (frequency === 'custom') {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ last_email_sent: new Date().toISOString(), next_email_at: null })
              .eq('id', user.user_id);
            if (updateError) {
              console.error(`Error updating profile for ${user.email}:`, updateError);
            }
          } else {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ last_email_sent: new Date().toISOString() })
              .eq('id', user.user_id);
            if (updateError) {
              console.error(`Error updating last_email_sent for ${user.email}:`, updateError);
            }
          }

          console.log(`Email sent successfully to ${user.superior_email} for ${user.email}`);
          return { user: user.email, status: 'success' };
        } catch (error: any) {
          console.error(`Error processing user ${user.email}:`, error);
          return { user: user.email, status: 'error', error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'error')).length;
    const skipped = results.filter(r => r.status === 'fulfilled' && r.value.status === 'skipped').length;

    console.log(`Email schedule complete: ${successful} successful, ${failed} failed, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${frequency} emails`,
        total: users.length,
        successful,
        failed,
        skipped,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error' })
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in schedule-expense-emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
