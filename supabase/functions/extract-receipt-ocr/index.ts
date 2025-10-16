import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extToMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

async function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  // btoa is available in Deno
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageUrl, bucket, path } = body as { imageUrl?: string; bucket?: string; path?: string };

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    // Resolve image bytes: support either public URL OR private storage bucket/path
    let base64Data = "";
    let mimeType = "image/png";

    if (bucket && path) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error || !data) throw new Error(`Failed to download image from storage: ${error?.message}`);
      const buf = await data.arrayBuffer();
      base64Data = await arrayBufferToBase64(buf);
      mimeType = data.type || extToMime(path);
    } else if (imageUrl) {
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
      const buf = await resp.arrayBuffer();
      base64Data = await arrayBufferToBase64(buf);
      mimeType = resp.headers.get("content-type") || mimeType;
    } else {
      throw new Error("Provide either {bucket, path} or imageUrl");
    }

    const isPdf = mimeType === "application/pdf";
    console.log(`Processing ${isPdf ? 'PDF' : 'image'} document, mime: ${mimeType}`);

    // Retry helper with exponential backoff
    const retryWithBackoff = async <T,>(
      fn: () => Promise<T>,
      maxRetries: number = 2,
      delay: number = 1000
    ): Promise<T> => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          const backoffDelay = delay * Math.pow(2, i);
          console.log(`Retry attempt ${i + 1}/${maxRetries} after ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
      throw new Error('Max retries exceeded');
    };

    let extractedText = "";

    async function askOpenAI(): Promise<string> {
      const systemPrompt = "You are an expert OCR agent for receipts, invoices, bills, and payment screenshots. Extract information from the document and return STRICT JSON only with keys: merchant (string - company/vendor name), amount (number - final total amount to be paid), date (YYYY-MM-DD - invoice/transaction date), transaction_id (string - invoice number, order number, or transaction ID), category (one of travel, food, lodging, office, other), payment_method (string - detect payment method: if you see GPay, Google Pay, Paytm, PhonePe, BHIM, or any UPI app name, return 'upi'. For credit cards return 'credit_card', for debit cards return 'debit_card', for cash return 'cash'. Return empty string if unknown). For invoices, use the Grand Total or final amount. Do not include any extra text, only valid JSON.";
      
      const payload = {
        model: "gpt-5-mini-2025-08-07",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract fields from this ${isPdf ? 'invoice PDF' : 'receipt or bill'}. Focus on the final total amount to be paid.` },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          },
        ],
        max_completion_tokens: 500,
      } as any;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("OpenAI error:", response.status, t);
        throw new Error(`openai_${response.status}`);
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }

    async function askLovable(): Promise<string> {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("lovable_key_missing");

      const body: any = {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `You are an expert at reading Indian receipts, invoices, bills, and UPI payment screenshots. Extract structured data using the provided tool strictly.`,
              },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt_fields",
              description: "Extract key fields from a receipt/invoice/screenshot",
              parameters: {
                type: "object",
                properties: {
                  merchant: { type: "string", description: "Exact vendor/company or payee name" },
                  amount: { type: "number", description: "Final total amount paid/charge (no commas)" },
                  date: { type: "string", description: "Date in YYYY-MM-DD" },
                  transaction_id: { type: "string", description: "Invoice/order/UPI transaction id" },
                  category: {
                    type: "string",
                    enum: ["travel", "food", "lodging", "office", "other"],
                  },
                  payment_method: {
                    type: "string",
                    enum: ["upi", "credit_card", "debit_card", "cash", ""],
                  },
                },
                required: ["amount", "date"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt_fields" } },
      };

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error(`lovable_${response.status}`);
      }
      const data = await response.json();

      const msg = data.choices?.[0]?.message;
      const toolArgs = msg?.tool_calls?.[0]?.function?.arguments;
      if (toolArgs) {
        console.log("Lovable tool args:", toolArgs);
        return typeof toolArgs === "string" ? toolArgs : JSON.stringify(toolArgs);
      }

      const content = msg?.content || "";
      console.log("Lovable AI content fallback length:", content.length);
      return content;
    }

    try {
      const hasJson = (s: string) => typeof s === "string" && s.includes("{") && s.includes("}");

      console.log("Using Lovable AI for OCR with retry logic (preferred)");
      extractedText = await retryWithBackoff(() => askLovable(), 3, 1000);

      if (!hasJson(extractedText)) {
        console.warn("Lovable returned empty/invalid JSON, attempting OpenAI fallback");
        if (OPENAI_API_KEY) {
          extractedText = await retryWithBackoff(() => askOpenAI(), 3, 1000);
        }
      }

      if (!hasJson(extractedText)) {
        throw new Error("OCR model returned no JSON after all attempts");
      }
    } catch (finalErr) {
      console.error("All OCR providers failed after retries", finalErr);
      throw finalErr;
    }

    // Parse JSON from extractedText
    let extractedData: any = {
      merchant: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      transaction_id: "",
      category: "other",
      payment_method: "",
    };

    try {
      const match = extractedText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : extractedText);
      extractedData.merchant = String(parsed.merchant || parsed.vendor || parsed.company || "").slice(0, 120);
      extractedData.amount = Number(parsed.amount || parsed.total || parsed.grand_total || 0);
      extractedData.date = String(parsed.date || parsed.invoice_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const cat = String(parsed.category || "office").toLowerCase();
      extractedData.category = ["travel", "food", "lodging", "office", "other"].includes(cat) ? cat : "office";
      extractedData.transaction_id = String(parsed.transaction_id || parsed.txn_id || parsed.transactionId || parsed.invoice_number || parsed.order_number || "").slice(0, 120);
      
      // Extract payment method
      let paymentMethod = String(parsed.payment_method || "").toLowerCase();
      // Additional detection from merchant name or transaction_id for UPI apps
      const textToCheck = `${extractedData.merchant} ${extractedData.transaction_id}`.toLowerCase();
      if (!paymentMethod || paymentMethod === "unknown") {
        if (textToCheck.includes("gpay") || textToCheck.includes("google pay") || 
            textToCheck.includes("paytm") || textToCheck.includes("phonepe") || 
            textToCheck.includes("bhim") || textToCheck.includes("upi")) {
          paymentMethod = "upi";
        }
      }
      extractedData.payment_method = paymentMethod;
      
      console.log("Successfully parsed OCR data:", JSON.stringify(extractedData));
    } catch (e) {
      console.warn("Failed to parse JSON from model output, using defaults.", e);
      console.log("Raw extracted text:", extractedText);
    }

    // Backwards compatibility for UI expecting vendor
    extractedData.vendor = extractedData.merchant;

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("extract-receipt-ocr error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});