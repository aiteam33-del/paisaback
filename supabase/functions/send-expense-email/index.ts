import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpenseEmailRequest {
  userId: string;
  recipientEmail: string;
  employeeName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, recipientEmail, employeeName }: ExpenseEmailRequest = await req.json();

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // Generate breakdown HTML
    let breakdownHTML = '<h3 style="color: #333; margin-top: 20px;">Category-wise Expense Breakdown:</h3><ul style="list-style: none; padding: 0;">';
    Object.entries(categoryBreakdown).forEach(([category, data]) => {
      breakdownHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>${category.charAt(0).toUpperCase() + category.slice(1)}</strong>: ₹${data.amount.toLocaleString('en-IN')} (${data.count} expense${data.count > 1 ? 's' : ''})</li>`;
    });
    breakdownHTML += `</ul><p style="font-size: 18px; font-weight: bold; margin-top: 20px; padding: 15px; background: #f0fdf4; border-left: 4px solid #0B6E4F; border-radius: 4px;">Total Amount: ₹${totalAmount.toLocaleString('en-IN')}</p>`;

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
          
          // Convert to base64 in chunks to avoid stack overflow
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64 = btoa(binary);
          
          // Extract filename from URL or generate one
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0] || `receipt_${index + 1}.png`;
          
          return {
            filename,
            content: base64,
          };
        } catch (err) {
          console.error(`Failed to download attachment ${url}:`, err);
          return null;
        }
      })
    );

    const validAttachments = attachments.filter(a => a !== null);

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: linear-gradient(135deg, #0B6E4F 0%, #08563e 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PAISABACK</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Expense Reimbursement Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #0B6E4F; margin-top: 0;">Expense Reimbursement Request</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">Dear Finance Team,</p>
            
            <p style="margin-bottom: 20px;">
              Please find attached my recent reimbursement claims along with the supporting bills and screenshots.
            </p>
            
            ${breakdownHTML}
            
            <p style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <strong>📎 Attachments:</strong> ${validAttachments.length} receipt${validAttachments.length !== 1 ? 's' : ''} attached
            </p>
            
            <p style="margin-top: 30px;">
              Kindly process the reimbursement to my account at your earliest convenience.
            </p>
            
            <p style="margin-top: 20px;">
              Regards,<br>
              <strong>${employeeName}</strong>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              This is an automated email from PAISABACK Expense Management System
            </p>
          </div>
        </body>
      </html>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PAISABACK <send@satvario.com>',
        to: [recipientEmail],
        subject: 'Expense Reimbursement Request',
        html: emailHTML,
        attachments: validAttachments,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await resendResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email sent successfully",
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
    console.error("Error in send-expense-email function:", error);
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
