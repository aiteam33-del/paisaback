# Supabase Edge Function Secrets

This file documents the required secrets for Supabase Edge Functions.

## Required Secrets for detect-ai-image Function

These secrets must be set in Supabase Dashboard under Project Settings > Edge Functions > Secrets:

1. **SIGHTENGINE_API_USER**: `79827726`
2. **SIGHTENGINE_API_KEY**: `awPxC7FvAQvpDYAoaxBmQfXxZn992g87`

## How to Set Secrets

### Via Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/dwxrdgimwuhlcjsdugzu/settings/functions
2. Scroll to "Edge Function Secrets"
3. Add:
   - Name: `SIGHTENGINE_API_USER`, Value: `79827726`
   - Name: `SIGHTENGINE_API_KEY`, Value: `awPxC7FvAQvpDYAoaxBmQfXxZn992g87`

### Via Supabase CLI:
```bash
export SUPABASE_ACCESS_TOKEN="your_token_here"
supabase secrets set SIGHTENGINE_API_USER=79827726 --project-ref dwxrdgimwuhlcjsdugzu
supabase secrets set SIGHTENGINE_API_KEY=awPxC7FvAQvpDYAoaxBmQfXxZn992g87 --project-ref dwxrdgimwuhlcjsdugzu
```

## Note
These secrets are used by the `detect-ai-image` Edge Function to authenticate with SightEngine API for AI-generated image detection.

