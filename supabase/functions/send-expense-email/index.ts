import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { superiorEmail, expenses, employeeName, employeeEmail } = await req.json();

    if (!superiorEmail || !expenses || !employeeName) {
      throw new Error("Missing required fields");
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured. Please add it in your project settings.");
    }

    // Calculate total
    const total = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || 0), 0);

    // Generate expense list HTML
    const expenseRows = expenses.map((exp: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${exp.date || 'N/A'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${exp.vendor || 'N/A'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${exp.category || 'N/A'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">₹${parseFloat(exp.amount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0B6E4F 0%, #08563e 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PAISABACK</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Expense Reimbursement Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Dear Superior,</p>
            
            <p style="margin-bottom: 20px;">
              <strong>${employeeName}</strong> (${employeeEmail}) has submitted the following expenses for reimbursement:
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Date</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Vendor</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Category</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${expenseRows}
              </tbody>
              <tfoot>
                <tr style="background: #f9fafb; font-weight: bold;">
                  <td colspan="3" style="padding: 12px; text-align: right;">Total:</td>
                  <td style="padding: 12px;">₹${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            <p style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <strong>Note:</strong> All receipts are attached to this email for your review.
            </p>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              This is an automated email from PAISABACK. Please review and approve the expenses at your earliest convenience.
            </p>
          </div>
        </body>
      </html>
    `;

    // Use Resend to send email
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PAISABACK <onboarding@resend.dev>',
        to: [superiorEmail],
        subject: `Expense Reimbursement Request from ${employeeName} - ₹${total.toFixed(2)}`,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await resendResponse.json();
    console.log('Email sent successfully:', result);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-expense-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});