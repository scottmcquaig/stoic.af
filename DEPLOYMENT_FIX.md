# Complete Fix for Stoic AF Deployment Issues

## Quick Fix (Run These Commands)

```bash
# 1. Setup database tables
./scripts/setup-database.sh

# 2. Deploy Edge Function with correct files
./scripts/deploy-edge-function.sh

# 3. Test the deployment
curl https://api.mcquaig.org/functions/v1/make-server-6d6f37b2/health
```

If all steps succeed, your signup should now work!

---

## What Was Wrong

### 1. **Edge Function File Structure Issue**
- **Problem**: The Edge Function at `/supabase/functions/server/index.ts` was trying to import `./kv_store.tsx`, but that file was missing
- **Error**: `InvalidWorkerCreation: worker boot error: failed to read path: No such file or directory`
- **Fix**: Copied the missing `kv_store.tsx` file to the deployment directory

### 2. **Missing Database Table**
- **Problem**: The `kv_store_6d6f37b2` table didn't exist in your Supabase database
- **Error**: HTTP 500 errors when trying to save user profiles
- **Fix**: Created SQL script to create the required table

### 3. **Lack of Error Visibility**
- **Problem**: The original code didn't have enough logging to diagnose issues
- **Fix**: Added comprehensive error logging and a health check endpoint

---

## File Structure (IMPORTANT)

The Edge Function deployment requires this exact structure:

```
stoic.af/
├── src/supabase/functions/server/    # Development files
│   ├── index.tsx                     # Main function code (development)
│   └── kv_store.tsx                  # KV store implementation
│
└── supabase/functions/server/        # Deployment files (what gets deployed)
    ├── index.ts                      # Main function code (for deployment)
    └── kv_store.tsx                  # KV store implementation (must be copied here)
```

**Key Point**: Files in `src/supabase/functions/server/` are for development. They must be copied to `supabase/functions/server/` for deployment!

---

## Complete Manual Fix Steps

If the scripts don't work, here's how to fix everything manually:

### Step 1: Fix the Edge Function Files

```bash
# Copy files to deployment directory
cp src/supabase/functions/server/index.tsx supabase/functions/server/index.ts
cp src/supabase/functions/server/kv_store.tsx supabase/functions/server/kv_store.tsx

# Verify files are in place
ls -la supabase/functions/server/
# Should show: index.ts and kv_store.tsx
```

### Step 2: Create the Database Table

Go to your Supabase Dashboard:
1. Navigate to https://api.mcquaig.org
2. Go to **SQL Editor**
3. Run this SQL:

```sql
-- Create the KV Store table
CREATE TABLE IF NOT EXISTS public.kv_store_6d6f37b2 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kv_store_key ON public.kv_store_6d6f37b2(key);
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON public.kv_store_6d6f37b2(key text_pattern_ops);

-- Grant permissions
GRANT ALL ON public.kv_store_6d6f37b2 TO postgres;
GRANT ALL ON public.kv_store_6d6f37b2 TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kv_store_6d6f37b2 TO authenticated;
GRANT SELECT ON public.kv_store_6d6f37b2 TO anon;
```

### Step 3: Deploy the Edge Function

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref vuqwcuhudysudgjbeota

# Deploy the function
supabase functions deploy server --no-verify-jwt

# Check deployment logs
supabase functions logs server
```

### Step 4: Set Environment Variables

In Supabase Dashboard → Edge Functions → server → Settings, ensure these are set:
- `SUPABASE_URL`: https://api.mcquaig.org
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
- `SUPABASE_ANON_KEY`: Your anon key
- `STRIPE_SECRET_KEY`: Your Stripe secret key (if using payments)
- `FRONTEND_URL`: https://stoic.mcquaig.org

### Step 5: Test Everything

```bash
# Test health endpoint
curl https://api.mcquaig.org/functions/v1/make-server-6d6f37b2/health

# Should return something like:
# {
#   "status": "healthy",
#   "checks": {
#     "environment": { ... },
#     "kv_store": { "status": "healthy" },
#     "supabase_auth": { "status": "healthy" }
#   }
# }
```

---

## Debugging Tips

### Check Edge Function Logs

```bash
# Stream live logs
supabase functions logs server --follow

# Or check in Dashboard
# Dashboard → Logs → Edge Functions
```

Look for these log prefixes:
- `📝` - Request received
- `✅` - Successful operation
- `❌` - Error occurred
- `🏥` - Health check
- `💾` - Database operation

### Common Issues and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `worker boot error` | Missing kv_store.tsx | Run `./scripts/deploy-edge-function.sh` |
| `relation does not exist` | Missing database table | Run `./scripts/setup-database.sh` |
| `Invalid authorization` | Wrong/missing auth keys | Check environment variables |
| `CORS error` | Frontend URL not allowed | Add to CORS settings in Supabase |

### Test Individual Components

1. **Test KV Store directly**:
```sql
-- In SQL Editor
INSERT INTO kv_store_6d6f37b2 (key, value)
VALUES ('test:key', '{"test": true}'::jsonb);

SELECT * FROM kv_store_6d6f37b2;
```

2. **Test Auth**:
```bash
# Try creating a user via API
curl -X POST https://api.mcquaig.org/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'
```

---

## Prevention for Future

### Always Deploy with the Script
```bash
# This ensures files are synced correctly
./scripts/deploy-edge-function.sh
```

### Keep Files in Sync
The deployment script automatically copies files from `src/` to `supabase/` directories.

### Monitor Health
Regularly check: `curl [YOUR_SUPABASE_URL]/functions/v1/make-server-6d6f37b2/health`

---

## Support

If issues persist after following all these steps:

1. Check the Edge Function logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure the database user has proper permissions
4. Check that your Supabase project is active and not paused

The enhanced error logging in the updated code will help identify any remaining issues.