# Supabase Edge Function Deployment Guide

## Problem
The authentication is failing with connection errors because the Supabase Edge Function is not deployed to your Supabase project.

## Solution: Deploy the Edge Function

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate with Supabase.

### Step 3: Link Your Project

```bash
supabase link --project-ref vuqwcuhudysudgjbeota
```

You'll be prompted to enter your database password (from your Supabase project settings).

### Step 4: Set Environment Variables

Create a `.env` file in your `supabase/functions/server/` directory:

```bash
SUPABASE_URL=https://vuqwcuhudysudgjbeota.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cXdjdWh1ZHlzdWRnamJlb3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MzQ3NDEsImV4cCI6MjA3MjUxMDc0MX0.TcOn3BqD4wMB5SWzgs71D4_xUNfYTSK9qfAH40QyT7I
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

**Important:** Get your `SUPABASE_SERVICE_ROLE_KEY` from:
1. Go to https://supabase.com/dashboard/project/vuqwcuhudysudgjbeota/settings/api
2. Copy the `service_role` key (keep this secret!)

### Step 5: Deploy the Function

```bash
supabase functions deploy server
```

### Step 6: Set Function Secrets

After deploying, set the environment variables as secrets:

```bash
supabase secrets set SUPABASE_URL=https://vuqwcuhudysudgjbeota.supabase.co --project-ref vuqwcuhudysudgjbeota
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key --project-ref vuqwcuhudysudgjbeota
supabase secrets set SUPABASE_ANON_KEY=your_anon_key --project-ref vuqwcuhudysudgjbeota
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key --project-ref vuqwcuhudysudgjbeota
supabase secrets set STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key --project-ref vuqwcuhudysudgjbeota
```

### Step 7: Verify Deployment

Test the health endpoint:

```bash
curl https://vuqwcuhudysudgjbeota.supabase.co/functions/v1/make-server-6d6f37b2/health
```

You should see: `{"status":"ok"}`

## Alternative: Use Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/vuqwcuhudysudgjbeota/functions
2. Click "Deploy new function"
3. Copy and paste the contents of `supabase/functions/server/index.tsx`
4. Set the function name to `server`
5. Set the environment variables in the Supabase dashboard

## Troubleshooting

### "Command not found: supabase"
Install the CLI: `npm install -g supabase`

### "Project not linked"
Run: `supabase link --project-ref vuqwcuhudysudgjbeota`

### "Authentication error"
Make sure you're logged in: `supabase login`

### "Missing environment variables"
Set them using `supabase secrets set` as shown in Step 6

## Next Steps

Once deployed:
1. Test login/signup on your frontend
2. Monitor function logs in Supabase dashboard
3. Check for any runtime errors
