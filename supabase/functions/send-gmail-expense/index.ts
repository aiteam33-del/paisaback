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
      breakdownText += `• ${category.charAt(0).toUpperCase() + category.slice(1)}: ₹${data.amount.toLocaleString('en-IN')} (${data.count} expense${data.count > 1 ? 's' : ''})\n`;
    });
    breakdownText += `\nTotal Amount: ₹${totalAmount.toLocaleString('en-IN')}`;

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

    // Create email body
    const emailBody = `Dear Finance Team,

Please find my reimbursement request with supporting receipts attached.
${breakdownText}

${validAttachments.length} receipt${validAttachments.length !== 1 ? 's' : ''} attached for your review.

Kindly process the reimbursement to my account at your earliest convenience.

Regards,
${profile.full_name}

---
This is an automated email from PAISABACK Expense Management System`;

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
      `Content-Type: text/plain; charset=UTF-8`,
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
