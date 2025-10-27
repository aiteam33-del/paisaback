import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Resolve organization context (admin-owned org first, else membership)
    const { data: orgByAdmin } = await supabase
      .from('organizations')
      .select('id')
      .eq('admin_user_id', user.id)
      .maybeSingle();

    let orgId: string | null = orgByAdmin?.id ?? null;

    if (!orgId) {
      const { data: profileOrg } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();
      orgId = profileOrg?.organization_id ?? null;
    }

    // Build expenses query for org scope or user-only
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
      expensesQuery = employeeIds.length > 0
        ? expensesQuery.in('user_id', employeeIds)
        : expensesQuery.eq('user_id', user.id);
    } else {
      expensesQuery = expensesQuery.eq('user_id', user.id);
    }

    const { data: expenses } = await expensesQuery;

    if (!expenses || expenses.length === 0) {
      return new Response(JSON.stringify({ 
        analysis: 'No expenses found to analyze. Add some expenses to get AI-powered insights.',
        summary: {
          total_expenses: 0,
          total_amount: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          categories: {},
          recent_expenses: []
        }
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
      categories: expenses.reduce((acc: Record<string, number>, exp: any) => {
        const key = exp.category || 'uncategorized';
        acc[key] = (acc[key] || 0) + Number(exp.amount);
        return acc;
      }, {} as Record<string, number>),
      recent_expenses: expenses.slice(0, 10).map((e: any) => ({
        vendor: e.vendor,
        amount: Number(e.amount),
        category: e.category,
        status: e.status,
        date: e.date
      }))
    };

    // Deterministic, cost-free VC-grade analysis (no external AI calls)
    const total = expenseSummary.total_amount;
    const count = expenseSummary.total_expenses;
    const avg = total > 0 && count > 0 ? total / count : 0;

    const sortedCats = Object.entries(expenseSummary.categories)
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    const top3Cats = sortedCats.slice(0, 3);
    const topCatsText = top3Cats
      .map(([k, v]) => `${k} (₹${Number(v).toFixed(0)}, ${(Number(v) / Math.max(total, 1) * 100).toFixed(1)}%)`)
      .join(', ');

    const vendorTotals = expenses.reduce((acc: Record<string, number>, e: any) => {
      const name = e.vendor || 'Unknown Vendor';
      acc[name] = (acc[name] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

    const topVendors = Object.entries(vendorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topVendorsText = topVendors.map(([v, amt]) => `${v} (₹${amt.toFixed(0)})`).join(', ');

    const largeTxns = expenses
      .filter((e: any) => Number(e.amount) >= total * 0.2)
      .slice(0, 3)
      .map((e: any) => `${e.vendor || 'Unknown'}: ₹${Number(e.amount).toFixed(0)} (${e.category})`);

    const pendingPct = (expenseSummary.pending / Math.max(count, 1) * 100).toFixed(1);
    const rejectPct = (expenseSummary.rejected / Math.max(count, 1) * 100).toFixed(1);

    // Simple savings model: vendor consolidation and policy caps
    const topSpend = top3Cats.reduce((s, [, v]) => s + Number(v), 0);
    const consSavingsLow = topSpend * 0.05;
    const consSavingsHigh = topSpend * 0.12;

    const analysis = [
      `1) Executive Summary`,
      `- Total spend: ₹${total.toFixed(0)} across ${count} expenses (avg ₹${avg.toFixed(0)}/expense).`,
      `- Top categories: ${topCatsText || 'n/a'}.`,
      `- Approval mix — Approved: ${expenseSummary.approved}, Pending: ${expenseSummary.pending} (${pendingPct}%), Rejected: ${expenseSummary.rejected} (${rejectPct}%).`,
      '',
      `2) Spend Drivers & Anomalies`,
      `- Category concentration: ${(topSpend / Math.max(total, 1) * 100).toFixed(1)}% of spend sits in top 3 categories.`,
      `${largeTxns.length ? `- Large transactions: ${largeTxns.join('; ')}` : '- No unusually large single transactions detected.'}`,
      '',
      `3) Risks & Controls (prioritized)`,
      `- Pending approvals at ${pendingPct}% — risk of month-end spikes & delayed close.`,
      `${expenseSummary.rejected > 0 ? `- Rejected count ${expenseSummary.rejected} — policy clarity and pre-approval gating may be weak.` : '- Rejection rate low — maintain controls.'}`,
      `- Category tagging quality: ensure strict taxonomy to avoid "uncategorized" leakage.`,
      '',
      `4) Optimization Levers (projected savings)`,
      `- Vendor consolidation on top vendors (${topVendorsText || 'n/a'}) → target savings ₹${consSavingsLow.toFixed(0)}–₹${consSavingsHigh.toFixed(0)} (5–12%).`,
      `- Policy caps on top 1–2 categories with auto-approvals for small-ticket items.`,
      `- Shift recurring spend to negotiated contracts or corporate cards for rebates and control.`,
      '',
      `5) Policy & Process Improvements`,
      `- Enforce pre-approvals above ₹${(avg * 3).toFixed(0)} and for Travel/Meals.`,
      `- SLA: approve within 48h; auto-reminders; weekly exception report to owners.`,
      `- Require receipt OCR for every expense and auto-categorize with vendor mapping.`,
      '',
      `6) 30/60/90-Day Action Plan (owners & KPIs)`,
      `- 30d: Publish policy, enable auto-approvals under ₹${(avg * 0.8).toFixed(0)}; tag top vendors; set alerts. KPI: <10% pending.`,
      `- 60d: Negotiate top vendors; set monthly budgets per category. KPI: 5–10% run-rate reduction.`,
      `- 90d: Quarterly audit; benchmark vs peers; revise caps. KPI: STP rate > 70%.`,
      '',
      `7) Benchmarks & Guardrails`,
      `- Target: top 3 categories < 65% of total; pending < 10%; rejections < 5%.`,
      `- Guardrails: per-diem for meals; pre-approval for travel; hard caps for misc/other.`
    ].join('\n');

    console.log('Deterministic analysis generated successfully');

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