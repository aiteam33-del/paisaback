import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AUTH CHECK FIRST (before parsing body) ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, conversationHistory } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- RESOLVE ORGANIZATION SCOPE ---
    // Only fetch data belonging to the user's organization (same pattern as analyze-expenses)
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

    // Get employee IDs for this org only
    let orgEmployeeIds: string[] = [user.id];
    if (orgId) {
      const { data: employees } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', orgId);
      orgEmployeeIds = (employees || []).map(e => e.id);
      if (!orgEmployeeIds.includes(user.id)) {
        orgEmployeeIds.push(user.id);
      }
    }

    console.log(`Fetching org-scoped data for org ${orgId}, ${orgEmployeeIds.length} employees...`);

    // Fetch ONLY this organization's expenses
    const now = new Date();
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);
    const last3h = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const last6h = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Fetch expenses scoped to organization employees ONLY
    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('*, profiles!expenses_user_id_fkey(id, full_name, email)')
      .in('user_id', orgEmployeeIds)
      .order('date', { ascending: false });

    const expenses = allExpenses || [];

    console.log(`Total org-scoped expenses fetched: ${expenses.length}`);

    // Fetch only this org's profiles
    const { data: profiles } = orgId
      ? await supabase.from('profiles').select('*').eq('organization_id', orgId)
      : await supabase.from('profiles').select('*').eq('id', user.id);

    // Fetch only user's organization
    const { data: organizations } = orgId
      ? await supabase.from('organizations').select('*').eq('id', orgId)
      : await supabase.from('organizations').select('*').eq('admin_user_id', user.id);

    // Fetch only user's notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate granular time-based metrics
    const expenses1h = expenses.filter(e => new Date(e.date) >= last1h);
    const expenses3h = expenses.filter(e => new Date(e.date) >= last3h);
    const expenses6h = expenses.filter(e => new Date(e.date) >= last6h);
    const expenses24h = expenses.filter(e => new Date(e.date) >= last24h);
    const expenses7d = expenses.filter(e => new Date(e.date) >= last7d);
    const expenses30d = expenses.filter(e => new Date(e.date) >= last30d);
    const expenses90d = expenses.filter(e => new Date(e.date) >= last90d);

    // Employee breakdown
    const employeeMap = new Map();
    expenses.forEach(e => {
      const profile = e.profiles || profiles?.find(p => p.id === e.user_id);
      const name = profile?.full_name || 'Unknown';
      const email = profile?.email || 'unknown';
      if (!employeeMap.has(name)) {
        employeeMap.set(name, { count: 0, total: 0, pending: 0, approved: 0, rejected: 0, email });
      }
      const emp = employeeMap.get(name);
      emp.count++;
      emp.total += Number(e.amount);
      if (e.status === 'pending') emp.pending += Number(e.amount);
      if (e.status === 'approved') emp.approved += Number(e.amount);
      if (e.status === 'rejected') emp.rejected += Number(e.amount);
    });

    // Vendor breakdown
    const vendorMap = new Map();
    expenses.forEach(e => {
      if (!vendorMap.has(e.vendor)) {
        vendorMap.set(e.vendor, { count: 0, total: 0 });
      }
      const vendor = vendorMap.get(e.vendor);
      vendor.count++;
      vendor.total += Number(e.amount);
    });

    // Category breakdown with status filtering
    const categoryMap = new Map();
    expenses.forEach(e => {
      const category = (e.category || 'Uncategorized').toLowerCase(); // Normalize to lowercase
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, total: 0, pending: 0, approved: 0, rejected: 0 });
      }
      const cat = categoryMap.get(category);
      cat.count++;
      cat.total += Number(e.amount);
      if (e.status === 'pending') cat.pending++;
      if (e.status === 'approved') cat.approved++;
      if (e.status === 'rejected') cat.rejected++;
    });
    
    console.log('Categories found:', Array.from(categoryMap.keys()));

    // Get recent expenses for detailed queries
    const recentExpenses = expenses.slice(0, 20).map(e => ({
      id: e.id,
      employee: e.profiles?.full_name || 'Unknown',
      amount: Number(e.amount),
      category: e.category,
      vendor: e.vendor,
      date: e.date,
      description: e.description,
      status: e.status,
      modeOfPayment: e.mode_of_payment
    }));

    // Detect duplicate expenses (same vendor, amount, and date within 24 hours)
    const duplicates: Array<{expense1: any, expense2: any, reason: string}> = [];
    const potentialDuplicates: Array<{expense1: any, expense2: any, reason: string}> = [];

    for (let i = 0; i < expenses.length; i++) {
      for (let j = i + 1; j < expenses.length; j++) {
        const e1 = expenses[i];
        const e2 = expenses[j];
        const date1 = new Date(e1.date).getTime();
        const date2 = new Date(e2.date).getTime();
        const timeDiff = Math.abs(date1 - date2);
        const dayInMs = 24 * 60 * 60 * 1000;

        // Exact duplicate: same amount, vendor, category
        if (e1.amount === e2.amount && e1.vendor === e2.vendor && e1.category === e2.category && timeDiff < dayInMs) {
          duplicates.push({
            expense1: { id: e1.id, employee: e1.profiles?.full_name, amount: e1.amount, vendor: e1.vendor, date: e1.date },
            expense2: { id: e2.id, employee: e2.profiles?.full_name, amount: e2.amount, vendor: e2.vendor, date: e2.date },
            reason: 'Same amount, vendor, and category within 24 hours'
          });
        }
        // Potential duplicate: same amount and vendor, different employee
        else if (e1.amount === e2.amount && e1.vendor === e2.vendor && e1.user_id !== e2.user_id && timeDiff < dayInMs * 3) {
          potentialDuplicates.push({
            expense1: { id: e1.id, employee: e1.profiles?.full_name, amount: e1.amount, vendor: e1.vendor, date: e1.date },
            expense2: { id: e2.id, employee: e2.profiles?.full_name, amount: e2.amount, vendor: e2.vendor, date: e2.date },
            reason: 'Same amount and vendor, different employees within 3 days'
          });
        }
      }
    }

    // Find highest single expense claims
    const sortedByAmount = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount));
    const highestClaims = sortedByAmount.slice(0, 10).map(e => ({
      id: e.id,
      employee: e.profiles?.full_name || 'Unknown',
      amount: Number(e.amount),
      vendor: e.vendor,
      category: e.category,
      date: e.date,
      status: e.status
    }));

    // Employee with highest total reimbursement
    const employeeRanking = Array.from(employeeMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data], index) => ({
        rank: index + 1,
        name,
        totalAmount: data.total,
        expenseCount: data.count,
        pendingAmount: data.pending,
        approvedAmount: data.approved,
        rejectedAmount: data.rejected,
        email: data.email
      }));

    // Fetch join requests scoped to this org only
    const { data: joinRequests } = orgId
      ? await supabase
          .from('join_requests')
          .select('*, profiles!join_requests_employee_id_fkey(full_name, email)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
      : { data: [] };

    const pendingJoinRequests = (joinRequests || []).filter(jr => jr.status === 'pending');

    // AI-detected expense analysis
    const aiDetectedExpenses = expenses.filter(e => e.is_ai_generated === true);

    // Round number expenses (potential anomaly)
    const roundNumberExpenses = expenses.filter(e => Number(e.amount) % 100 === 0 && Number(e.amount) >= 1000);

    // Build rich context for AI
    const expenseSummary = {
      current_time: now.toISOString(),
      database_stats: {
        total_expenses: expenses.length,
        total_profiles: profiles?.length || 0,
        total_organizations: organizations?.length || 0,
        pending_join_requests: pendingJoinRequests.length
      },
      overall: {
        total: expenses.length,
        totalAmount: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
        pending: expenses.filter(e => e.status === 'pending').length,
        pendingAmount: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0),
        approved: expenses.filter(e => e.status === 'approved').length,
        approvedAmount: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0),
        rejected: expenses.filter(e => e.status === 'rejected').length,
        rejectedAmount: expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + Number(e.amount), 0),
      },
      time_ranges: {
        last_1_hour: {
          count: expenses1h.length,
          total: expenses1h.reduce((sum, e) => sum + Number(e.amount), 0)
        },
        last_3_hours: {
          count: expenses3h.length,
          total: expenses3h.reduce((sum, e) => sum + Number(e.amount), 0)
        },
        last_6_hours: {
          count: expenses6h.length,
          total: expenses6h.reduce((sum, e) => sum + Number(e.amount), 0)
        },
        last_24_hours: {
          count: expenses24h.length,
          total: expenses24h.reduce((sum, e) => sum + Number(e.amount), 0),
          approved: expenses24h.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0)
        },
        last_7_days: {
          count: expenses7d.length,
          total: expenses7d.reduce((sum, e) => sum + Number(e.amount), 0)
        },
        last_30_days: {
          count: expenses30d.length,
          total: expenses30d.reduce((sum, e) => sum + Number(e.amount), 0)
        },
        last_90_days: {
          count: expenses90d.length,
          total: expenses90d.reduce((sum, e) => sum + Number(e.amount), 0)
        }
      },
      recent_expenses: recentExpenses,
      duplicates: {
        exact: duplicates.slice(0, 10),
        potential: potentialDuplicates.slice(0, 10),
        exactCount: duplicates.length,
        potentialCount: potentialDuplicates.length
      },
      employee_ranking: employeeRanking.slice(0, 15),
      highest_claims: highestClaims,
      anomalies: {
        ai_detected: aiDetectedExpenses.length,
        round_numbers: roundNumberExpenses.length
      },
      categories: Array.from(categoryMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, data]) => ({ name, ...data })),
      vendors: Array.from(vendorMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, data]) => ({ name, ...data })),
      employees: Array.from(employeeMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, data]) => ({ name, ...data }))
    };

    const systemPrompt = `You are the Paisaback Copilot — an advanced AI analytics assistant with COMPLETE access to the expense management database.

COMPLETE DATABASE ACCESS:
You have full read access to ALL expense data, employee profiles, organizational information, join requests, and anomaly detection. You can answer ANY question about expenses, duplicates, trends, employees, vendors, categories, anomalies, and provide strategic financial advice.

CURRENT DATA SNAPSHOT (${now.toISOString()}):
📊 **Overall Statistics**
- Total Expenses: ${expenseSummary.overall.total} (₹${expenseSummary.overall.totalAmount.toFixed(2)})
- Pending: ${expenseSummary.overall.pending} (₹${expenseSummary.overall.pendingAmount.toFixed(2)})
- Approved: ${expenseSummary.overall.approved} (₹${expenseSummary.overall.approvedAmount.toFixed(2)})
- Rejected: ${expenseSummary.overall.rejected} (₹${expenseSummary.overall.rejectedAmount.toFixed(2)})
- Team Members: ${expenseSummary.database_stats.total_profiles}
- Pending Join Requests: ${expenseSummary.database_stats.pending_join_requests}

🔍 **DUPLICATE EXPENSE DETECTION:**
- Exact Duplicates Found: ${expenseSummary.duplicates.exactCount} (same amount, vendor, category within 24h)
- Potential Duplicates: ${expenseSummary.duplicates.potentialCount} (same amount/vendor, different employees)
${expenseSummary.duplicates.exact.length > 0 ? `\nExact Duplicates:\n${expenseSummary.duplicates.exact.map((d: any, i: number) => `${i + 1}. ₹${d.expense1.amount} at ${d.expense1.vendor} - ${d.expense1.employee} vs ${d.expense2.employee} - ${d.reason}`).join('\n')}` : ''}
${expenseSummary.duplicates.potential.length > 0 ? `\nPotential Duplicates:\n${expenseSummary.duplicates.potential.map((d: any, i: number) => `${i + 1}. ₹${d.expense1.amount} at ${d.expense1.vendor} - ${d.expense1.employee} (${new Date(d.expense1.date).toLocaleDateString()}) vs ${d.expense2.employee} (${new Date(d.expense2.date).toLocaleDateString()})`).join('\n')}` : ''}

👑 **EMPLOYEE RANKING (by total reimbursements):**
${expenseSummary.employee_ranking.map((e: any) => `#${e.rank}. ${e.name}: ₹${e.totalAmount.toFixed(2)} total (${e.expenseCount} claims, ₹${e.approvedAmount.toFixed(2)} approved, ₹${e.pendingAmount.toFixed(2)} pending)`).join('\n')}

