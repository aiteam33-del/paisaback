import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  userId: string;
  recipientEmail: string;
  employeeName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, recipientEmail, employeeName }: EmailRequest = await req.json();

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

    // Generate breakdown text
    let breakdownText = 'Category-wise Expense Breakdown:\n\n';
    Object.entries(categoryBreakdown).forEach(([category, data]) => {
      breakdownText += `${category.charAt(0).toUpperCase() + category.slice(1)}: ₹${data.amount.toLocaleString('en-IN')} (${data.count} expense${data.count > 1 ? 's' : ''})\n`;
    });
    breakdownText += `\nTotal Amount: ₹${totalAmount.toLocaleString('en-IN')}`;

    // Collect all attachment URLs
    const attachmentUrls: string[] = [];
    expenses?.forEach((expense: any) => {
      if (expense.attachments && Array.isArray(expense.attachments)) {
        attachmentUrls.push(...expense.attachments);
      }
    });

    // Download attachments
    const attachments = await Promise.all(
      attachmentUrls.map(async (url, index) => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Convert to base64
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64 = btoa(binary);
          
          // Extract filename from URL
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0] || `receipt_${index + 1}.png`;
          
          // Determine content type
          const ext = filename.split('.').pop()?.toLowerCase() || 'png';
          const contentType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
          
          return {
            filename,
            content: base64,
            contentType
          };
        } catch (err) {
          console.error(`Failed to download attachment ${url}:`, err);
          return null;
        }
      })
    );

    const validAttachments = attachments.filter(a => a !== null);

    // Generate EML content
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const date = new Date().toUTCString();
    
    const emailBody = `Dear Finance Team,

Please find attached my recent reimbursement claims along with the supporting bills and screenshots.

${breakdownText}

Attachments: ${validAttachments.length} receipt${validAttachments.length !== 1 ? 's' : ''} attached

Kindly process the reimbursement to my account at your earliest convenience.

Regards,
${employeeName}`;

    let emlContent = `From: ${employeeName} <noreply@paisaback.com>
To: ${recipientEmail}
Subject: Expense Reimbursement Request
Date: ${date}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="${boundary}"

--${boundary}
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: quoted-printable

${emailBody}
`;

    // Add attachments
    validAttachments.forEach(attachment => {
      emlContent += `
--${boundary}
Content-Type: ${attachment.contentType}; name="${attachment.filename}"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="${attachment.filename}"

${attachment.content}
`;
    });

    emlContent += `\n--${boundary}--`;

    return new Response(emlContent, {
      status: 200,
      headers: {
        "Content-Type": "message/rfc822",
        "Content-Disposition": `attachment; filename="expense_reimbursement_${Date.now()}.eml"`,
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in generate-email-eml function:", error);
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
