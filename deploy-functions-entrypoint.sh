#!/bin/bash

# Edge Functions Deployment Script
# Runs as a Docker container that deploys functions to Supabase edge container
# Exits after successful deployment

set -e

echo "🚀 Starting Edge Functions Deployment..."
echo "========================================="
echo ""

# Configuration from environment
EDGE_PATTERN="${EDGE_CONTAINER_PATTERN:-supabase-edge-functions}"
SOURCE_DIR="${FUNCTION_SOURCE_DIR:-/app/functions}"
DEST_DIR="${FUNCTION_DEST_DIR:-/home/deno/functions/make-server-6d6f37b2}"

# Give Supabase containers time to start
echo "⏳ Waiting for Supabase services to start (30 seconds)..."
sleep 30

# Find the edge functions container
echo "🔍 Finding Supabase edge functions container..."
EDGE_CONTAINER=$(docker ps --filter "name=$EDGE_PATTERN" --quiet | head -1)

if [ -z "$EDGE_CONTAINER" ]; then
    echo "⚠️  Warning: Could not find Supabase edge functions container"
    echo "   Pattern: $EDGE_PATTERN"
    echo "   This may be OK if Supabase is still starting up"
    echo "   Available containers:"
    docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}"
    echo ""
    echo "✅ Deployment script completed (container not found - may retry on next deploy)"
    exit 0
fi

echo "✅ Found edge container: $EDGE_CONTAINER"
echo ""

# Check if source files exist
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

echo "📁 Source directory: $SOURCE_DIR"
echo "📁 Destination: $DEST_DIR"
echo ""

# Wait for container to be ready
echo "⏳ Waiting for edge container to be ready..."
RETRY_COUNT=0
MAX_RETRIES=10
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec $EDGE_CONTAINER echo "OK" &>/dev/null; then
        echo "✅ Edge container is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "   Retrying... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 3
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Edge container did not become ready"
    exit 1
fi

echo ""

# Create destination directory
echo "📂 Creating destination directory in edge container..."
docker exec $EDGE_CONTAINER mkdir -p "$DEST_DIR"

# Copy function files
echo "📤 Copying function files..."
FILE_COUNT=0

for file in "$SOURCE_DIR"/*.ts "$SOURCE_DIR"/*.tsx; do
    if [ -f "$file" ]; then
        FILENAME=$(basename "$file")
        echo "   • Copying $FILENAME..."
        docker cp "$file" "$EDGE_CONTAINER:$DEST_DIR/"
        FILE_COUNT=$((FILE_COUNT + 1))
    fi
done

if [ $FILE_COUNT -eq 0 ]; then
    echo "❌ Error: No function files found in $SOURCE_DIR"
    exit 1
fi

echo ""

# Verify files were copied
echo "✅ Verifying deployment..."
echo "   Files in edge container:"
docker exec $EDGE_CONTAINER ls -lh "$DEST_DIR/" | tail -n +2 | sed 's/^/     /'

echo ""

# Restart edge container to reload functions
echo "🔄 Restarting edge functions container..."
docker restart $EDGE_CONTAINER

# Wait for restart
echo "⏳ Waiting for edge container to restart (15 seconds)..."
sleep 15

# Verify container is running
if docker exec $EDGE_CONTAINER echo "OK" &>/dev/null; then
    echo "✅ Edge container restarted successfully"
else
    echo "⚠️  Warning: Edge container may still be starting"
fi

echo ""
echo "✅ Edge Functions deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Monitor the app container logs for errors"
echo "2. Try signing up in your application"
echo "3. If still getting 500 errors, check edge container logs:"
echo "   docker logs $EDGE_CONTAINER"
echo ""

# Exit successfully - the app container can now start
exit 0
