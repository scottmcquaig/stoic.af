#!/bin/bash

# Supabase Edge Function Deployment Script
# This script helps deploy the Edge Function to Supabase

set -e

echo "🚀 Supabase Edge Function Deployment"
echo "===================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "📦 Installing Supabase CLI..."
    npm install -g supabase
    echo "✅ Supabase CLI installed"
fi

# Check if logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo "🔑 Please login..."
    supabase login
fi

# Link project
echo "🔗 Linking Supabase project..."
supabase link --project-ref vuqwcuhudysudgjbeota

# Deploy function
echo "📤 Deploying Edge Function..."
supabase functions deploy server

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables:"
echo "   supabase secrets set SUPABASE_URL=https://vuqwcuhudysudgjbeota.supabase.co --project-ref vuqwcuhudysudgjbeota"
echo "   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key --project-ref vuqwcuhudysudgjbeota"
echo "   supabase secrets set SUPABASE_ANON_KEY=your_key --project-ref vuqwcuhudysudgjbeota"
echo "   supabase secrets set STRIPE_SECRET_KEY=your_key --project-ref vuqwcuhudysudgjbeota"
echo "   supabase secrets set STRIPE_PUBLISHABLE_KEY=your_key --project-ref vuqwcuhudysudgjbeota"
echo ""
echo "2. Test the deployment:"
echo "   curl https://vuqwcuhudysudgjbeota.supabase.co/functions/v1/make-server-6d6f37b2/health"
echo ""
