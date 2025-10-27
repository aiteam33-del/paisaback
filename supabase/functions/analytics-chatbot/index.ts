import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { query, conversationHistory } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Fetch comprehensive analytics context (read-only)
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    const expenses = allExpenses || [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(200);

    // Calculate time-based metrics
    const expenses24h = expenses.filter(e => new Date(e.created_at) >= last24h);
    const expenses7d = expenses.filter(e => new Date(e.created_at) >= last7d);
    const expenses30d = expenses.filter(e => new Date(e.created_at) >= last30d);
    const expenses90d = expenses.filter(e => new Date(e.created_at) >= last90d);

    // Employee breakdown
    const employeeMap = new Map();
    expenses.forEach(e => {
      const profile = profiles?.find(p => p.id === e.user_id);
      const name = profile?.full_name || 'Unknown';
      if (!employeeMap.has(name)) {
        employeeMap.set(name, { count: 0, total: 0, pending: 0, approved: 0 });
      }
      const emp = employeeMap.get(name);
      emp.count++;
      emp.total += Number(e.amount);
      if (e.status === 'pending') emp.pending += Number(e.amount);
      if (e.status === 'approved') emp.approved += Number(e.amount);
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

    // Build rich context for AI
    const expenseSummary = {
      total: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      pending: expenses.filter(e => e.status === 'pending').length,
      approved: expenses.filter(e => e.status === 'approved').length,
      rejected: expenses.filter(e => e.status === 'rejected').length,
      last24h: {
        count: expenses24h.length,
        total: expenses24h.reduce((sum, e) => sum + Number(e.amount), 0),
        approved: expenses24h.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0)
      },
      last7d: {
        count: expenses7d.length,
        total: expenses7d.reduce((sum, e) => sum + Number(e.amount), 0)
      },
      last30d: {
        count: expenses30d.length,
        total: expenses30d.reduce((sum, e) => sum + Number(e.amount), 0)
      },
      last90d: {
        count: expenses90d.length,
        total: expenses90d.reduce((sum, e) => sum + Number(e.amount), 0)
      },
      categories: Array.from(categoryMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data })),
      topVendors: Array.from(vendorMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data })),
      topEmployees: Array.from(employeeMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data }))
    };

    const systemPrompt = `You are the Paisaback Copilot — an intelligent analytics assistant for expense management.

CURRENT DATA SNAPSHOT:
📊 **Overall Stats**
- Total expenses: ${expenseSummary.total} (₹${expenseSummary.totalAmount.toFixed(2)})
- Status: ${expenseSummary.pending} pending, ${expenseSummary.approved} approved, ${expenseSummary.rejected} rejected

📅 **Time-Based Metrics**
- Last 24h: ${expenseSummary.last24h.count} expenses (₹${expenseSummary.last24h.total.toFixed(2)}, ₹${expenseSummary.last24h.approved.toFixed(2)} approved)
- Last 7 days: ${expenseSummary.last7d.count} expenses (₹${expenseSummary.last7d.total.toFixed(2)})
- Last 30 days: ${expenseSummary.last30d.count} expenses (₹${expenseSummary.last30d.total.toFixed(2)})
- Last 90 days: ${expenseSummary.last90d.count} expenses (₹${expenseSummary.last90d.total.toFixed(2)})

🏪 **Top Vendors:**
${expenseSummary.topVendors.map((v, i) => `${i + 1}. ${v.name}: ₹${v.total.toFixed(2)} (${v.count} transactions)`).join('\n')}

👥 **Top Employees:**
${expenseSummary.topEmployees.map((e, i) => `${i + 1}. ${e.name}: ₹${e.total.toFixed(2)} (${e.count} expenses, ₹${e.approved.toFixed(2)} approved)`).join('\n')}

📂 **Top Categories:**
${expenseSummary.categories.map((c, i) => `${i + 1}. ${c.name}: ₹${c.total.toFixed(2)} (${c.count} expenses)`).join('\n')}

YOUR ROLE:
- Answer analytical queries conversationally and intelligently
- Support natural date filters (last 24h, this week, this month, Q1, etc.)
- Provide insights, comparisons, and trend analysis
- Use emojis subtly: 💰📊📈⚠️✅❌🔍
- Format responses with **bold**, bullet points, and structure
- Include data tables when listing multiple items
- Suggest follow-up queries

CRITICAL RESPONSE FORMAT:
Return ONLY valid JSON (no markdown, no backticks, no extra text):
{
  "response": "Natural language answer with **markdown** support",
  "metadata": {
    "type": "insight|summary|anomaly|comparison",
    "links": [{"label": "View Details", "url": "/admin/expenses"}],
    "suggestions": ["Show by employee", "Compare with last month"]
  }
}

EXAMPLE RESPONSES:

Query: "Top vendors this month"
{"response":"📊 **Top Vendors This Month:**\\n\\n1. **Sharma** - ₹24,900 (8 transactions)\\n2. **ZODIACAL OVERSEAS** - ₹21,000 (4 transactions)\\n3. **Abhishek Sharma** - ₹20,000 (6 transactions)\\n\\nThese 3 vendors account for **₹65,900** (~45% of total spend).","metadata":{"type":"insight","links":[{"label":"View All Vendors","url":"/admin/expenses"}],"suggestions":["Show vendor trends","Compare with last month"]}}

Query: "Approved expenses last 24 hours"
{"response":"✅ **Last 24 Hours Approvals:**\\n\\nYou've approved **₹${expenseSummary.last24h.approved.toFixed(2)}** from ${expenseSummary.last24h.count} total expenses submitted.","metadata":{"type":"summary","links":[{"label":"Review Expenses","url":"/admin/expenses?status=approved"}],"suggestions":["Show pending expenses","See by employee"]}}

QUERY UNDERSTANDING:
- "last 24h/24 hours/today" → use last24h data
- "this week/last 7 days" → use last7d data
- "this month/last 30 days" → use last30d data
- "this quarter/last 90 days" → use last90d data
- When comparing periods, calculate percentage changes
- When user references previous context, maintain continuity

Always be helpful, accurate, and actionable.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(conversationHistory || []).slice(-4),
          { role: 'user', content: query }
        ],
        temperature: 0.7,
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
