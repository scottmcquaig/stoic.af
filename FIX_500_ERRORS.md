# Fix for HTTP 500 Errors in Signup Process

## Problem Identified

The HTTP 500 errors during signup are likely caused by one of these issues:
1. **Missing database table** (`kv_store_6d6f37b2`) that the Edge Functions require
2. **Incorrect environment variables** in the Edge Functions
3. **Supabase auth configuration issues**

## Root Cause

The error occurs when the signup endpoint tries to either:
- Create a user in Supabase Auth (if auth is misconfigured)
- Save user profile data to the KV store table (if table is missing)

## Diagnostic Steps

### Step 1: Run the Health Check

First, check what exactly is failing by accessing the health check endpoint:

```bash
# Replace with your actual Supabase URL
curl https://api.mcquaig.org/functions/v1/make-server-6d6f37b2/health
```

This will return a JSON response showing:
- Environment variable status
- Database connectivity
- KV store functionality
- Supabase auth status
- Specific recommendations if something is wrong

The response will look like:
```json
{
  "status": "unhealthy",
  "checks": {
    "environment": { ... },
    "kv_store": {
      "status": "unhealthy",
      "error": "relation \"public.kv_store_6d6f37b2\" does not exist"
    }
  },
  "recommendations": [
    "Create kv_store_6d6f37b2 table - run SQL from database/create_kv_store_table.sql"
  ]
}

```

### Step 2: Check Edge Function Logs

Access the Edge Function logs in Supabase Dashboard:
1. Go to https://api.mcquaig.org (your Supabase instance)
2. Navigate to "Logs" → "Edge Functions"
3. Look for recent logs from the `server` function
4. Search for error messages with these prefixes:
   - `📝 Signup endpoint called` - Shows the signup process started
   - `❌` - Indicates errors
   - `✅` - Shows successful steps
   - `🏥` - Health check results

The enhanced logging will show exactly where the process fails:
- Environment variable issues
- Database connection problems
- User creation failures
- KV store save failures

## Solution Steps

### Step 1: Create the KV Store Table (Most Common Issue)

1. **Access your Supabase Dashboard**
   - Go to: https://api.mcquaig.org (or your Supabase instance URL)
   - Login with your admin credentials

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Execute the KV Store Table Creation SQL**
   - Copy the entire contents of `database/create_kv_store_table.sql` (already created in this repo)
   - Paste it into the SQL editor
   - Click "Run" to execute

   The SQL will create:
   - The `kv_store_6d6f37b2` table with proper columns
   - Necessary indexes for performance
   - Automatic timestamp updates
   - Proper permissions for all roles

### Step 2: Verify Table Creation

1. **Check Table Exists**
   - In Supabase Dashboard, go to "Database" → "Tables"
   - You should see `kv_store_6d6f37b2` in the list
   - Click on it to verify the columns: `key` (text), `value` (jsonb), `created_at`, `updated_at`

2. **Test with SQL Query**
   ```sql
   -- Test insert
   INSERT INTO kv_store_6d6f37b2 (key, value)
   VALUES ('test:key', '{"test": true}'::jsonb)
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

   -- Test select
   SELECT * FROM kv_store_6d6f37b2 WHERE key = 'test:key';

   -- Clean up test
   DELETE FROM kv_store_6d6f37b2 WHERE key = 'test:key';
   ```

### Step 3: Verify Environment Variables

Make sure your Edge Functions have the correct environment variables set:

1. **Check Supabase Function Settings**
   - In Supabase Dashboard, go to "Edge Functions"
   - Click on your function
   - Check environment variables:
     - `SUPABASE_URL`: Should match your Supabase instance URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (starts with `eyJ...`)
     - `SUPABASE_ANON_KEY`: Your anon key (starts with `eyJ...`)
     - `STRIPE_SECRET_KEY`: Your Stripe secret key (if using payments)
     - `FRONTEND_URL`: https://stoic.mcquaig.org

### Step 4: Deploy the Updated Edge Function Code

The Edge Function code has been updated with enhanced error logging. You need to redeploy it:

1. **Using Supabase CLI:**
   ```bash
   # First, ensure you're linked to your project
   supabase link --project-ref vuqwcuhudysudgjbeota

   # Deploy the updated function
   supabase functions deploy server
   ```

2. **Alternative - Manual Upload in Dashboard:**
   - Go to Supabase Dashboard → Edge Functions
   - Click on the `server` function
   - Click "Deploy new version"
   - Upload the updated code from `src/supabase/functions/server/`

3. **Verify Deployment:**
   - Check the health endpoint after deployment:
   ```bash
   curl https://api.mcquaig.org/functions/v1/make-server-6d6f37b2/health
   ```
   - Look for "status": "healthy" in the response

### Step 5: Test Signup Again

1. **Clear Browser Cache**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

2. **Try Signing Up**
   - The signup should now work without HTTP 500 errors
   - Check the Network tab to verify successful responses

## Additional Checks

### If Errors Persist:

1. **Check Supabase Logs**
   - In Supabase Dashboard, go to "Logs" → "Edge Functions"
   - Look for any error messages from your function

2. **Verify Database Connection**
   ```sql
   -- Run this in SQL Editor to verify the service role can access the table
   SELECT count(*) FROM kv_store_6d6f37b2;
   ```

3. **Check CORS Settings**
   - Ensure your frontend URL is allowed in Supabase CORS settings
   - Dashboard → Settings → API → CORS Allowed Origins

4. **Inspect Function Logs**
   The server code includes detailed logging. Check these logs in Supabase Dashboard:
   - Look for messages starting with `🔍`, `✅`, or `❌`
   - The logs will show exactly where the process fails

## Expected Behavior After Fix

Once the KV store table is created:

1. **Signup Process:**
   - User creates account → Supabase Auth creates user
   - Edge Function creates user profile in KV store
   - Empty purchases array initialized
   - Success response returned

2. **Data Storage:**
   - User profiles stored as: `profile:{userId}`
   - Purchases stored as: `purchases:{userId}`
   - Journal entries stored as: `journal:{userId}:{trackName}`
   - Preferences stored as: `preferences:{userId}`

## Prevention for Future Deployments

To prevent this issue in future deployments:

1. **Add to Setup Documentation**
   - Include KV store table creation in deployment steps
   - Add to `DEPLOYMENT.md` or setup scripts

2. **Create Migration Script**
   ```bash
   # create setup_database.sh
   #!/bin/bash
   echo "Setting up database tables..."
   supabase db reset
   supabase db push database/create_users_table.sql
   supabase db push database/create_kv_store_table.sql
   echo "Database setup complete!"
   ```

3. **Add Health Check Endpoint**
   The `/make-server-6d6f37b2/health` endpoint could be enhanced to verify database connectivity:
   ```typescript
   // Add KV store check to health endpoint
   const kvStoreHealthy = await kv.get('health:check').then(() => true).catch(() => false);
   ```

## Contact for Help

If issues persist after following these steps:
- Check the Edge Function logs for detailed error messages
- Verify all environment variables are correctly set
- Ensure the database user has proper permissions
- Consider checking network connectivity between Edge Functions and database

The primary issue is the missing `kv_store_6d6f37b2` table, and creating it should resolve the HTTP 500 errors immediately.