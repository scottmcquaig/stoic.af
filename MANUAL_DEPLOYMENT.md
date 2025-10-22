# Manual Deployment Guide for Stoic AF (No CLI Required)

## Step 1: Create Database Table in Supabase SQL Editor

### Go to your Supabase Dashboard:
1. Navigate to https://api.mcquaig.org
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste ALL of this SQL:

```sql
-- ============================================
-- COMPLETE DATABASE SETUP FOR STOIC AF
-- ============================================

-- 1. Create the KV Store table (REQUIRED FOR APP TO WORK)
CREATE TABLE IF NOT EXISTS public.kv_store_6d6f37b2 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kv_store_key ON public.kv_store_6d6f37b2(key);
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON public.kv_store_6d6f37b2(key text_pattern_ops);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_kv_store_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS update_kv_store_updated_at_trigger ON public.kv_store_6d6f37b2;
CREATE TRIGGER update_kv_store_updated_at_trigger
    BEFORE UPDATE ON public.kv_store_6d6f37b2
    FOR EACH ROW
    EXECUTE FUNCTION update_kv_store_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.kv_store_6d6f37b2 TO postgres;
GRANT ALL ON public.kv_store_6d6f37b2 TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kv_store_6d6f37b2 TO authenticated;
GRANT SELECT ON public.kv_store_6d6f37b2 TO anon;

-- Add table comment
COMMENT ON TABLE public.kv_store_6d6f37b2 IS 'Key-Value store for Stoic AF application data';
COMMENT ON COLUMN public.kv_store_6d6f37b2.key IS 'Unique key identifier (e.g., profile:userId, purchases:userId, journal:userId:trackName)';
COMMENT ON COLUMN public.kv_store_6d6f37b2.value IS 'JSON data associated with the key';

-- ============================================
-- 2. Test the KV store table
-- ============================================

-- Insert a test record to verify the table works
INSERT INTO public.kv_store_6d6f37b2 (key, value)
VALUES ('test:setup', '{"test": true, "timestamp": "' || NOW() || '"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Verify the test record was created
SELECT * FROM public.kv_store_6d6f37b2 WHERE key = 'test:setup';

-- Clean up the test record
DELETE FROM public.kv_store_6d6f37b2 WHERE key = 'test:setup';

-- ============================================
-- 3. Verify table structure
-- ============================================

-- Check that the table exists with correct columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'kv_store_6d6f37b2'
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'SUCCESS: KV Store table created and ready for use!' as status;
```

5. Click **Run** to execute the SQL
6. You should see a success message at the bottom

---

## Step 2: Deploy Edge Function (Manual Upload)

Since you can't use the CLI in your containerized environment, you need to manually upload the Edge Function files.

### Option A: Through Supabase Dashboard

1. Go to **Edge Functions** in your Supabase Dashboard
2. Find your `server` function (or create a new one if it doesn't exist)
3. Click **Deploy new version** or **Edit**

### Files You Need to Upload:

The Edge Function needs TWO files in the same directory:

#### File 1: `index.ts`
Location in your repo: `/home/scott/stoic.af/supabase/functions/server/index.ts`

**IMPORTANT**: This file has already been updated with the enhanced error logging and is ready to upload!

#### File 2: `kv_store.tsx`
Location in your repo: `/home/scott/stoic.af/supabase/functions/server/kv_store.tsx`

**IMPORTANT**: This file MUST be in the same directory as index.ts when uploading!

### Option B: Create a ZIP file for upload

If Supabase asks for a ZIP file:

```bash
# Create a ZIP with both required files
cd /home/scott/stoic.af/supabase/functions/server
zip -r server-function.zip index.ts kv_store.tsx
```

Then upload the `server-function.zip` file.

---

## Step 3: Set Environment Variables

In Supabase Dashboard → Edge Functions → `server` → Settings, make sure these environment variables are set:

```env
SUPABASE_URL=https://api.mcquaig.org
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
FRONTEND_URL=https://stoic.mcquaig.org
```

**Where to find your keys:**
- Go to Settings → API in your Supabase Dashboard
- Copy the `service_role` key (secret, starts with `eyJ...`)
- Copy the `anon` key (public, starts with `eyJ...`)

---

## Step 4: Test Everything

### Test 1: Check if the KV store table exists

Run this in SQL Editor:
```sql
SELECT COUNT(*) FROM public.kv_store_6d6f37b2;
-- Should return 0 or a number, not an error
```

### Test 2: Check the health endpoint

Open this URL in your browser or use curl:
```
https://api.mcquaig.org/functions/v1/make-server-6d6f37b2/health
```

You should see a JSON response like:
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "checks": {
    "environment": {
      "supabase_url": true,
      "service_role_key": true,
      "anon_key": true
    },
    "supabase_client": true,
    "kv_store": {
      "status": "healthy",
      "can_write": true,
      "can_read": true,
      "can_delete": true
    },
    "supabase_auth": {
      "status": "healthy",
      "admin_available": true
    }
  }
}
```

### Test 3: Try signing up

Go to your application and try the signup flow. It should now work!

---

## Troubleshooting

### If you get "relation does not exist" error:
- The KV store table wasn't created properly
- Re-run the SQL from Step 1

### If you get "worker boot error":
- The `kv_store.tsx` file is missing from the deployment
- Make sure to upload BOTH `index.ts` and `kv_store.tsx` files together

### If you get "Unauthorized" errors:
- Check that your environment variables are set correctly
- Verify the service role key has proper permissions

### To see detailed logs:
1. Go to Supabase Dashboard → Logs → Edge Functions
2. Look for messages with these prefixes:
   - `📝` - Request received
   - `✅` - Successful operation
   - `❌` - Error occurred
   - `🏥` - Health check
   - `💾` - Database operation

---

## Quick Verification Checklist

- [ ] KV store table created in database (run the SQL)
- [ ] Both Edge Function files uploaded (index.ts + kv_store.tsx)
- [ ] Environment variables set in Edge Function settings
- [ ] Health endpoint returns "healthy" status
- [ ] Signup flow works without 500 errors

Once all items are checked, your deployment is complete!