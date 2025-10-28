import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  vendor: string;
  description: string;
  mode_of_payment: string;
  profiles: {
    full_name: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { expense_ids, start_date, end_date } = await req.json();

    console.log('Generating QuickBooks IIF export', { expense_ids, start_date, end_date });

    // Fetch expenses
    let query = supabaseClient
      .from('expenses')
      .select('*, profiles!expenses_user_id_fkey(full_name)')
      .eq('status', 'approved');

    if (expense_ids && expense_ids.length > 0) {
      query = query.in('id', expense_ids);
    } else if (start_date && end_date) {
      query = query.gte('date', start_date).lte('date', end_date);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }

    if (!expenses || expenses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No expenses found for export' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate QuickBooks IIF format
    let iif = '!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\n';
    iif += '!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO\n';
    iif += '!ENDTRNS\n';

    expenses.forEach((exp: Expense, index: number) => {
      const expDate = new Date(exp.date);
      const qbDate = `${String(expDate.getMonth() + 1).padStart(2, '0')}/${String(expDate.getDate()).padStart(2, '0')}/${expDate.getFullYear()}`;
      const docNum = `EXP${String(index + 1).padStart(4, '0')}`;
      const employeeName = exp.profiles?.full_name || 'Unknown Employee';
      const memo = `${exp.category} - ${exp.vendor}`;

      // Transaction line
      iif += `TRNS\t${index + 1}\tGENERAL JOURNAL\t${qbDate}\tExpense Reimbursement\t${employeeName}\t${exp.amount}\t${docNum}\t${exp.description}\n`;
      
      // Split line (offset)
      iif += `SPL\t${index + 1}\tGENERAL JOURNAL\t${qbDate}\t${exp.category} Expenses\t-${exp.amount}\t${memo}\n`;
      
      iif += 'ENDTRNS\n';
    });

    // Get user and org info for tracking
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // Log export to tracking table
      const fileName = `quickbooks-export-${new Date().toISOString().split('T')[0]}.iif`;
      await supabaseClient.from('integration_exports').insert({
        user_id: user.id,
        organization_id: profile?.organization_id,
        export_type: 'quickbooks',
        file_name: fileName,
        expense_count: expenses.length,
        total_amount: expenses.reduce((sum: number, exp: Expense) => sum + Number(exp.amount), 0),
        date_range_start: start_date,
        date_range_end: end_date,
      });
    }

    console.log(`QuickBooks IIF export generated: ${expenses.length} expenses`);

    return new Response(iif, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="quickbooks-export-${new Date().toISOString().split('T')[0]}.iif"`,
      },
    });
  } catch (error) {
    console.error('Error generating QuickBooks IIF:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
