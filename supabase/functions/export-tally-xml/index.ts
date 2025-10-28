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
  user_id: string;
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

    const { expense_ids, start_date, end_date, voucher_type = 'payment' } = await req.json();

    console.log('Generating Tally XML export', { expense_ids, start_date, end_date });

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

    // Generate Tally XML
    const vouchers = expenses.map((exp: Expense, index: number) => {
      const expDate = new Date(exp.date);
      const tallyDate = expDate.toISOString().split('T')[0].replace(/-/g, '');
      const voucherNum = `EXP${String(index + 1).padStart(4, '0')}`;
      const employeeName = exp.profiles?.full_name || 'Unknown Employee';

      return `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${voucher_type}" ACTION="Create">
        <DATE>${tallyDate}</DATE>
        <VOUCHERTYPENAME>${voucher_type}</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${voucherNum}</VOUCHERNUMBER>
        <PARTYLEDGERNAME>${employeeName}</PARTYLEDGERNAME>
        <EFFECTIVEDATE>${tallyDate}</EFFECTIVEDATE>
        <NARRATION>${exp.category} - ${exp.vendor}: ${exp.description}</NARRATION>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Expense Reimbursement</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${exp.amount}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${exp.category} Expenses</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${exp.amount}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>Your Company Name</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${vouchers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    // Get user and org info for tracking
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // Log export to tracking table
      const fileName = `tally-export-${new Date().toISOString().split('T')[0]}.xml`;
      await supabaseClient.from('integration_exports').insert({
        user_id: user.id,
        organization_id: profile?.organization_id,
        export_type: 'tally',
        file_name: fileName,
        expense_count: expenses.length,
        total_amount: expenses.reduce((sum: number, exp: Expense) => sum + Number(exp.amount), 0),
        date_range_start: start_date,
        date_range_end: end_date,
      });
    }

    console.log(`Tally XML export generated: ${expenses.length} expenses`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="tally-export-${new Date().toISOString().split('T')[0]}.xml"`,
      },
    });
  } catch (error) {
    console.error('Error generating Tally XML:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
