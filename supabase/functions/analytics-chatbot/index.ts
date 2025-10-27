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

    // Fetch analytics context (read-only)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(100);

    // Build context for AI
    const expenseSummary = {
      total: expenses?.length || 0,
      totalAmount: expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
      pending: expenses?.filter(e => e.status === 'pending').length || 0,
      approved: expenses?.filter(e => e.status === 'approved').length || 0,
      rejected: expenses?.filter(e => e.status === 'rejected').length || 0,
      categories: [...new Set(expenses?.map(e => e.category))],
      topVendors: Object.entries(
        expenses?.reduce((acc, e) => {
          acc[e.vendor] = (acc[e.vendor] || 0) + Number(e.amount);
          return acc;
        }, {} as Record<string, number>) || {}
      )
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([vendor, amount]) => ({ vendor, amount: amount as number }))
    };

    const systemPrompt = `You are an analytics copilot for Paisaback, an expense management system.

CONTEXT:
- Total expenses: ${expenseSummary.total}
- Total amount: ₹${expenseSummary.totalAmount.toFixed(2)}
- Pending: ${expenseSummary.pending}, Approved: ${expenseSummary.approved}, Rejected: ${expenseSummary.rejected}
- Top vendors: ${expenseSummary.topVendors.map(v => `${v.vendor} (₹${v.amount})`).join(', ')}
- Categories: ${expenseSummary.categories.join(', ')}

PERSONALITY:
- Conversational, insightful, confident
- Use emojis sparingly (👀, ⚠️, 🚀, 💰)
- Be concise but helpful
- Highlight anomalies or interesting patterns

CRITICAL RESPONSE FORMAT:
You MUST return ONLY a valid JSON object. No markdown, no code blocks, no backticks, no explanatory text before or after.
Just pure JSON in this exact structure:
{
  "response": "your natural language answer here",
  "metadata": {
    "type": "insight",
    "links": [{"label": "View Details", "url": "/admin/expenses"}]
  }
}

Example good response:
{"response":"Sure! Your top vendors are Sharma (₹24,900), ZODIACAL OVERSEAS (₹21,000), and Abhishek Sharma (₹20,000). They account for most of your spending.","metadata":{"type":"insight","links":[{"label":"View Vendor Details","url":"/admin/vendors"}]}}

When asked about:
- Vendors: analyze top spenders, concentration risk
- Employees: show who submits most, approval rates
- Anomalies: flag outliers, suspicious patterns
- Trends: compare time periods, categories

Always suggest next actions via links.`;

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
