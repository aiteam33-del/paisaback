#!/bin/bash
# Script to set Supabase Edge Function secrets
# You'll need to provide your Supabase access token

echo "Setting SightEngine API secrets for Supabase Edge Functions..."
echo ""
echo "Please get your Supabase access token from:"
echo "https://supabase.com/dashboard/account/tokens"
echo ""
read -p "Enter your Supabase access token: " TOKEN

export SUPABASE_ACCESS_TOKEN="$TOKEN"

echo ""
echo "Setting SIGHTENGINE_API_USER..."
supabase secrets set SIGHTENGINE_API_USER=79827726 --project-ref dwxrdgimwuhlcjsdugzu

echo ""
echo "Setting SIGHTENGINE_API_KEY..."
supabase secrets set SIGHTENGINE_API_KEY=awPxC7FvAQvpDYAoaxBmQfXxZn992g87 --project-ref dwxrdgimwuhlcjsdugzu

echo ""
echo "Done! Secrets have been set."
