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
    const { query, conversationHistory } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Fetching comprehensive database data...');

    // Fetch ALL relevant data from database
    const now = new Date();
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);
    const last3h = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const last6h = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Fetch ALL expenses (no limit)
    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('*, profiles!expenses_user_id_fkey(id, full_name, email)')
      .order('date', { ascending: false });

    const expenses = allExpenses || [];

    // Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*');

    // Fetch organization data
    const { data: organizations } = await supabase
      .from('organizations')
      .select('*');

    // Fetch notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
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

    // Category breakdown
    const categoryMap = new Map();
    expenses.forEach(e => {
      if (!categoryMap.has(e.category)) {
        categoryMap.set(e.category, { count: 0, total: 0 });
      }
      const cat = categoryMap.get(e.category);
      cat.count++;
      cat.total += Number(e.amount);
    });

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

    // Build rich context for AI
    const expenseSummary = {
      current_time: now.toISOString(),
      database_stats: {
        total_expenses: expenses.length,
        total_profiles: profiles?.length || 0,
        total_organizations: organizations?.length || 0
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

    const systemPrompt = `You are the Paisaback Copilot — an advanced AI analytics assistant with complete access to the expense management database.

COMPLETE DATABASE ACCESS:
You have full read access to ALL expense data, employee profiles, and organizational information. You can answer ANY question about expenses, trends, employees, vendors, categories, and provide strategic financial advice.

CURRENT DATA SNAPSHOT (${now.toISOString()}):
📊 **Overall Statistics**
- Total Expenses: ${expenseSummary.overall.total} (₹${expenseSummary.overall.totalAmount.toFixed(2)})
- Pending: ${expenseSummary.overall.pending} (₹${expenseSummary.overall.pendingAmount.toFixed(2)})
- Approved: ${expenseSummary.overall.approved} (₹${expenseSummary.overall.approvedAmount.toFixed(2)})
- Rejected: ${expenseSummary.overall.rejected} (₹${expenseSummary.overall.rejectedAmount.toFixed(2)})

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
${expenseSummary.vendors.slice(0, 15).map((v, i) => `${i + 1}. ${v.name}: ₹${v.total.toFixed(2)} (${v.count} transactions)`).join('\n')}

👥 **All Employees (sorted by total):**
${expenseSummary.employees.slice(0, 15).map((e, i) => `${i + 1}. ${e.name}: ₹${e.total.toFixed(2)} (${e.count} expenses, ${e.pending.toFixed(2)} pending, ${e.approved.toFixed(2)} approved)`).join('\n')}

📂 **All Categories (sorted by total):**
${expenseSummary.categories.slice(0, 15).map((c, i) => `${i + 1}. ${c.name}: ₹${c.total.toFixed(2)} (${c.count} expenses)`).join('\n')}

YOUR CAPABILITIES:
1. **Detailed Queries**: Answer specific questions like "last 3 expenses", "expenses in last 3 hours"
2. **Financial Advice**: Provide strategic insights on expense control, budget optimization, category management
3. **Trend Analysis**: Identify patterns, anomalies, and opportunities for savings
4. **Employee Analytics**: Deep dive into individual or team spending patterns
5. **Time-based Filtering**: Support any time range (1h, 3h, 6h, 24h, week, month, quarter, year)
6. **Comparative Analysis**: Compare periods, employees, categories, vendors
7. **Recommendations**: Suggest cost-saving measures, policy improvements, approval workflows

QUERY UNDERSTANDING:
- "last N expenses" → List the N most recent expenses with details
- "expenses in last X hours/days/weeks" → Filter by time range
- "how to control [category] expenses" → Provide strategic advice and actionable recommendations
- "spending by [employee/vendor/category]" → Detailed breakdown with insights
- "compare [period A] vs [period B]" → Side-by-side comparison with % changes
- "trends" → Identify patterns over time
- "anomalies" or "unusual" → Flag outliers and suspicious patterns

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

Always be helpful, accurate, and actionable. Provide strategic insights beyond just data reporting.`;

    console.log('Calling OpenAI API...');
    
    // Call OpenAI API
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(conversationHistory || []).slice(-6),
          { role: 'user', content: query }
        ],
        max_completion_tokens: 2000,
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
