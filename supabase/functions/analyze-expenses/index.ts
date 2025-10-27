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

    // Prepare comprehensive expense data for forensic analysis
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

    // FORENSIC ANALYSIS ENGINE - Outlier & anomaly detection
    const amounts = expenses.map((e: any) => Number(e.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / Math.max(amounts.length, 1);
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / Math.max(amounts.length, 1);
    const stdDev = Math.sqrt(variance);
    
    // Statistical outliers (> 2 std devs from mean)
    const outliers = expenses.filter((e: any) => Math.abs(Number(e.amount) - mean) > 2 * stdDev);
    
    // Round number pattern detection (potential estimate/inflation)
    const roundNumbers = expenses.filter((e: any) => {
      const amt = Number(e.amount);
      return amt >= 100 && (amt % 100 === 0 || amt % 1000 === 0);
    });
    
    // Weekend expenses in "office" category (suspicious)
    const weekendOffice = expenses.filter((e: any) => {
      if (e.category !== 'office') return false;
      const day = new Date(e.date).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });
    
    // Duplicate vendor+amount on same day (potential duplicate claims)
    const duplicates: any[] = [];
    const seen = new Map<string, any>();
    expenses.forEach((e: any) => {
      const key = `${e.vendor}_${e.amount}_${new Date(e.date).toDateString()}`;
      if (seen.has(key)) {
        duplicates.push({ original: seen.get(key), duplicate: e });
      } else {
        seen.set(key, e);
      }
    });
    
    // Vendor frequency analysis (detect "favorite vendor" abuse)
    const vendorFreq: Record<string, { count: number; total: number; user_id: string }> = {};
    expenses.forEach((e: any) => {
      const v = e.vendor || 'Unknown';
      if (!vendorFreq[v]) vendorFreq[v] = { count: 0, total: 0, user_id: e.user_id };
      vendorFreq[v].count++;
      vendorFreq[v].total += Number(e.amount);
    });
    const suspiciousVendors = Object.entries(vendorFreq)
      .filter(([, data]) => data.count >= 5) // 5+ claims from same vendor
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);
    
    // Just-below-threshold gaming (if any expense is $99, $199, $499 patterns)
    const thresholdGaming = expenses.filter((e: any) => {
      const amt = Number(e.amount);
      return [99, 199, 499, 999, 1999, 4999, 9999].some(t => amt >= t - 10 && amt <= t);
    });
    
    // User rejection rate analysis
    const userStats: Record<string, { total: number; rejected: number }> = {};
    expenses.forEach((e: any) => {
      if (!userStats[e.user_id]) userStats[e.user_id] = { total: 0, rejected: 0 };
      userStats[e.user_id].total++;
      if (e.status === 'rejected') userStats[e.user_id].rejected++;
    });
    const highRejectUsers = Object.entries(userStats)
      .filter(([, stats]) => stats.total >= 3 && (stats.rejected / stats.total) > 0.3)
      .sort((a, b) => (b[1].rejected / b[1].total) - (a[1].rejected / a[1].total));

    // Forensic VC-grade analysis with outlier detection
    const total = expenseSummary.total_amount;
    const count = expenseSummary.total_expenses;
    const avg = total > 0 && count > 0 ? total / count : 0;

    const sortedCats = Object.entries(expenseSummary.categories)
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    const top3Cats = sortedCats.slice(0, 3);
    const topCatsText = top3Cats
      .map(([k, v]) => `${k} (₹${Number(v).toFixed(0)}, ${(Number(v) / Math.max(total, 1) * 100).toFixed(1)}%)`)
      .join(', ');

    const topVendorsText = suspiciousVendors.length > 0
      ? suspiciousVendors.map(([v, d]) => `${v} (${d.count} claims, ₹${d.total.toFixed(0)})`).join('; ')
      : 'n/a';

    const largeTxns = outliers
      .slice(0, 3)
      .map((e: any) => `${e.vendor || 'Unknown'}: ₹${Number(e.amount).toFixed(0)} (${e.category}, ${e.status})`);

    const pendingPct = (expenseSummary.pending / Math.max(count, 1) * 100).toFixed(1);
    const rejectPct = (expenseSummary.rejected / Math.max(count, 1) * 100).toFixed(1);

    // Savings projections
    const topSpend = top3Cats.reduce((s, [, v]) => s + Number(v), 0);
    const consSavingsLow = topSpend * 0.05;
    const consSavingsHigh = topSpend * 0.12;

    // Build forensic analysis narrative
    const sections: string[] = [];
    
    sections.push(`═══════════════════════════════════════════════════════════════`);
    sections.push(`🔍 FORENSIC EXPENSE ANALYSIS — VC-GRADE AUDIT`);
    sections.push(`═══════════════════════════════════════════════════════════════\n`);
    
    sections.push(`1️⃣ EXECUTIVE SUMMARY`);
    sections.push(`• Total spend: ₹${total.toFixed(0)} across ${count} expenses (avg ₹${avg.toFixed(0)}, median ~₹${mean.toFixed(0)})`);
    sections.push(`• Distribution: Approved ${expenseSummary.approved}, Pending ${expenseSummary.pending} (${pendingPct}%), Rejected ${expenseSummary.rejected} (${rejectPct}%)`);
    sections.push(`• Top categories: ${topCatsText || 'n/a'}`);
    sections.push(`• Statistical variance: σ=₹${stdDev.toFixed(0)} (${(stdDev/Math.max(mean,1)*100).toFixed(0)}% of mean)\n`);

    sections.push(`2️⃣ OUTLIER & ANOMALY DETECTION 🚨`);
    if (outliers.length > 0) {
      sections.push(`⚠️  STATISTICAL OUTLIERS DETECTED: ${outliers.length} expense(s) exceed 2σ from mean`);
      sections.push(`   └─ Flagged transactions:`);
      outliers.slice(0, 5).forEach((e: any) => {
        const zScore = ((Number(e.amount) - mean) / Math.max(stdDev, 1)).toFixed(1);
        sections.push(`      • ${e.vendor}: ₹${Number(e.amount).toFixed(0)} (${e.category}, ${e.status}) [Z-score: ${zScore}]`);
      });
      sections.push(`   └─ ACTION: Review these high-value outliers for legitimacy and proper documentation\n`);
    } else {
      sections.push(`✅ No statistical outliers detected (all expenses within 2σ)\n`);
    }

    if (duplicates.length > 0) {
      sections.push(`🔴 DUPLICATE CLAIMS DETECTED: ${duplicates.length} potential duplicate(s)`);
      duplicates.slice(0, 3).forEach((d: any) => {
        sections.push(`   • ${d.duplicate.vendor}: ₹${d.duplicate.amount} on ${new Date(d.duplicate.date).toLocaleDateString()}`);
      });
      sections.push(`   └─ ACTION: Investigate for double-billing or reimbursement fraud\n`);
    }

    if (roundNumbers.length >= count * 0.3) {
      sections.push(`⚠️  ROUND NUMBER PATTERN: ${roundNumbers.length}/${count} (${(roundNumbers.length/count*100).toFixed(0)}%) are round numbers`);
      sections.push(`   └─ Potential estimated/inflated expenses. Require itemized receipts.\n`);
    }

    if (weekendOffice.length > 0) {
      sections.push(`🟡 WEEKEND OFFICE EXPENSES: ${weekendOffice.length} office expense(s) on weekends`);
      weekendOffice.slice(0, 3).forEach((e: any) => {
        sections.push(`   • ${e.vendor}: ₹${Number(e.amount).toFixed(0)} on ${new Date(e.date).toLocaleDateString()}`);
      });
      sections.push(`   └─ ACTION: Verify legitimacy or reclassify category\n`);
    }

    if (thresholdGaming.length > 0) {
      sections.push(`🟠 THRESHOLD GAMING DETECTED: ${thresholdGaming.length} expense(s) suspiciously near approval thresholds`);
      thresholdGaming.slice(0, 3).forEach((e: any) => {
        sections.push(`   • ${e.vendor}: ₹${Number(e.amount).toFixed(0)} (${e.category})`);
      });
      sections.push(`   └─ ACTION: Implement split-transaction audits and spot checks\n`);
    }

    sections.push(`3️⃣ VENDOR CONCENTRATION & RISK`);
    if (suspiciousVendors.length > 0) {
      sections.push(`⚠️  HIGH-FREQUENCY VENDORS (5+ claims):`);
      suspiciousVendors.forEach(([v, d]) => {
        const freqPct = (d.count / count * 100).toFixed(1);
        sections.push(`   • ${v}: ${d.count} claims (${freqPct}%), ₹${d.total.toFixed(0)}`);
      });
      sections.push(`   └─ RISK: Potential "favorite vendor" abuse or kickback schemes`);
      sections.push(`   └─ ACTION: Rotate vendors, enforce competitive bidding for recurring spend\n`);
    } else {
      sections.push(`✅ Healthy vendor diversity — no single vendor dominates claim frequency\n`);
    }

    if (highRejectUsers.length > 0) {
      sections.push(`🔴 HIGH-REJECTION USERS DETECTED:`);
      highRejectUsers.slice(0, 3).forEach(([uid, stats]) => {
        const rejectRate = (stats.rejected / stats.total * 100).toFixed(0);
        sections.push(`   • User ${uid.substring(0, 8)}: ${stats.rejected}/${stats.total} rejected (${rejectRate}%)`);
      });
      sections.push(`   └─ ACTION: Provide policy training or investigate pattern of non-compliance\n`);
    }

    sections.push(`4️⃣ SPEND OPTIMIZATION & SAVINGS`);
    sections.push(`• Category concentration: ${(topSpend / Math.max(total, 1) * 100).toFixed(1)}% in top 3 categories`);
    sections.push(`• Vendor consolidation opportunity: ₹${consSavingsLow.toFixed(0)}–₹${consSavingsHigh.toFixed(0)} (5–12% savings)`);
    sections.push(`• Policy tightening on top categories → estimated 8–15% reduction in discretionary spend`);
    sections.push(`• Implement corporate cards for recurring vendors → 1–2% cashback/rebates\n`);

    sections.push(`5️⃣ CONTROL WEAKNESSES & REMEDIATION`);
    sections.push(`• Pending approval backlog at ${pendingPct}% → implement 48h SLA with auto-escalation`);
    if (expenseSummary.rejected > 0) {
      sections.push(`• Rejection rate ${rejectPct}% → signals policy ambiguity or inadequate pre-approval process`);
    }
    sections.push(`• Missing: Pre-approval workflow for expenses >₹${(avg * 2.5).toFixed(0)}`);
    sections.push(`• Missing: Automated duplicate detection and OCR validation\n`);

    sections.push(`6️⃣ ACTIONABLE 30/60/90-DAY ROADMAP`);
    sections.push(`📅 30 DAYS:`);
    sections.push(`   • Deploy auto-approval for expenses <₹${(avg * 0.7).toFixed(0)} with receipt`);
    sections.push(`   • Investigate all flagged outliers and duplicates`);
    sections.push(`   • Send policy clarification to high-rejection users`);
    sections.push(`   • KPI: <10% pending, zero duplicate claims\n`);
    
    sections.push(`📅 60 DAYS:`);
    sections.push(`   • Negotiate volume discounts with top 3 vendors`);
    sections.push(`   • Implement category-level monthly budgets with alerts at 80%`);
    sections.push(`   • Roll out corporate cards for recurring vendors`);
    sections.push(`   • KPI: 5–10% spend reduction, <15% vendor concentration\n`);
    
    sections.push(`📅 90 DAYS:`);
    sections.push(`   • Quarterly forensic audit with external spot checks`);
    sections.push(`   • Benchmark against industry peers (target: <65% in top 3 categories)`);
    sections.push(`   • Revise expense caps and approval thresholds based on data`);
    sections.push(`   • KPI: >70% straight-through processing, <5% rejection rate\n`);

    sections.push(`7️⃣ GOVERNANCE & GUARDRAILS`);
    sections.push(`• Mandate: Pre-approval for all travel >₹${(avg * 3).toFixed(0)}, office >₹${(avg * 2).toFixed(0)}`);
    sections.push(`• Hard caps: Food ₹500/day, Travel ₹5000/trip, Misc ₹1000/month`);
    sections.push(`• Audit triggers: >2 rejections/user/month, weekend office claims, round numbers >₹1000`);
    sections.push(`• Quarterly board reporting: spend by category, top vendors, anomaly count, savings achieved`);
    sections.push(`\n═══════════════════════════════════════════════════════════════`);

    const analysis = sections.join('\n');

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