import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Resolve organization context
    const { data: orgByAdmin } = await supabase
      .from('organizations')
      .select('id')
      .eq('admin_user_id', user.id)
      .maybeSingle();

    let orgId: string | null = orgByAdmin?.id ?? null;

    if (!orgId) {
      // Fall back to user's profile membership org
      const { data: profileOrg } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();
      orgId = profileOrg?.organization_id ?? null;
    }

    let expensesQuery = supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (orgId) {
      const { data: employees } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', orgId);
      const employeeIds = (employees || []).map(e => e.id);
      if (employeeIds.length > 0) {
        expensesQuery = expensesQuery.in('user_id', employeeIds);
      } else {
        expensesQuery = expensesQuery.eq('user_id', user.id);
      }
    } else {
      // No org context: analyze only the current user's expenses
      expensesQuery = expensesQuery.eq('user_id', user.id);
    }

    const { data: expenses } = await expensesQuery;

    if (!expenses || expenses.length === 0) {
      return new Response(JSON.stringify({ 
        analysis: 'No expenses found to analyze. Add some expenses to get AI-powered insights.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare expense data for analysis
    const expenseSummary = {
      total_expenses: expenses.length,
      total_amount: expenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
      pending: expenses.filter(e => e.status === 'pending').length,
      approved: expenses.filter(e => e.status === 'approved').length,
      rejected: expenses.filter(e => e.status === 'rejected').length,
      categories: expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
        return acc;
      }, {} as Record<string, number>),
      recent_expenses: expenses.slice(0, 10).map(e => ({
        vendor: e.vendor,
        amount: e.amount,
        category: e.category,
        status: e.status,
        date: e.date
      }))
    };

    const fallbackAnalysis = `Executive summary: Total ₹${expenseSummary.total_amount.toFixed(0)} across ${expenseSummary.total_expenses} expenses. Top categories: ${Object.entries(expenseSummary.categories).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,3).map(([k,v])=>`${k} (₹${Number(v).toFixed(0)})`).join(', ')}. Approval mix — Approved: ${expenseSummary.approved}, Pending: ${expenseSummary.pending}, Rejected: ${expenseSummary.rejected}.\n\nRecommendations:\n- Tighten policy on top 1-2 categories with caps and pre-approvals.\n- Vendor consolidation for top spend to target 5–12% savings.\n- SLA on pending approvals to lift throughput, monthly audits on rejects.\n- Instrument dashboards with monthly category budgets and alerts.\n\nAction Plan (30/60/90):\n- 30d: publish policy + auto-approvals; tag vendors; enable alerts.\n- 60d: negotiate vendor rates; implement per-category budgets.\n- 90d: audit controls, benchmark vs peers, revise caps.`;

    console.log('Analyzing expenses with OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a seasoned CFO and VC advisor managing a $2B portfolio. Deliver board-ready insights, quantified risks, and stepwise optimizations. Be concise, structured, and decisive.'
          },
          {
            role: 'user',
            content: `Analyze the following expense data and provide a VC-grade review and recommendations:

Total Expenses: ${expenseSummary.total_expenses}
Total Amount: ₹${expenseSummary.total_amount.toFixed(2)}
Pending: ${expenseSummary.pending}
Approved: ${expenseSummary.approved}
Rejected: ${expenseSummary.rejected}

Category Breakdown:
${Object.entries(expenseSummary.categories).map(([cat, amt]) => `- ${cat}: ₹${(amt as number).toFixed(2)}`).join('\n')}

Recent Expenses:
${expenseSummary.recent_expenses.map(e => `- ${e.vendor} (${e.category}): ₹${e.amount} - ${e.status}`).join('\n')}

Please provide:
1. Executive Summary (3-5 bullets)
2. Spend Drivers & Anomalies (with numbers)
3. Risks & Controls (prioritized)
4. Optimization Levers (projected savings %/₹)
5. Policy & Process Improvements
6. 30/60/90-Day Action Plan with owners & KPIs
7. Benchmarks & Guardrails (where applicable)`
          }
        ],
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      // Return a structured fallback instead of failing hard
      return new Response(JSON.stringify({ 
        analysis: fallbackAnalysis,
        summary: expenseSummary,
        note: 'AI fallback used due to upstream error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    let analysis: string = (data?.choices?.[0]?.message?.content ?? '').trim();
    if (!analysis) analysis = fallbackAnalysis;

    console.log('Analysis generated successfully');

    return new Response(JSON.stringify({ 
      analysis,
      summary: expenseSummary 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in analyze-expenses function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