💰 **HIGHEST SINGLE CLAIMS (Top 10):**
${expenseSummary.highest_claims.map((e: any, i: number) => `${i + 1}. ₹${e.amount.toFixed(2)} - ${e.employee} - ${e.vendor} - ${e.category} - ${e.status}`).join('\n')}

⚠️ **ANOMALY DETECTION:**
- AI-Generated Receipt Flags: ${expenseSummary.anomalies.ai_detected}
- Round Number Expenses (≥₹1000): ${expenseSummary.anomalies.round_numbers}

📅 **Granular Time-Based Metrics**
- Last 1 hour: ${expenseSummary.time_ranges.last_1_hour.count} expenses (₹${expenseSummary.time_ranges.last_1_hour.total.toFixed(2)})
- Last 3 hours: ${expenseSummary.time_ranges.last_3_hours.count} expenses (₹${expenseSummary.time_ranges.last_3_hours.total.toFixed(2)})
- Last 6 hours: ${expenseSummary.time_ranges.last_6_hours.count} expenses (₹${expenseSummary.time_ranges.last_6_hours.total.toFixed(2)})
- Last 24 hours: ${expenseSummary.time_ranges.last_24_hours.count} expenses (₹${expenseSummary.time_ranges.last_24_hours.total.toFixed(2)})
- Last 7 days: ${expenseSummary.time_ranges.last_7_days.count} expenses (₹${expenseSummary.time_ranges.last_7_days.total.toFixed(2)})
- Last 30 days: ${expenseSummary.time_ranges.last_30_days.count} expenses (₹${expenseSummary.time_ranges.last_30_days.total.toFixed(2)})
- Last 90 days: ${expenseSummary.time_ranges.last_90_days.count} expenses (₹${expenseSummary.time_ranges.last_90_days.total.toFixed(2)})

