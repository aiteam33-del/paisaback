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

    // Build prompt
    const systemPrompt = "You extract expense data from receipts. Return ONLY strict JSON with keys vendor (string), amount (number), date (YYYY-MM-DD), category (one of travel, food, lodging, office, other).";

    let extractedText = "";

    if (OPENAI_API_KEY) {
      // Use OpenAI Chat Completions with image input (base64 data URI)
      const payload = {
        model: "gpt-5-mini-2025-08-07",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract fields from this receipt." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          },
        ],
        max_completion_tokens: 300,
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
        throw new Error(`OpenAI error ${response.status}`);
      }
      const data = await response.json();
      extractedText = data.choices?.[0]?.message?.content || "";
    } else {
      // Fallback to Lovable AI Gateway (Gemini)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("AI key not configured");

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
              content: [
                { type: "text", text: "Extract fields from this receipt." },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error(`AI gateway error ${response.status}`);
      }
      const data = await response.json();
      extractedText = data.choices?.[0]?.message?.content || "";
    }

    // Parse JSON from extractedText
    let extractedData: any = {
      vendor: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      category: "other",
    };

    try {
      const match = extractedText.match(/\{[\s\S]*\}/);
      extractedData = JSON.parse(match ? match[0] : extractedText);
      // Basic normalization
      extractedData.vendor = String(extractedData.vendor || "").slice(0, 120);
      extractedData.amount = Number(extractedData.amount || 0);
      extractedData.date = String(extractedData.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const cat = String(extractedData.category || "other").toLowerCase();
      extractedData.category = ["travel", "food", "lodging", "office", "other"].includes(cat) ? cat : "other";
    } catch (e) {
      console.warn("Failed to parse JSON from model output, using defaults.");
    }

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