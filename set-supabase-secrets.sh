#!/bin/bash
# Script to set Supabase Edge Function secrets
# This will work with Lovable-hosted projects

PROJECT_REF="dwxrdgimwuhlcjsdugzu"

echo "=========================================="
echo "Setting Supabase Edge Function Secrets"
echo "=========================================="
echo ""
echo "Project: $PROJECT_REF"
echo ""
echo "Secrets to set:"
echo "  SIGHTENGINE_API_USER=79827726"
echo "  SIGHTENGINE_API_KEY=awPxC7FvAQvpDYAoaxBmQfXxZn992g87"
echo ""
echo "To use this script:"
echo "1. Get your Supabase access token from:"
echo "   https://supabase.com/dashboard/account/tokens"
echo ""
echo "2. Run:"
echo "   export SUPABASE_ACCESS_TOKEN='your_token_here'"
echo "   ./set-supabase-secrets.sh"
echo ""
echo "Or set secrets directly via Supabase Dashboard:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo ""

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "ERROR: SUPABASE_ACCESS_TOKEN not set!"
    echo "Please set it first: export SUPABASE_ACCESS_TOKEN='your_token'"
    exit 1
fi

echo "Setting SIGHTENGINE_API_USER..."
supabase secrets set SIGHTENGINE_API_USER=79827726 --project-ref $PROJECT_REF

echo ""
echo "Setting SIGHTENGINE_API_KEY..."
supabase secrets set SIGHTENGINE_API_KEY=awPxC7FvAQvpDYAoaxBmQfXxZn992g87 --project-ref $PROJECT_REF

echo ""
echo "✅ Done! Secrets have been set."
echo ""
echo "The detect-ai-image function should now work correctly."