📝 **Recent Expenses (Most Recent 20):**
${recentExpenses.map((e, i) => `${i + 1}. ${e.employee} - ₹${e.amount} - ${e.category} - ${e.vendor} - ${new Date(e.date).toLocaleString()} - ${e.status}`).join('\n')}

🏪 **All Vendors (sorted by total):**
${expenseSummary.vendors.slice(0, 15).map((v: any, i: number) => `${i + 1}. ${v.name}: ₹${v.total.toFixed(2)} (${v.count} transactions)`).join('\n')}

👥 **All Employees (sorted by total):**
${expenseSummary.employees.slice(0, 15).map((e: any, i: number) => `${i + 1}. ${e.name}: ₹${e.total.toFixed(2)} (${e.count} expenses, ₹${e.pending.toFixed(2)} pending, ₹${e.approved.toFixed(2)} approved)`).join('\n')}

📂 **All Categories (sorted by total):**
${expenseSummary.categories.slice(0, 20).map((c: any, i: number) => `${i + 1}. ${c.name}: ₹${c.total.toFixed(2)} (${c.count} expenses, ${c.pending} pending, ${c.approved} approved, ${c.rejected} rejected)`).join('\n')}

YOUR CAPABILITIES:
1. **ANY Question**: Answer literally ANY question about the expense database - no restrictions
2. **Duplicate Detection**: Find exact duplicates (same expense submitted twice) and potential duplicates (similar expenses from different employees)
3. **Employee Ranking**: Show who has the highest/lowest reimbursements, most claims, etc.
4. **Highest Claims**: Identify the biggest single expense claims
5. **Anomaly Detection**: Flag AI-generated receipts, round number expenses, suspicious patterns
6. **Financial Advice**: Provide strategic insights on expense control, budget optimization
7. **Trend Analysis**: Identify patterns over time and opportunities for savings
8. **Time-based Filtering**: Support any time range (1h, 3h, 6h, 24h, week, month, quarter, year)
9. **Comparative Analysis**: Compare periods, employees, categories, vendors
10. **Join Requests**: Track pending team member join requests

