#!/bin/bash

# Database Setup Script for Stoic AF
# This script sets up all required database tables

echo "==================================="
echo "Stoic AF Database Setup"
echo "==================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Please install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Get the project directory
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${YELLOW}📁 Project directory: $PROJECT_DIR${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "Please create .env.local with your Supabase credentials"
    echo "You can copy from .env.example: cp .env.example .env.local"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo "Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo -e "${YELLOW}🔗 Supabase URL: ${SUPABASE_URL:0:30}...${NC}"

# Function to run SQL file
run_sql() {
    local sql_file=$1
    local description=$2

    echo -e "${YELLOW}🔧 $description${NC}"

    if [ ! -f "$sql_file" ]; then
        echo -e "${RED}❌ SQL file not found: $sql_file${NC}"
        return 1
    fi

    # Use psql if available, otherwise use Supabase Dashboard
    if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" < "$sql_file"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ $description completed${NC}"
        else
            echo -e "${RED}❌ $description failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}📋 Please run the following SQL in Supabase Dashboard:${NC}"
        echo -e "${YELLOW}   File: $sql_file${NC}"
        echo ""
        echo "1. Go to: $SUPABASE_URL"
        echo "2. Navigate to SQL Editor"
        echo "3. Copy and paste the contents of $sql_file"
        echo "4. Click 'Run'"
        echo ""
        read -p "Press ENTER after running the SQL in Supabase Dashboard..."
    fi
}

echo ""
echo -e "${YELLOW}🗄️ Setting up database tables...${NC}"
echo ""

# Create users table
run_sql "database/create_users_table.sql" "Creating users table"

# Create KV store table
run_sql "database/create_kv_store_table.sql" "Creating KV store table"

echo ""
echo -e "${GREEN}==================================="
echo "✅ Database setup complete!"
echo "===================================${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy the Edge Functions: npm run deploy:functions"
echo "2. Test the health endpoint: curl ${SUPABASE_URL}/functions/v1/make-server-6d6f37b2/health"
echo "3. Try signing up on the frontend"
echo ""