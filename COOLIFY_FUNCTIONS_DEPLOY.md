# Coolify Edge Functions Deployment Guide

This guide explains how to deploy Edge Functions to your Coolify-hosted Supabase instance automatically.

---

## Quick Start

### Manual Deployment

Run this from your local machine or server:

```bash
./deploy-functions.sh
```

This will:
1. Find your Supabase edge functions container
2. Copy all Edge Function files from `src/supabase/functions/server/`
3. Restart the container to load the functions
4. Verify the deployment

---

## Automatic Deployment (Post-Deploy Hook)

To automatically deploy functions every time you push to Git, set up a post-deploy hook in Coolify:

### Step 1: Configure in Coolify Dashboard

1. Go to **Applications** → Your App → **Settings**
2. Find **"Post Deployment Webhooks"** or **"Deploy Script"** section
3. Add a new webhook/script with this command:

```bash
cd /app && ./deploy-functions.sh
```

Or if using a custom deploy script:

```bash
#!/bin/bash
set -e

# Deploy main application
npm install
npm run build

# Deploy Edge Functions
cd /app
./deploy-functions.sh
```

### Step 2: Commit the deployment script to Git

The `deploy-functions.sh` is already in your repo and executable.

### Step 3: Test the deployment

1. Make a small change to your code (e.g., add a comment)
2. Push to main branch
3. Coolify will automatically:
   - Build your app
   - Run the post-deploy script
   - Deploy Edge Functions

---

## How It Works

The `deploy-functions.sh` script:

1. **Finds the Supabase edge container** - Looks for `supabase-edge-functions-*` container
2. **Creates the function directory** - Ensures `/home/deno/functions/server/` exists
3. **Copies function files** - Copies all `.ts` and `.tsx` files from `src/supabase/functions/server/`
4. **Restarts the container** - Forces Deno to reload the functions
5. **Verifies deployment** - Shows files that were copied

---

## File Structure

Your Edge Functions should be in:

```
src/supabase/functions/server/
├── index.tsx              # Main function handler
└── kv_store.tsx          # KV store operations
```

Both files are automatically deployed by the script.

---

## Troubleshooting

### "Could not find Supabase edge functions container"

**Cause:** The container name doesn't match the expected pattern

**Fix:**
1. In Coolify, go to your Supabase service
2. Find the exact container name
3. Edit `deploy-functions.sh` line with `EDGE_CONTAINER=` to use the correct name

### Functions still not working after deployment

**Checklist:**
1. [ ] Environment variables set in Coolify (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.)
2. [ ] Container restarted successfully
3. [ ] Files copied to `/home/deno/functions/server/`
4. [ ] Check Coolify logs for any errors

**Manual check in edge container:**
```bash
docker exec <container-id> ls -la /home/deno/functions/server/
```

### "Permission denied" error

**Cause:** Script not executable

**Fix:**
```bash
chmod +x ./deploy-functions.sh
```

---

## Manual Deployment (Without Script)

If the script doesn't work, you can deploy manually:

```bash
# 1. Find edge container
docker ps | grep edge

# 2. Create directory in container
docker exec <container-id> mkdir -p /home/deno/functions/server

# 3. Copy files
docker cp src/supabase/functions/server/index.tsx <container-id>:/home/deno/functions/server/
docker cp src/supabase/functions/server/kv_store.tsx <container-id>:/home/deno/functions/server/

# 4. Restart container
docker restart <container-id>

# 5. Verify
docker exec <container-id> ls -la /home/deno/functions/server/
```

---

## Verify Deployment

After deployment, test by:

1. **Check container has files:**
   ```bash
   docker exec <edge-container-id> ls -la /home/deno/functions/server/
   ```

2. **Check Edge Function logs:**
   In Coolify, view the edge container logs for any startup errors

3. **Test the API:**
   ```bash
   curl https://api.swgszn.cloud/functions/v1/make-server-6d6f37b2/health
   ```

4. **Test signup in your app:**
   Try creating a new account - should work without HTTP 500 errors

---

## Environment Variables Required

Make sure these are set in Coolify for your application:

- `SUPABASE_URL` - Internal Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `SUPABASE_ANON_KEY` - Anonymous key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `FRONTEND_URL` - Frontend URL for redirects

Edge Functions access these via `Deno.env.get('VARIABLE_NAME')`

---

## Next Steps

1. **Test deployment:** Run `./deploy-functions.sh` manually
2. **Verify it works:** Try signing up in your app
3. **Set up auto-deployment:** Add the script to post-deploy hook in Coolify
4. **Future deployments:** Push to main branch → Coolify auto-deploys → Functions auto-update

---

## Resources

- Coolify Docs: https://coolify.io/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Deno Runtime: https://deno.land/
