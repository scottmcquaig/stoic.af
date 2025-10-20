# Coolify Docker Compose Setup - Automatic Edge Functions Deployment

This guide explains how to set up Coolify to automatically deploy your Edge Functions with every push.

---

## What's Included

The Docker Compose setup includes:
1. **app** - Your frontend React application (Dockerfile)
2. **function-deployer** - Sidecar that deploys Edge Functions to Supabase (Dockerfile.deployer)

When you deploy, both services work together:
- App builds and starts normally
- Function-deployer automatically copies Edge Function files to Supabase
- Functions reload immediately
- Everything ready to go

---

## Setup in Coolify

### Option 1: Switch from Dockerfile to Docker Compose (Recommended)

**Prerequisites:**
- Your StoicAF repository pushed with all new files
- Coolify project created

**Steps:**

1. **In Coolify Dashboard:**
   - Go to Applications → Your App → Settings
   - Find "Build Pack" or "Deployment Method" section
   - Change from "Dockerfile" to "Docker Compose"
   - Save settings

2. **Rebuild Application:**
   - Click "Rebuild" or "Deploy"
   - Watch logs as it builds

3. **Verify Environment Variables:**
   - Go to Application → Settings → Environment
   - Ensure these are set:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_SUPABASE_SERVICE_ROLE_KEY`
     - `SUPABASE_URL` (for Edge Functions)
     - `SUPABASE_SERVICE_ROLE_KEY` (for Edge Functions)
     - `SUPABASE_ANON_KEY` (for Edge Functions)
     - `STRIPE_SECRET_KEY`
     - `FRONTEND_URL`

4. **First Deploy:**
   - Coolify should automatically find `docker-compose.yml`
   - Builds both images
   - Deploys services
   - Functions auto-deployed during startup

---

### Option 2: Manual Docker Compose (For Testing Locally First)

Test locally before deploying to Coolify:

```bash
# Build images
docker-compose build

# Deploy with environment variables
docker-compose up -d

# Check logs
docker-compose logs -f

# When done testing
docker-compose down
```

---

## How It Works

### Deployment Flow

```
Push to Git
    ↓
Coolify detects changes
    ↓
Builds docker-compose.yml
    ↓
[Parallel] Build app image + Build deployer image
    ↓
Start function-deployer container
    ↓
Deployer copies function files to Supabase edge container
    ↓
Deployer restarts edge container
    ↓
Deployer exits (job complete)
    ↓
Start app container (after deployer finishes)
    ↓
App loads with Edge Functions ready
    ✅ Done!
```

### Key Files

- **docker-compose.yml** - Defines both services and orchestration
- **Dockerfile** - Builds the frontend app
- **Dockerfile.deployer** - Minimal Alpine image for function deployment
- **deploy-functions-entrypoint.sh** - Bash script that does the actual deployment

---

## Troubleshooting

### Functions still not working after deploy

**Check the deployer logs:**

```bash
# In Coolify dashboard, view container logs for "function-deployer"
# Look for:
# - ✅ messages = successful
# - ❌ messages = errors
```

**Common issues:**

1. **"Could not find Supabase edge functions container"**
   - Means Supabase hasn't started yet
   - Deployer waits 30 seconds then continues
   - May deploy on next restart

2. **"No function files found"**
   - Edge Functions files missing from image
   - Verify `src/supabase/functions/server/` exists in repo
   - Check it's not in `.dockerignore`

3. **App starts before functions are ready**
   - docker-compose.yml has `depends_on` with `service_completed_successfully`
   - Should ensure app waits, but timing can be tight
   - If app starts first, restart app container manually

### How to manually restart functions (if needed)

In Coolify container terminal (edge container):
```bash
ls -la /home/deno/functions/make-server-6d6f37b2/
docker restart <edge-container-id>
```

### Verify environment variables are accessible to Edge Functions

In edge container terminal:
```bash
# These should all show values (not empty)
deno eval "console.log(Deno.env.get('SUPABASE_URL'))"
deno eval "console.log(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))"
```

---

## Testing Deployment

### 1. Test Locally First

```bash
# Copy env vars to .env.local
cp .env.example .env.local
# Edit with actual values

# Start services
docker-compose up

# In another terminal, test signup
curl -X POST http://localhost:3000/make-server-6d6f37b2/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","fullName":"Test User"}'
```

### 2. Test in Coolify

1. Push changes to GitHub
2. Trigger rebuild in Coolify
3. Wait for both containers to start (function-deployer first, then app)
4. Try signing up in your app

### 3. Check Functions Are Deployed

In Coolify, go to edge container terminal:
```bash
ls -la /home/deno/functions/make-server-6d6f37b2/
# Should show: index.ts and kv_store.tsx
```

---

## What Happens on Each Push

1. **GitHub Push** → Coolify detects changes
2. **Build app image** → Includes `src/supabase/functions/` files
3. **Build deployer image** → Minimal Alpine with Docker CLI
4. **Start deployer** → Waits for Supabase edge container
5. **Copy functions** → Deploys to `/home/deno/functions/make-server-6d6f37b2/`
6. **Restart edge container** → Functions reload
7. **Start app** → Ready to use

All automated - no manual steps needed!

---

## Rollback

If deployment fails:

1. **In Coolify:** Go back to previous commit or rebuild from previous tag
2. **Or manually fix:** SSH into containers and update function files
3. **Or use manual script:** Run `./deploy-functions.sh` from your machine

---

## Performance Notes

- First build takes longer (building two images)
- Subsequent builds are faster (Docker caching)
- Deployer runs in ~5-15 seconds depending on Supabase startup
- App starts immediately after deployer exits
- No production downtime (only during deploy window)

---

## Files in This Solution

```
StoicAF/
├── docker-compose.yml              # Orchestration (NEW)
├── Dockerfile                       # App container (UPDATED)
├── Dockerfile.deployer             # Deployer container (NEW)
├── deploy-functions-entrypoint.sh  # Deployment script (NEW)
├── src/supabase/functions/server/  # Edge Function files
│   ├── index.tsx
│   └── kv_store.tsx
├── COOLIFY_COMPOSE_SETUP.md        # This guide (NEW)
└── ... rest of app
```

---

## Next Steps

1. **If not yet set up:**
   - Update StoicAF repo with new files
   - In Coolify, switch to Docker Compose
   - Set all 8 environment variables
   - Rebuild

2. **If already deployed:**
   - Push latest changes
   - Watch logs in Coolify
   - Verify functions are deployed
   - Test signup

3. **For future deploys:**
   - Just push to main
   - Coolify auto-builds and deploys
   - Functions auto-deploy
   - No manual terminal commands needed!

---

## Questions?

- Check logs in Coolify for error messages
- Verify environment variables are set
- Ensure `src/supabase/functions/server/` exists with both files
- Review CLAUDE.md for architecture overview
