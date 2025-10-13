import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GmailExpenseRequest {
  userId: string;
  accessToken: string;
}

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    'food': '🍽️',
    'travel': '🚗',
    'hotel': '🏨',
    'flight': '✈️',
    'entertainment': '🎭',
    'office': '🏢',
    'other': '📋',
  };
  return icons[category.toLowerCase()] || '📋';
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'food': '#FF6B6B',
    'travel': '#4ECDC4',
    'hotel': '#95E1D3',
    'flight': '#F38181',
    'entertainment': '#AA96DA',
    'office': '#FCBAD3',
    'other': '#C7CEEA',
  };
  return colors[category.toLowerCase()] || '#C7CEEA';
};

const generateProfessionalEmailHTML = (
  employeeName: string,
  expenses: any[],
  totalAmount: number,
  categoryBreakdown: any,
  period: { start: string; end: string }
): string => {
  const categoryRows = Object.entries(categoryBreakdown)
    .map(([category, data]: [string, any]) => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 16px 12px;">
          <span style="font-size: 20px; margin-right: 8px;">${getCategoryIcon(category)}</span>
          <span style="font-weight: 500; color: #374151;">${category}</span>
        </td>
        <td style="padding: 16px 12px; text-align: center; color: #6B7280;">${data.count}</td>
        <td style="padding: 16px 12px; text-align: right;">
          <span style="font-weight: 600; color: #111827;">₹${data.amount.toFixed(2)}</span>
        </td>
        <td style="padding: 16px 12px; text-align: right; color: #6B7280;">
          ${((data.amount / totalAmount) * 100).toFixed(1)}%
        </td>
      </tr>
    `).join('');

  const expenseRows = expenses.map((expense, index) => `
    <div style="background: ${index % 2 === 0 ? '#F9FAFB' : '#FFFFFF'}; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${getCategoryColor(expense.category)};">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #111827; font-size: 16px; margin-bottom: 4px;">
            ${getCategoryIcon(expense.category)} ${expense.vendor}
          </div>
          <div style="color: #6B7280; font-size: 14px; margin-bottom: 4px;">
            ${new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          ${expense.description ? `
            <div style="color: #374151; font-size: 14px; margin-top: 8px; padding: 8px; background: white; border-radius: 4px;">
              <strong>Description:</strong> ${expense.description}
            </div>
          ` : ''}
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; color: #0B6E4F; font-size: 18px;">₹${expense.amount}</div>
          <div style="display: inline-block; margin-top: 4px; padding: 4px 12px; background: ${expense.status === 'approved' ? '#D1FAE5' : expense.status === 'rejected' ? '#FEE2E2' : '#FEF3C7'}; color: ${expense.status === 'approved' ? '#065F46' : expense.status === 'rejected' ? '#991B1B' : '#92400E'}; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
            ${expense.status}
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 16px; font-size: 13px; color: #6B7280; flex-wrap: wrap;">
        <div><strong>Category:</strong> ${expense.category}</div>
        ${expense.mode_of_payment ? `<div><strong>Payment:</strong> ${expense.mode_of_payment}</div>` : ''}
        ${expense.attachments && expense.attachments.length > 0 ? `<div><strong>📎 Receipts:</strong> ${expense.attachments.length} attached</div>` : ''}
      </div>
    </div>
  `).join('');

  const avgExpense = expenses.length > 0 ? (totalAmount / expenses.length).toFixed(2) : '0.00';
  const mostCommonCategory = Object.entries(categoryBreakdown).sort((a: any, b: any) => b[1].count - a[1].count)[0]?.[0] || 'N/A';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expense Report - ${employeeName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
  <div style="max-width: 800px; margin: 0 auto; background: white;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0B6E4F 0%, #08A88A 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
        💰 PAISABACK
      </h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
        Expense Reimbursement Report
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      
      <!-- Employee Info -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">Employee: ${employeeName}</h2>
        <p style="color: #6B7280; margin: 0; font-size: 14px;">
          Report Period: ${period.start} to ${period.end}
        </p>
      </div>

      <!-- Executive Summary -->
      <div style="background: linear-gradient(135deg, #0B6E4F 0%, #08A88A 100%); border-radius: 12px; padding: 24px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; color: white;">
          <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; margin-bottom: 8px;">
            Total Reimbursement Amount
          </div>
          <div style="font-size: 48px; font-weight: 700; margin-bottom: 20px;">
            ₹${totalAmount.toFixed(2)}
          </div>
          <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px;">
            <div>
              <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Total Expenses</div>
              <div style="font-size: 24px; font-weight: 600;">${expenses.length}</div>
            </div>
            <div>
              <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Avg Amount</div>
              <div style="font-size: 24px; font-weight: 600;">₹${avgExpense}</div>
            </div>
            <div>
              <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Top Category</div>
              <div style="font-size: 24px; font-weight: 600;">${getCategoryIcon(mostCommonCategory)} ${mostCommonCategory}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111827; font-size: 20px; margin: 0 0 16px 0; border-bottom: 2px solid #0B6E4F; padding-bottom: 8px;">
          📊 Category Breakdown
        </h3>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background: #F9FAFB; border-bottom: 2px solid #E5E7EB;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 14px;">Category</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; font-size: 14px;">Count</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; font-size: 14px;">Amount</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; font-size: 14px;">% of Total</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows}
          </tbody>
        </table>
      </div>

      <!-- Detailed Expense List -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111827; font-size: 20px; margin: 0 0 16px 0; border-bottom: 2px solid #0B6E4F; padding-bottom: 8px;">
          📋 Detailed Expense List
        </h3>
        ${expenseRows}
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 14px;">
        <p style="margin: 0 0 8px 0;">
          This is an automated expense report generated by PAISABACK
        </p>
        <p style="margin: 0; font-size: 12px;">
          Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #9CA3AF;">
          For questions or concerns, please contact ${employeeName}
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, accessToken }: GmailExpenseRequest = await req.json();
    console.log('Processing Gmail expense request for user:', userId);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, superior_email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    if (!profile.superior_email) {
      throw new Error('No superior email configured for this user');
    }

    // Fetch expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (expensesError) throw expensesError;

    if (!expenses || expenses.length === 0) {
      throw new Error('No expenses found for this user');
    }

    // Generate breakdown
    const categoryBreakdown: any = {};
    let totalAmount = 0;

    expenses.forEach((expense) => {
      const category = expense.category || 'Other';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { amount: 0, count: 0 };
      }
      categoryBreakdown[category].amount += parseFloat(expense.amount);
      categoryBreakdown[category].count += 1;
      totalAmount += parseFloat(expense.amount);
    });

    // Get date range
    const dates = expenses.map(e => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
    const period = {
      start: dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      end: dates[dates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    // Download and encode attachments
    const attachmentData: any[] = [];
    for (const expense of expenses) {
      if (expense.attachments && expense.attachments.length > 0) {
        for (const attachmentUrl of expense.attachments) {
          try {
            const response = await fetch(attachmentUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            
            const filename = attachmentUrl.split('/').pop() || 'receipt.jpg';
            attachmentData.push({
              filename,
              content: base64Data,
              type: blob.type || 'image/jpeg',
            });
          } catch (error) {
            console.error('Error downloading attachment:', error);
          }
        }
      }
    }

    // Generate HTML email
    const htmlContent = generateProfessionalEmailHTML(
      profile.full_name || profile.email,
      expenses,
      totalAmount,
      categoryBreakdown,
      period
    );

    // Create MIME message
    const boundary = '==BOUNDARY==';

    let mimeMessage = [
      `To: ${profile.superior_email}`,
      `From: ${profile.email}`,
      `Subject: 💰 Expense Reimbursement Request - ${profile.full_name || profile.email} (₹${totalAmount.toFixed(2)})`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      htmlContent,
      '',
    ];

    // Add attachments
    for (const attachment of attachmentData) {
      mimeMessage.push(`--${boundary}`);
      mimeMessage.push(`Content-Type: ${attachment.type}; name="${attachment.filename}"`);
      mimeMessage.push('Content-Transfer-Encoding: base64');
      mimeMessage.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      mimeMessage.push('');
      mimeMessage.push(attachment.content);
      mimeMessage.push('');
    }

    mimeMessage.push(`--${boundary}--`);

    const rawMessage = mimeMessage.join('\r\n');
    const encodedMessage = btoa(rawMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Send via Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text();
      console.error('Gmail API error:', errorText);
      throw new Error(`Gmail API error: ${gmailResponse.status} - ${errorText}`);
    }

    const result = await gmailResponse.json();
    console.log('Email sent successfully via Gmail:', result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in send-gmail-expense:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
};

serve(handler);
