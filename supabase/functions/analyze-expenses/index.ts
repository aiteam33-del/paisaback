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

    // Get organization
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('admin_user_id', user.id)
      .single();

    if (!orgData) {
      return new Response(JSON.stringify({ error: 'No organization found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get all expenses for the organization
    const { data: employees } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', orgData.id);

    const employeeIds = (employees || []).map(e => e.id);
    
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .in('user_id', employeeIds)
      .order('date', { ascending: false });

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
            content: 'You are a financial analyst specializing in expense management and business optimization. Provide detailed, actionable insights based on expense data.'
          },
          {
            role: 'user',
            content: `Analyze the following expense data and provide detailed insights and recommendations:

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
1. Key Insights: What are the main spending patterns?
2. Areas of Concern: Are there any red flags or unusual spending?
3. Recommendations: Specific actions to improve expense management
4. Cost Optimization: Ways to reduce unnecessary spending
5. Process Improvements: Suggestions for better expense tracking and approval workflows

Format your response in clear sections with bullet points for easy reading.`
          }
        ],
        max_completion_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate analysis',
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

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