QUERY UNDERSTANDING:
- "which employee has highest reimbursement/claims" → Use EMPLOYEE RANKING data
- "how many duplicate claims/expenses" → Use DUPLICATE DETECTION data
- "show duplicates" → List all exact and potential duplicates found
- "highest/biggest expense" → Use HIGHEST SINGLE CLAIMS data
- "anomalies" or "suspicious" → Show AI-detected issues, round numbers, duplicates
- "last N expenses" → List the N most recent expenses with details
- "expenses in last X hours/days/weeks" → Filter by time range
- "spending by [employee/vendor/category]" → Detailed breakdown with insights
- "compare [period A] vs [period B]" → Side-by-side comparison with % changes
- "who spent most on [category]" → Filter employee data by category
- "pending join requests" → Show team member requests waiting for approval

RESPONSE FORMAT:
Return ONLY valid JSON (no markdown, no backticks, no extra text):
{
  "response": "Natural language answer with **markdown** support. Use markdown tables for tabular data.",
  "metadata": {
    "type": "insight|summary|anomaly|comparison",
    "links": [{"label": "View Details", "url": "/admin/expenses"}],
    "suggestions": ["Show by employee", "Compare with last month"]
  }
}

IMPORTANT TABLE FORMATTING:
When displaying lists of data (employees, vendors, categories), ALWAYS use proper markdown tables:
- Use pipe characters | to separate columns
- Include a header row with column names
- Include a separator row with dashes
- Align currency values to the right
- Keep it clean and readable

