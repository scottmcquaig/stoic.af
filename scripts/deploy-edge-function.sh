#!/bin/bash

# Edge Function Deployment Script for Stoic AF
# This script ensures all files are in place and deploys the Edge Function

echo "==================================="
echo "Stoic AF Edge Function Deployment"
echo "==================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the project directory
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${YELLOW}📁 Project directory: $PROJECT_DIR${NC}"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Please install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "Please create .env.local with your Supabase credentials"
    echo "You can copy from .env.example: cp .env.example .env.local"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo -e "${GREEN}✅ Environment variables loaded${NC}"

# Step 1: Sync Edge Function files
echo ""
echo -e "${BLUE}📦 Step 1: Syncing Edge Function files...${NC}"

# Create deployment directory if it doesn't exist
mkdir -p supabase/functions/server

# Copy the main function file
if [ -f "src/supabase/functions/server/index.tsx" ]; then
    cp src/supabase/functions/server/index.tsx supabase/functions/server/index.ts
    echo -e "${GREEN}✅ Copied index.tsx to deployment directory${NC}"
else
    echo -e "${RED}❌ Source index.tsx not found${NC}"
    exit 1
fi

# Copy the KV store file
if [ -f "src/supabase/functions/server/kv_store.tsx" ]; then
    cp src/supabase/functions/server/kv_store.tsx supabase/functions/server/kv_store.tsx
    echo -e "${GREEN}✅ Copied kv_store.tsx to deployment directory${NC}"
else
    echo -e "${RED}❌ Source kv_store.tsx not found${NC}"
    exit 1
fi

# Step 2: Verify files
echo ""
echo -e "${BLUE}📋 Step 2: Verifying deployment files...${NC}"

if [ ! -f "supabase/functions/server/index.ts" ]; then
    echo -e "${RED}❌ index.ts missing in deployment directory${NC}"
    exit 1
fi

if [ ! -f "supabase/functions/server/kv_store.tsx" ]; then
    echo -e "${RED}❌ kv_store.tsx missing in deployment directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required files are in place${NC}"

# Step 3: Check Supabase project
echo ""
echo -e "${BLUE}🔗 Step 3: Checking Supabase project...${NC}"

# Check if we're linked to a project
LINKED_PROJECT=$(supabase projects list 2>/dev/null | grep -E "vuqwcuhudysudgjbeota|Active" | head -1)

if [ -z "$LINKED_PROJECT" ]; then
    echo -e "${YELLOW}⚠️ Not linked to Supabase project${NC}"
    echo "Attempting to link..."

    # Try to link using the project ref from the URL if available
    if [[ "$SUPABASE_URL" =~ vuqwcuhudysudgjbeota ]]; then
        supabase link --project-ref vuqwcuhudysudgjbeota
    else
        echo -e "${YELLOW}Please enter your Supabase project ref:${NC}"
        read -p "Project ref: " PROJECT_REF
        supabase link --project-ref "$PROJECT_REF"
    fi

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to link to Supabase project${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Linked to Supabase project${NC}"

# Step 4: Deploy the function
echo ""
echo -e "${BLUE}🚀 Step 4: Deploying Edge Function...${NC}"

# Deploy with environment variables
supabase functions deploy server --no-verify-jwt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge Function deployed successfully!${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check the error messages above for details"
    exit 1
fi

# Step 5: Test the deployment
echo ""
echo -e "${BLUE}🧪 Step 5: Testing deployment...${NC}"

HEALTH_URL="${SUPABASE_URL}/functions/v1/make-server-6d6f37b2/health"
echo -e "${YELLOW}Testing health endpoint: $HEALTH_URL${NC}"

# Test with curl
HEALTH_RESPONSE=$(curl -s "$HEALTH_URL" 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$HEALTH_RESPONSE" ]; then
    # Check if response contains "healthy"
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
        echo -e "${GREEN}✅ Health check passed - Edge Function is working!${NC}"
    else
        echo -e "${YELLOW}⚠️ Edge Function is responding but not fully healthy${NC}"
        echo "Response: $HEALTH_RESPONSE"
        echo ""
        echo "This might mean:"
        echo "1. The KV store table is not created yet"
        echo "2. Environment variables are not set correctly"
        echo ""
        echo "Run: ./scripts/setup-database.sh to create the database tables"
    fi
else
    echo -e "${RED}❌ Could not reach health endpoint${NC}"
    echo "Please check:"
    echo "1. The function is deployed"
    echo "2. The SUPABASE_URL is correct"
    echo "3. Your internet connection"
fi

echo ""
echo -e "${GREEN}==================================="
echo "✅ Deployment complete!"
echo "===================================${NC}"
echo ""
echo "Next steps:"
echo "1. Check logs: supabase functions logs server"
echo "2. Test health: curl ${HEALTH_URL}"
echo "3. Try the signup flow in your application"
echo ""