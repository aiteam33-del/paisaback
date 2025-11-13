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
  };
  genai?: {
    ai_generated?: number;
  };
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

    const apiUser = Deno.env.get('SIGHTENGINE_API_USER');
    const apiKey = Deno.env.get('SIGHTENGINE_API_KEY');

    if (!apiUser || !apiKey) {
      console.error('SightEngine credentials not configured');
      // Return success but with null result to not block expense submission
      return new Response(
        JSON.stringify({ 
          success: true, 
          detectionResult: null,
          isAiGenerated: false,
          error: 'API not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      sightEngineUrl.searchParams.append('models', 'genai');
      sightEngineUrl.searchParams.append('api_user', apiUser);
      sightEngineUrl.searchParams.append('api_secret', apiKey);
      
      console.log('Calling SightEngine API with URL:', imageUrlForSightEngine);
      response = await fetch(sightEngineUrl.toString(), { method: 'GET' });
    } else {
      // Use file upload method
      const sightEngineUrl = new URL('https://api.sightengine.com/1.0/check.json');
      sightEngineUrl.searchParams.append('models', 'genai');
      sightEngineUrl.searchParams.append('api_user', apiUser);
      sightEngineUrl.searchParams.append('api_secret', apiKey);
      
      const formData = new FormData();
      // Determine file extension from MIME type
      const extension = mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : 'jpg';
      const blob = new Blob([imageData], { type: mimeType });
      formData.append('media', blob, `image.${extension}`);
      
      console.log('Calling SightEngine API with file upload');
      response = await fetch(sightEngineUrl.toString(), {
        method: 'POST',
        body: formData,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SightEngine API error:', response.status, errorText);
      
      // Don't block expense submission on API failure
      return new Response(
        JSON.stringify({ 
          success: true, 
          detectionResult: null,
          isAiGenerated: false,
          error: `API call failed: ${response.status} - ${errorText}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json() as SightEngineResponse;
    console.log('SightEngine API response:', JSON.stringify(data, null, 2));

    // Parse AI-generated score from various possible response structures
    // SightEngine genai model can return the score in different formats
    let aiGeneratedScore = 0;
    
    // Try different possible response structures
    if (data.type?.ai_generated !== undefined) {
      aiGeneratedScore = data.type.ai_generated;
    } else if (data.genai?.ai_generated !== undefined) {
      aiGeneratedScore = data.genai.ai_generated;
    } else if (data.ai_generated !== undefined) {
      aiGeneratedScore = data.ai_generated;
    } else if (typeof data.type === 'number') {
      // Sometimes the response might be just a number
      aiGeneratedScore = data.type;
    }
    
    // Ensure score is between 0 and 1
    aiGeneratedScore = Math.max(0, Math.min(1, Number(aiGeneratedScore) || 0));
    
    // Lower threshold to be more sensitive - flag if confidence > 30%
    // This ensures we catch more AI-generated images
    const threshold = 0.3;
    const isAiGenerated = aiGeneratedScore >= threshold;

    const detectionResult = {
      score: aiGeneratedScore,
      threshold,
      flagged: isAiGenerated,
      timestamp: new Date().toISOString(),
      requestId: data.request?.id,
      mediaId: data.media?.id,
      rawResponse: data, // Include full response for debugging
    };

    console.log(`AI Detection: score=${aiGeneratedScore}, threshold=${threshold}, flagged=${isAiGenerated}`);

    return new Response(
      JSON.stringify({
        success: true,
        detectionResult,
        isAiGenerated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-ai-image function:', error);
    
    // Don't block expense submission on errors
    return new Response(
      JSON.stringify({ 
        success: true, 
        detectionResult: null,
        isAiGenerated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