Example table format:
| Employee | Total Amount | Count |
|----------|-------------:|------:|
| John Doe | ₹24,900.00   | 8     |
| Jane Smith | ₹20,500.00 | 6     |

EXAMPLE RESPONSES:

Query: "last 3 expenses"
{"response":"📝 **Last 3 Expenses:**\\n\\n| # | Employee | Amount | Category | Vendor | Date | Status |\\n|---|----------|-------:|----------|--------|------|--------|\\n| 1 | John | ₹500 | Food | Cafe | 2025-10-29 02:30 | Pending |\\n| 2 | Jane | ₹1,200 | Travel | Uber | 2025-10-29 01:15 | Approved |\\n| 3 | Mike | ₹800 | Office | Amazon | 2025-10-28 23:45 | Pending |","metadata":{"type":"summary","links":[{"label":"View All","url":"/admin/expenses"}],"suggestions":["Show last 10 expenses","Filter by status"]}}

Query: "expenses in last 3 hours"
{"response":"⏱️ **Expenses in Last 3 Hours:**\\n\\n**Total: 5 expenses** worth **₹4,200**\\n\\n| Employee | Amount | Category | Time |\\n|----------|-------:|----------|------|\\n| John | ₹500 | Food | 45 min ago |\\n| Sarah | ₹1,800 | Travel | 1.5 hrs ago |\\n| Mike | ₹900 | Office | 2 hrs ago |\\n| Lisa | ₹600 | Meals | 2.5 hrs ago |\\n| Tom | ₹400 | Transport | 2.8 hrs ago |","metadata":{"type":"summary","suggestions":["Show by category","Compare with yesterday"]}}

Query: "how do I control food expenses"
{"response":"🍽️ **Strategies to Control Food Expenses:**\\n\\n**Current Situation:**\\n- Food category: ₹45,600 (18% of total spend)\\n- Average per expense: ₹380\\n- Top spender: John (₹8,900)\\n\\n**💡 Recommendations:**\\n\\n1. **Set Daily Limits**\\n   - Implement ₹300/day food allowance per employee\\n   - Current average is ₹380, this could save ~21%\\n\\n2. **Preferred Vendors**\\n   - Negotiate corporate rates with top 3 vendors\\n   - Potential savings: ₹5,000-8,000/month\\n\\n3. **Meal Plans**\\n   - Encourage team lunches (bulk discounts)\\n   - Restrict individual expensive restaurants\\n\\n4. **Approval Workflow**\\n   - Auto-approve: <₹300\\n   - Manager review: ₹300-500\\n   - Reject: >₹500 without justification\\n\\n5. **Monitor Trends**\\n   - Track weekly food spend\\n   - Alert when >20% increase detected\\n\\n**Expected Impact:** 15-25% reduction in food expenses (~₹7K-11K/month)","metadata":{"type":"insight","links":[{"label":"View Food Expenses","url":"/admin/expenses?category=Food"}],"suggestions":["Show food expense trends","Top food spenders","Compare with industry benchmarks"]}}

Query: "Top vendors this month"
{"response":"📊 **Top Vendors This Month:**\\n\\n| Vendor | Amount | Transactions | Avg/Transaction |\\n|--------|-------:|---------:|----------------:|\\n| Sharma | ₹24,900 | 8 | ₹3,113 |\\n| ZODIACAL OVERSEAS | ₹21,000 | 4 | ₹5,250 |\\n| Abhishek Sharma | ₹20,000 | 6 | ₹3,333 |\\n\\nThese 3 vendors account for **₹65,900** (~45% of total spend).","metadata":{"type":"insight","links":[{"label":"View All Vendors","url":"/admin/expenses"}],"suggestions":["Show vendor trends","Compare with last month","Negotiate better rates"]}}

