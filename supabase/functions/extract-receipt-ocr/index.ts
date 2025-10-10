import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import * as pdfjsLib from "npm:pdfjs-dist@4.3.136";

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

// PDF text extraction helpers
function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function extractPdfTextFromBase64(b64: string): Promise<string> {
  try {
    const data = base64ToUint8Array(b64);
    // pdfjs works directly with byte data
    const loadingTask = (pdfjsLib as any).getDocument({ data });
    const doc = await loadingTask.promise;
    const maxPages = Math.min(doc.numPages || 1, 3);
    let text = "";
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      const pageText = (tc.items || []).map((it: any) => String(it.str || "")).join(" ");
      text += pageText + "\n";
    }
    // Limit to avoid oversized prompts
    return text.slice(0, 20000);
  } catch (e) {
    console.warn("PDF extraction failed:", e);
    return "";
  }
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
    let pdfText: string | null = null;
    if (isPdf) {
      try {
        pdfText = await extractPdfTextFromBase64(base64Data);
      } catch (e) {
        console.warn("Failed to extract PDF text:", e);
      }
    }

    // Build prompt - updated to handle invoices, bills, and receipts
    const systemPrompt = "You are an expert OCR agent for receipts, invoices, bills, and payment screenshots. Extract information from the document and return STRICT JSON only with keys: merchant (string - company/vendor name), amount (number - final total amount to be paid), date (YYYY-MM-DD - invoice/transaction date), transaction_id (string - invoice number, order number, or transaction ID), category (one of travel, food, lodging, office, other). For invoices, use the Grand Total or final amount. Do not include any extra text, only valid JSON.";

    let extractedText = "";

    async function askOpenAI(): Promise<string> {
      const payload = {
        model: "gpt-5-mini-2025-08-07",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: (isPdf && pdfText)
              ? [
                  { type: "text", text: "Extract fields from this invoice text. Focus on the final total amount to be paid." },
                  { type: "text", text: pdfText }
                ]
              : [
                  { type: "text", text: "Extract fields from this receipt or bill. Focus on the final total amount to be paid." },
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

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: (isPdf && pdfText)
                ? [
                    { type: "text", text: "Extract fields from this invoice text. Focus on the final total amount to be paid. If it's an invoice, use the Grand Total value." },
                    { type: "text", text: pdfText }
                  ]
                : [
                    { type: "text", text: "Extract fields from this receipt or bill. Focus on the final total amount to be paid." },
                    { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
                  ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error(`lovable_${response.status}`);
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }

    try {
      if (OPENAI_API_KEY) {
        try {
          extractedText = await askOpenAI();
        } catch (err) {
          console.error("OpenAI failed, falling back to Lovable AI", err);
          extractedText = await askLovable();
        }
      } else {
        extractedText = await askLovable();
      }
    } catch (finalErr) {
      console.error("Both providers failed", finalErr);
      throw finalErr;
    }

    // Parse JSON from extractedText
    let extractedData: any = {
      merchant: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      transaction_id: "",
      category: "other",
    };

    try {
      const match = extractedText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : extractedText);
      extractedData.merchant = String(parsed.merchant || parsed.vendor || parsed.company || "").slice(0, 120);
      extractedData.amount = Number(parsed.amount || parsed.total || parsed.grand_total || 0);
      extractedData.date = String(parsed.date || parsed.invoice_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const cat = String(parsed.category || "other").toLowerCase();
      extractedData.category = ["travel", "food", "lodging", "office", "other"].includes(cat) ? cat : "other";
      extractedData.transaction_id = String(parsed.transaction_id || parsed.txn_id || parsed.transactionId || parsed.invoice_number || parsed.order_number || "").slice(0, 120);
      
      console.log("Parsed OCR data:", extractedData);
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