import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionRequest {
  imageUrl?: string;
  bucket?: string;
  path?: string;
}

interface SightEngineResponse {
  status: string;
  type?: {
    ai_generated?: number;
    manipulation?: number;
  };
  genai?: {
    ai_generated?: number;
  };
  manipulation?: number;
  ai_generated?: number;
  // Alternative response structures from SightEngine
  [key: string]: any;
}

async function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as DetectionRequest;
    const { imageUrl, bucket, path } = body;

    if (!imageUrl && (!bucket || !path)) {
      return new Response(
        JSON.stringify({ error: 'Either imageUrl or (bucket and path) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read credentials from Lovable's secure environment
    // Note: Lovable stores these as SIGHTENGINE_API_USER and SIGHTENGINE_API_KEY
    // These MUST be synced to Supabase Edge Function secrets for the function to work
    const apiUser = Deno.env.get('SIGHTENGINE_API_USER');
    const apiSecret = Deno.env.get('SIGHTENGINE_API_KEY') || Deno.env.get('SIGHTENGINE_API_SECRET');

    // Debug logging to help identify if secrets are available
    const hasUser = !!apiUser;
    const hasSecret = !!apiSecret;
    console.log(`[detect-ai-image] SightEngine credentials check: USER=${hasUser}, SECRET=${hasSecret}`);
    
    if (!hasUser || !hasSecret) {
      const availableEnvKeys = Object.keys(Deno.env.toObject()).filter(k => 
        k.includes('SIGHT') || k.includes('API')
      );
      console.error('[detect-ai-image] SightEngine credentials not configured');
      console.error('[detect-ai-image] Available env vars with SIGHT/API:', availableEnvKeys);
      
      // Return success but with null result to not block expense submission
      return new Response(
        JSON.stringify({ 
          success: true, 
          detectionResult: null,
          isAiGenerated: false,
          aiChecked: false,
          aiFlagged: false,
          error: 'Lovable secret access blocked — cannot read SIGHTENGINE_API_USER/KEY from environment. Please ensure Lovable secrets are synced to Supabase Edge Function secrets.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[detect-ai-image] SightEngine credentials found, proceeding with API call');

    let imageData: ArrayBuffer;
    let imageUrlForSightEngine: string | null = null;
    let mimeType = 'image/jpeg'; // Default MIME type

    // If bucket and path are provided, download from storage
    if (bucket && path) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error || !data) {
        console.error('Failed to download image from storage:', error);
        throw new Error(`Failed to download image from storage: ${error?.message}`);
      }
      imageData = await data.arrayBuffer();
      mimeType = data.type || mimeType;
      console.log('Downloaded image from storage bucket:', bucket, 'path:', path, 'mimeType:', mimeType);
    } else if (imageUrl) {
      // Try to fetch the image URL
      const resp = await fetch(imageUrl);
      if (!resp.ok) {
        console.error('Failed to fetch image URL:', resp.status, resp.statusText);
        // If URL fetch fails, try using the URL directly with SightEngine
        imageUrlForSightEngine = imageUrl;
      } else {
        imageData = await resp.arrayBuffer();
        mimeType = resp.headers.get('content-type') || mimeType;
        console.log('Fetched image from URL:', imageUrl, 'mimeType:', mimeType);
      }
    } else {
      throw new Error('No valid image source provided');
    }

    // Call SightEngine API
    let response: Response;

    if (imageUrlForSightEngine) {
      // Use URL method if we have a public URL
      const sightEngineUrl = new URL('https://api.sightengine.com/1.0/check.json');
      sightEngineUrl.searchParams.append('url', imageUrlForSightEngine);
      sightEngineUrl.searchParams.append('models', 'manipulation,genai');
      sightEngineUrl.searchParams.append('api_user', apiUser);
      sightEngineUrl.searchParams.append('api_secret', apiSecret);
      
      console.log('Calling SightEngine API with URL (models: manipulation,genai)');
      response = await fetch(sightEngineUrl.toString(), { method: 'GET' });
    } else {
      // Use file upload method
      const sightEngineUrl = new URL('https://api.sightengine.com/1.0/check.json');
      sightEngineUrl.searchParams.append('models', 'manipulation,genai');
      sightEngineUrl.searchParams.append('api_user', apiUser);
      sightEngineUrl.searchParams.append('api_secret', apiSecret);
      
      const formData = new FormData();
      // Determine file extension from MIME type
      const extension = mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : 'jpg';
      const blob = new Blob([imageData], { type: mimeType });
      formData.append('media', blob, `image.${extension}`);
      
      console.log('Calling SightEngine API with file upload (models: manipulation,genai)');
      response = await fetch(sightEngineUrl.toString(), {
        method: 'POST',
        body: formData,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SightEngine API error:', response.status, errorText);
      
      // Don't block expense submission on API failure
      // Log error server-side but don't expose details
      console.error('SightEngine API call failed:', response.status);
      return new Response(
        JSON.stringify({ 
          success: true, 
          detectionResult: null,
          aiChecked: false,
          aiFlagged: false,
          aiConfidence: null,
          aiDetails: { error: 'API call failed' },
          isAiGenerated: false,
          error: 'API call failed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json() as SightEngineResponse;
    // Do NOT log the full response to avoid exposing sensitive data
    console.log('SightEngine API response received');

    // Parse AI-generated and manipulation scores from SightEngine response
    // Check multiple possible response structures
    let aiGeneratedScore = 0;
    let manipulationScore = 0;
    
    // Try different possible response structures for AI-generated
    if (data.type?.ai_generated !== undefined) {
      aiGeneratedScore = data.type.ai_generated;
    } else if (data.genai?.ai_generated !== undefined) {
      aiGeneratedScore = data.genai.ai_generated;
    } else if (data.ai_generated !== undefined) {
      aiGeneratedScore = data.ai_generated;
    }
    
    // Try different possible response structures for manipulation
    if (data.type?.manipulation !== undefined) {
      manipulationScore = data.type.manipulation;
    } else if (data.manipulation !== undefined) {
      manipulationScore = data.manipulation;
    }
    
    // Ensure scores are between 0 and 1
    aiGeneratedScore = Math.max(0, Math.min(1, Number(aiGeneratedScore) || 0));
    manipulationScore = Math.max(0, Math.min(1, Number(manipulationScore) || 0));
    
    // Use 70% threshold as specified in requirements
    const threshold = 0.70;
    const isAiFlagged = aiGeneratedScore >= threshold || manipulationScore >= threshold;
    
    // Use the higher of the two scores as the confidence
    const confidence = Math.max(aiGeneratedScore, manipulationScore);

    const detectionResult = {
      aiGeneratedScore,
      manipulationScore,
      confidence,
      threshold,
      flagged: isAiFlagged,
      timestamp: new Date().toISOString(),
      requestId: data.request?.id,
      mediaId: data.media?.id,
      // Store raw response for audit (redacted in logs)
      rawResponse: data,
    };

    // Log only scores, not full response
    console.log(`AI Detection: ai_generated=${aiGeneratedScore.toFixed(2)}, manipulation=${manipulationScore.toFixed(2)}, confidence=${confidence.toFixed(2)}, threshold=${threshold}, flagged=${isAiFlagged}`);

    return new Response(
      JSON.stringify({
        success: true,
        detectionResult,
        aiChecked: true,
        aiFlagged: isAiFlagged,
        aiConfidence: confidence,
        aiDetails: {
          aiGenerated: aiGeneratedScore,
          manipulation: manipulationScore,
          reason: `AI-generated: ${aiGeneratedScore.toFixed(2)}, manipulation: ${manipulationScore.toFixed(2)}`
        },
        // Keep backward compatibility
        isAiGenerated: isAiFlagged,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log error server-side for monitoring
    console.error('Error in detect-ai-image function:', error instanceof Error ? error.message : 'Unknown error');
    
    // Don't block expense submission on errors
    return new Response(
      JSON.stringify({ 
        success: true, 
        detectionResult: null,
        aiChecked: false,
        aiFlagged: false,
        aiConfidence: null,
        aiDetails: { error: error instanceof Error ? error.message : 'Unknown error' },
        isAiGenerated: false,
        error: 'Detection failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