Query: "which employee has highest reimbursement"
{"response":"👑 **Employee with Highest Reimbursements:**\\n\\n| Rank | Employee | Total Claims | Expense Count | Approved | Pending |\\n|-----:|----------|-------------:|--------------:|---------:|--------:|\\n| 1 | John Doe | ₹45,600 | 15 | ₹38,200 | ₹7,400 |\\n| 2 | Jane Smith | ₹32,100 | 12 | ₹28,500 | ₹3,600 |\\n| 3 | Mike Johnson | ₹24,800 | 8 | ₹24,800 | ₹0 |\\n\\n**John Doe** leads with **₹45,600** in total reimbursement claims across 15 expenses.\\n\\n📊 Average claim size: ₹3,040","metadata":{"type":"insight","links":[{"label":"View John's Expenses","url":"/admin/expenses?employee=John"}],"suggestions":["Show John's expense breakdown","Compare with team average","Top spenders by category"]}}

Query: "how many duplicate claims are there"
{"response":"🔍 **Duplicate Expense Analysis:**\\n\\n**Exact Duplicates Found: 3**\\n(Same amount, vendor, category within 24 hours)\\n\\n| Amount | Vendor | Employee 1 | Employee 2 | Reason |\\n|-------:|--------|------------|------------|--------|\\n| ₹2,500 | Uber | John | John | Same expense submitted twice |\\n| ₹1,800 | Cafe XYZ | Jane | Jane | Duplicate submission |\\n| ₹3,200 | Amazon | Mike | Mike | Same receipt uploaded twice |\\n\\n**Potential Duplicates: 5**\\n(Same amount/vendor, different employees within 3 days)\\n\\n⚠️ **Action Required:** Review these 3 exact duplicates - they may need to be rejected to prevent double reimbursement.","metadata":{"type":"anomaly","links":[{"label":"View Anomalies","url":"/admin/anomalies"}],"suggestions":["Show all anomalies","Reject duplicates","Employee fraud patterns"]}}

Query: "show anomalies"
{"response":"⚠️ **Anomaly Report:**\\n\\n**1. AI-Generated Receipt Flags: 2**\\n- Receipts detected as potentially AI-generated\\n- Requires manual verification\\n\\n**2. Duplicate Expenses: 3 exact, 5 potential**\\n- Same expense may have been submitted multiple times\\n\\n**3. Round Number Expenses: 8**\\n- Expenses with suspiciously round amounts (₹1000, ₹5000, etc.)\\n\\n**4. High-Value Outliers:**\\n| Employee | Amount | Category | Date |\\n|----------|-------:|----------|------|\\n| John | ₹15,000 | Travel | 2025-10-28 |\\n| Jane | ₹12,500 | Office | 2025-10-25 |\\n\\n**Recommendation:** Review flagged expenses before approval.","metadata":{"type":"anomaly","links":[{"label":"Open Anomaly Dashboard","url":"/admin/anomalies"}],"suggestions":["Show duplicate details","Employee risk analysis","Weekly anomaly trends"]}}

Always be helpful, accurate, and actionable. Provide strategic insights beyond just data reporting. Remember: you can answer ANY question about the expense database.`;

    // Call OpenAI API
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(conversationHistory || []).slice(-6),
          { role: 'user', content: query }
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let aiContent = aiData.choices[0].message.content;

    // Clean up any markdown code blocks if AI adds them
    aiContent = aiContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Try to parse JSON response
    let response, metadata;
    try {
      const parsed = JSON.parse(aiContent);
      response = parsed.response || aiContent;
      metadata = parsed.metadata || { type: "summary", links: [] };
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw AI content:', aiContent);
      // Fallback: use raw content as response
      response = aiContent;
      metadata = { type: "summary", links: [] };
    }

    console.log('Chatbot response generated successfully');

    return new Response(
      JSON.stringify({ response, metadata }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Chatbot error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "Sorry, I'm having trouble processing that. Please try rephrasing your question.",
        metadata: { type: "error" }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
