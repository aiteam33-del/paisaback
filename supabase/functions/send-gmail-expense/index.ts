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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, accessToken }: GmailExpenseRequest = await req.json();

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

    if (profileError || !profile) throw new Error("Profile not found");

    const recipientEmail = profile.superior_email || profile.email;

    // Fetch all expenses for the user
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Generate category-wise breakdown
    const categoryBreakdown: Record<string, { amount: number; count: number }> = {};
    let totalAmount = 0;

    expenses?.forEach((expense: any) => {
      const category = expense.category || 'other';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { amount: 0, count: 0 };
      }
      categoryBreakdown[category].amount += Number(expense.amount);
      categoryBreakdown[category].count += 1;
      totalAmount += Number(expense.amount);
    });

    // Generate breakdown text for email
    let breakdownText = '\n\nCategory-wise Expense Breakdown:\n';
    Object.entries(categoryBreakdown).forEach(([category, data]) => {
      const icon = getCategoryIcon(category);
      breakdownText += `${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}: Rs.${data.amount.toLocaleString('en-IN')} (${data.count} expense${data.count > 1 ? 's' : ''})\n`;
    });
    breakdownText += `\nTotal Amount: Rs.${totalAmount.toLocaleString('en-IN')}`;

    // Add detailed expense list with descriptions
    let expenseDetails = '\n\nDetailed Expense List:\n';
    expenses?.forEach((expense: any, index: number) => {
      expenseDetails += `\n${index + 1}. ${getCategoryIcon(expense.category)} ${expense.vendor}\n`;
      expenseDetails += `   Date: ${new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n`;
      expenseDetails += `   Amount: Rs.${expense.amount}\n`;
      if (expense.description) {
        expenseDetails += `   Description: ${expense.description}\n`;
      }
      if (expense.mode_of_payment) {
        expenseDetails += `   Payment: ${expense.mode_of_payment}\n`;
      }
      expenseDetails += `   Status: ${expense.status}\n`;
    });

    // Collect all attachment URLs
    const attachmentUrls: string[] = [];
    expenses?.forEach((expense: any) => {
      if (expense.attachments && Array.isArray(expense.attachments)) {
        attachmentUrls.push(...expense.attachments);
      }
    });

    // Download attachments and convert to base64
    const attachments = await Promise.all(
      attachmentUrls.map(async (url, index) => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0] || `receipt_${index + 1}.png`;
          
          return {
            filename,
            data: base64,
            mimeType: blob.type || 'application/octet-stream'
          };
        } catch (err) {
          console.error(`Failed to download attachment ${url}:`, err);
          return null;
        }
      })
    );

    const validAttachments = attachments.filter(a => a !== null);

    // Prefer the caller origin to build correct links, then fall back to env, then default
    const callerOrigin = req.headers.get('origin') || '';
    const appUrl = callerOrigin || Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('APP_URL') || 'https://paisaback.lovable.app';
    const expensesUrl = `${appUrl}/employee/history`;
    let categoryHtml = '';
    Object.entries(categoryBreakdown).forEach(([category, data]) => {
      const icon = getCategoryIcon(category);
      const percentage = ((data.amount / totalAmount) * 100).toFixed(1);
      categoryHtml += `
        <div style="margin: 8px 0;">
          <strong>${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}:</strong> 
          ₹${data.amount.toLocaleString('en-IN')} (${data.count} expense${data.count > 1 ? 's' : ''}, ${percentage}%)
        </div>`;
    });

    let detailedExpenseHtml = '';
    expenses?.forEach((expense: any, index: number) => {
      const expenseUrl = `${appUrl}/employee?expense=${expense.id}`;
      detailedExpenseHtml += `
        <div style="margin: 16px 0; padding: 12px; background: #f9f9f9; border-radius: 6px;">
          <div style="font-weight: bold; color: #1a1a1a;">
            ${index + 1}. <a href="${expenseUrl}" style="color: #047857; text-decoration: none;">${getCategoryIcon(expense.category)} ${expense.vendor}</a>
          </div>
          <div style="margin-top: 8px; font-size: 14px; color: #666;">
            <div><strong>Date:</strong> ${new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div><strong>Amount:</strong> ₹${expense.amount}</div>
            ${expense.description ? `<div><strong>Description:</strong> ${expense.description}</div>` : ''}
            ${expense.mode_of_payment ? `<div><strong>Payment:</strong> ${expense.mode_of_payment}</div>` : ''}
            <div><strong>Status:</strong> ${expense.status}</div>
            ${expense.attachments && Array.isArray(expense.attachments) && expense.attachments.length ? `
              <div style="margin-top: 6px;">
                <strong>Receipt${expense.attachments.length > 1 ? 's' : ''}:</strong>
                ${expense.attachments.map((u: string, i: number) => `<a href="${u}" target="_blank" rel="noopener noreferrer" style="color: #047857; font-size: 13px; text-decoration: underline;">View${expense.attachments.length > 1 ? ` #${i + 1}` : ''}</a>`).join(' · ')}
              </div>
            ` : ''}
            <div style="margin-top: 8px;">
              <a href="${expenseUrl}" style="color: #047857; font-size: 13px; text-decoration: underline;">View Expense Details →</a>
            </div>
        </div>`;
    });

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #047857 0%, #059669 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">
        PAISABACK
      </h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">
        Expense Reimbursement Request
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 32px 20px;">
      <h2 style="color: #047857; margin: 0 0 20px 0; font-size: 22px;">
        Expense Reimbursement Request
      </h2>

      <p style="color: #1a1a1a; line-height: 1.6; margin: 0 0 20px 0;">
        Dear Finance Team,
      </p>

      <p style="color: #1a1a1a; line-height: 1.6; margin: 0 0 24px 0;">
        Please find attached my recent reimbursement claims along with the supporting bills and screenshots.
      </p>

      <!-- View Expense Summary Button -->
      <div style="margin: 24px 0; text-align: center;">
        <a href="${expensesUrl}" style="display: inline-block; background: #047857; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          View Expense Summary
        </a>
      </div>

      <!-- Category Breakdown -->
      <h3 style="color: #1a1a1a; margin: 32px 0 16px 0; font-size: 18px;">
        Category-wise Expense Breakdown:
      </h3>
      <div style="padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        ${categoryHtml}
      </div>

      <!-- Total Amount -->
      <div style="background: #d1fae5; border-left: 4px solid #047857; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <div style="font-size: 18px; font-weight: bold; color: #1a1a1a;">
          Total Amount: ₹${totalAmount.toLocaleString('en-IN')}
        </div>
      </div>

      <!-- Attachments Notice -->
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <div style="color: #92400e;">
          📎 <strong>Attachments:</strong> ${validAttachments.length} receipt${validAttachments.length !== 1 ? 's' : ''} attached
        </div>
      </div>

      <!-- Detailed Expenses -->
      <h3 style="color: #1a1a1a; margin: 32px 0 16px 0; font-size: 18px;">
        Detailed Expense List:
      </h3>
      ${detailedExpenseHtml}

      <p style="color: #1a1a1a; line-height: 1.6; margin: 32px 0 8px 0;">
        Kindly process the reimbursement to my account at your earliest convenience.
      </p>

      <p style="color: #1a1a1a; line-height: 1.6; margin: 8px 0;">
        Regards,<br>
        <strong>${profile.full_name}</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        This is an automated email from PAISABACK Expense Management System
      </p>
    </div>
  </div>
</body>
</html>`;

    // Create MIME message with attachments
    const boundary = "boundary_" + Math.random().toString(36).substring(2);
    let mimeMessage = [
      `From: ${profile.email}`,
      `To: ${recipientEmail}`,
      `Subject: Expense Reimbursement Request - ${profile.full_name}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      emailBody,
      ``
    ];

    // Add attachments
    validAttachments.forEach((attachment: any) => {
      mimeMessage.push(`--${boundary}`);
      mimeMessage.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
      mimeMessage.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      mimeMessage.push(`Content-Transfer-Encoding: base64`);
      mimeMessage.push(``);
      mimeMessage.push(attachment.data);
      mimeMessage.push(``);
    });

    mimeMessage.push(`--${boundary}--`);

    const rawMessage = mimeMessage.join('\r\n');
    // Encode as UTF-8 bytes and then base64 (avoid Latin1 errors)
    const messageBytes = new TextEncoder().encode(rawMessage);
    let binaryMsg = '';
    const chunkSizeMsg = 8192;
    for (let i = 0; i < messageBytes.length; i += chunkSizeMsg) {
      const chunk = messageBytes.subarray(i, i + chunkSizeMsg);
      binaryMsg += String.fromCharCode(...chunk);
    }
    const encodedMessage = btoa(binaryMsg)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage
      }),
    });

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text();
      console.error('Gmail API error:', errorText);
      throw new Error(`Failed to send email via Gmail: ${errorText}`);
    }

    const result = await gmailResponse.json();
    console.log("Email sent successfully via Gmail:", result);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email sent successfully via Gmail",
      totalAmount,
      attachmentCount: validAttachments.length 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-gmail-expense function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
