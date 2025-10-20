#!/bin/bash

# Deploy Edge Functions to Coolify Supabase
# This script copies Edge Function files to the Supabase edge container
# Can be run manually or as a Coolify post-deploy hook

set -e

echo "🚀 Deploying Edge Functions to Coolify Supabase..."
echo "=================================================="
echo ""

# Get the edge container name/ID
# Coolify typically names containers with pattern: supabase-edge-functions-*
EDGE_CONTAINER=$(docker ps --filter "name=supabase-edge-functions" --quiet | head -1)

if [ -z "$EDGE_CONTAINER" ]; then
    echo "❌ Error: Could not find Supabase edge functions container"
    echo "Make sure Supabase is running in Coolify"
    exit 1
fi

echo "✅ Found edge container: $EDGE_CONTAINER"
echo ""

# Define source and destination paths
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/src/supabase/functions/server"
DEST_DIR="/home/deno/functions/server"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

echo "📁 Source directory: $SOURCE_DIR"
echo "📁 Destination: $DEST_DIR (inside container)"
echo ""

# Create destination directory in container
echo "📂 Creating destination directory..."
docker exec $EDGE_CONTAINER mkdir -p $DEST_DIR

# Copy Edge Function files
echo "📤 Copying Edge Function files..."

# Copy all .ts and .tsx files
for file in "$SOURCE_DIR"/*.ts "$SOURCE_DIR"/*.tsx; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "  • Copying $filename..."
        docker cp "$file" "$EDGE_CONTAINER:$DEST_DIR/"
    fi
done

echo ""

# Verify files
echo "✅ Verifying deployment..."
echo "Files in container:"
docker exec $EDGE_CONTAINER ls -lh $DEST_DIR/

echo ""

# Restart the edge container to reload functions
echo "🔄 Restarting edge functions container..."
docker restart $EDGE_CONTAINER

# Wait for container to be ready
echo "⏳ Waiting for container to restart..."
sleep 5

# Check if container is running
if docker exec $EDGE_CONTAINER echo "OK" &>/dev/null; then
    echo "✅ Container is running"
else
    echo "⚠️  Container may still be starting, please wait a moment..."
fi

echo ""
echo "✅ Edge Functions deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Verify environment variables are set in Coolify:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - SUPABASE_ANON_KEY"
echo "   - STRIPE_SECRET_KEY"
echo "   - FRONTEND_URL"
echo ""
echo "2. Test the deployment by signing up in your app"
echo ""
