import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionRequest {
  imageUrl: string;
}

interface SightEngineResponse {
  status: string;
  error?: {
    type: string;
    code: number;
    message: string;
  };
  type?: {
    ai_generated: number;
  };
  media?: {
    id: string;
    uri: string;
  };
  request?: {
    id: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json() as DetectionRequest;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
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

    // Call SightEngine API
    const sightEngineUrl = new URL('https://api.sightengine.com/1.0/check.json');
    sightEngineUrl.searchParams.append('url', imageUrl);
    sightEngineUrl.searchParams.append('models', 'genai');
    sightEngineUrl.searchParams.append('api_user', apiUser);
    sightEngineUrl.searchParams.append('api_secret', apiKey);

    console.log('Calling SightEngine API for image:', imageUrl);

    const response = await fetch(sightEngineUrl.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SightEngine API error:', response.status, errorText);
      
      // Don't block expense submission on API failure
      return new Response(
        JSON.stringify({ 
          success: true, 
          detectionResult: null,
          isAiGenerated: false,
          error: 'API call failed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseText = await response.text();
    console.log('SightEngine raw response:', responseText);

    let data: SightEngineResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse SightEngine response:', parseError);
      return new Response(
        JSON.stringify({
          success: true,
          detectionResult: null,
          isAiGenerated: false,
          error: 'Failed to parse API response'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SightEngine parsed response:', JSON.stringify(data, null, 2));

    // Check if SightEngine returned an error
    if (data.status === 'failure' || data.error) {
      console.error('SightEngine returned error:', data.error?.message || 'Unknown error');
      return new Response(
        JSON.stringify({
          success: true,
          detectionResult: {
            error: data.error?.message || 'SightEngine API error',
            errorCode: data.error?.code,
            errorType: data.error?.type
          },
          isAiGenerated: false,
          error: data.error?.message || 'SightEngine API error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiGeneratedScore = data.type?.ai_generated ?? 0;
    const threshold = 0.3; // Consider as AI-generated if confidence > 30% (more sensitive)
    const isAiGenerated = aiGeneratedScore >= threshold;

    const detectionResult = {
      score: aiGeneratedScore,
      threshold,
      flagged: isAiGenerated,
      timestamp: new Date().toISOString(),
      requestId: data.request?.id,
      mediaId: data.media?.id,
      rawResponse: data,
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
