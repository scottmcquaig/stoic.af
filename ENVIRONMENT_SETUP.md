# Environment Setup Guide - Stoic AF

This guide explains how to set up environment variables for local development and Coolify deployment.

---

## Quick Start

### For Local Development

```bash
# 1. Copy the example file
cp .env.example .env.local

# 2. Edit with your actual values
nano .env.local

# 3. Start development server
npm run dev
```

### For Coolify Deployment

In Coolify Dashboard:
1. Go to Application → Settings → Environment
2. Add each variable from `.env.example` with your actual values
3. Rebuild the application

---

## Environment Variables Reference

### Frontend Variables (VITE_ prefix)

These variables are accessible in the browser after the build process.

#### `VITE_SUPABASE_URL` (Required)
**What:** Supabase API endpoint

**For Local Development:**
```
http://supa.stoicaf.local
```
or
```
http://192.168.4.219:8000
```
> Note: Using the hostname requires `/etc/hosts` entry: `192.168.4.219   supa.stoicaf.local`

**For Coolify Deployment:**
```
http://192.168.4.219:8000
```
or configure a reverse proxy to use a relative path like `/api`

**For Production (Cloud Supabase):**
```
https://project-name.supabase.co
```

**How to Find:**
1. Log into Supabase
2. Go to Settings → API
3. Copy the "Project URL"

---

#### `VITE_SUPABASE_ANON_KEY` (Required)
**What:** Public JWT key for Supabase authentication

**Why:** This key is safe to expose in the frontend - it's designed for public use

**Format:** JWT token starting with `eyJ...`

**How to Find:**
1. Log into Supabase
2. Go to Settings → API
3. Under "Project API keys", find "anon" key
4. Copy the entire value

**Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYwNDgyMTI3LCJleHAiOjIwNzU4NDIxMjd9.Dq0e3_lyOjEuwePRscF84wDQd3fAJtEb_VSZnf2DRHs
```

---

#### `VITE_SUPABASE_SERVICE_ROLE_KEY` (Required)
**What:** Server-only JWT key for backend operations

**WARNING:** This key grants full administrative access. **NEVER expose in frontend code or public URLs**

**Format:** JWT token starting with `eyJ...`

**How to Find:**
1. Log into Supabase
2. Go to Settings → API
3. Under "Project API keys", find "service_role" key
4. Copy the entire value

**Security:**
- Used only in Deno Edge Functions (never in React code)
- Treat like a password - keep it secret
- Rotate if accidentally exposed
- Use different keys for development and production

---

### Backend Variables (No prefix - Deno Edge Functions)

These variables are only available to server-side Deno Edge Functions.

#### `SUPABASE_URL` (Required)
**What:** Supabase URL for backend operations

**For Local Development:**
```
http://supa.stoicaf.local
```

**For Production:**
```
https://project-name.supabase.co
```

---

#### `SUPABASE_SERVICE_ROLE_KEY` (Required)
**What:** Service role key for backend operations

**Format:** Same as `VITE_SUPABASE_SERVICE_ROLE_KEY`

**Security:** Same warnings apply - keep this secret

---

#### `SUPABASE_ANON_KEY` (Required)
**What:** Anonymous key for backend client operations

**Format:** Same as `VITE_SUPABASE_ANON_KEY`

---

#### `STRIPE_SECRET_KEY` (Required for Payments)
**What:** Stripe API secret key for payment processing

**Format:** `sk_test_...` (development) or `sk_live_...` (production)

**WARNING:** This is extremely sensitive - keep it secret at all times

**How to Find:**
1. Log into Stripe Dashboard
2. Go to Developers → API Keys
3. Find the "Secret Key" (NOT the Publishable Key)
4. Click to reveal and copy

**Security:**
- Never share this key
- Use test keys for development, live keys for production
- Rotate immediately if exposed
- Never commit to version control

**Example (Test Key):**
```
sk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

#### `FRONTEND_URL` (Required for Payments)
**What:** Frontend URL for Stripe payment redirects

**For Local Development:**
```
http://stoicaf.local
```

**For Coolify Deployment:**
```
http://stoicaf.local
```
or
```
https://your-domain.com
```

**For Production:**
```
https://yourdomain.com
```

**Why:** After users complete payment, Stripe redirects them back to this URL with `?success=true&session_id=...`

---

### Optional Variables

#### `DATABASE_URL`
**What:** PostgreSQL connection string for manual database work

**Format:**
```
postgresql://username:password@host:port/database
```

**Example:**
```
postgresql://postgres:mypassword@localhost:5432/postgres
```

**When Needed:**
- Running manual database migrations
- Debugging database issues
- Direct database access (advanced)

**Note:** Usually not needed - Supabase handles this through API

---

## Setup Instructions by Deployment Method

### 1. Local Development

#### Step 1: Create .env.local
```bash
cp .env.example .env.local
```

#### Step 2: Get Supabase Keys

**If using local Supabase (Coolify on 192.168.4.219):**
1. Log into Coolify at `http://192.168.4.219`
2. Navigate to Supabase service
3. Find API keys in the settings
4. Copy the URL and keys

**If using cloud Supabase:**
1. Log into https://supabase.com
2. Open your project
3. Go to Settings → API
4. Copy the Project URL and keys

#### Step 3: Fill in .env.local

```bash
nano .env.local
```

Minimal example for local development:
```env
VITE_SUPABASE_URL=http://192.168.4.219:8000
VITE_SUPABASE_ANON_KEY=<paste-your-anon-key>
VITE_SUPABASE_SERVICE_ROLE_KEY=<paste-your-service-role-key>
SUPABASE_URL=http://192.168.4.219:8000
SUPABASE_SERVICE_ROLE_KEY=<paste-your-service-role-key>
SUPABASE_ANON_KEY=<paste-your-anon-key>
STRIPE_SECRET_KEY=sk_test_your_test_key_here
FRONTEND_URL=http://stoicaf.local
```

#### Step 4: Start Development Server

```bash
npm install
npm run dev
```

The app will start on `http://localhost:3000`

#### Step 5: Add DNS Entries (if using hostname)

If using `supa.stoicaf.local`, add to your local computer's `/etc/hosts`:

**macOS/Linux:**
```bash
sudo nano /etc/hosts
```

Add:
```
192.168.4.219   supa.stoicaf.local
192.168.4.219   stoicaf.local
```

**Windows:**
1. Open `C:\Windows\System32\drivers\etc\hosts` as Administrator
2. Add:
```
192.168.4.219   supa.stoicaf.local
192.168.4.219   stoicaf.local
```

---

### 2. Coolify Deployment

#### Step 1: Get Your Keys

From Supabase (local or cloud):
- Project URL
- Anon Key
- Service Role Key

From Stripe Dashboard:
- Secret Key (test or live)

#### Step 2: Set Environment Variables in Coolify

1. Open Coolify Dashboard (`http://192.168.4.219` or your domain)
2. Go to Applications → Your App → Settings
3. Find "Environment" or "Variables" section
4. Add each variable:

```
VITE_SUPABASE_URL=http://192.168.4.219:8000
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_URL=http://192.168.4.219:8000
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=<your-anon-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
FRONTEND_URL=http://stoicaf.local
```

#### Step 3: Rebuild Application

1. In Coolify, click "Rebuild" or "Deploy"
2. Wait for build to complete
3. Access the app at your configured domain

---

## Troubleshooting

### "Missing required environment variable" Error

**What it means:** The application can't find a required environment variable

**Checklist:**
- [ ] `.env.local` exists in project root
- [ ] Variable is spelled correctly (case-sensitive)
- [ ] Variable has a value (not empty)
- [ ] Dev server restarted after editing `.env.local`

**Solution:**
```bash
# 1. Check the file exists
cat .env.local | grep VITE_SUPABASE_URL

# 2. Restart dev server
npm run dev

# 3. Or clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

### "Supabase Connection Failed" in Browser

**What it means:** Frontend can't reach Supabase API

**Checklist:**
- [ ] `VITE_SUPABASE_URL` is correct
- [ ] Supabase service is running (if local)
- [ ] Network connectivity (if using hostname, check DNS/hosts file)
- [ ] Firewall allows connection

**Solution:**
1. Open browser console (F12)
2. Test connectivity:
```javascript
fetch(import.meta.env.VITE_SUPABASE_URL + '/auth/v1/health')
  .then(r => r.json())
  .then(d => console.log('✅ Connected:', d))
  .catch(e => console.error('❌ Failed:', e))
```

3. If failed:
   - Verify URL format (should be `http://...` or `https://...`)
   - Check if using hostname - verify `/etc/hosts` entry
   - Try using IP address instead: `http://192.168.4.219:8000`

---

### "Invalid API key" Error

**What it means:** The JWT key is invalid or expired

**Checklist:**
- [ ] Copied full key (not truncated)
- [ ] Key is current (if generated long ago, might be expired)
- [ ] Key matches deployment (local vs. cloud keys are different)

**Solution:**
1. Get fresh key from Supabase
2. Update `.env.local`
3. Restart dev server
4. For Coolify: Update in dashboard and rebuild

---

### "CORS Error" in Browser Console

**What it means:** Browser is blocking cross-domain requests

**Common cause:** `VITE_SUPABASE_URL` has different domain than frontend

**Solutions:**
1. Use same domain as frontend (e.g., both `http://stoicaf.local`)
2. Or configure Coolify reverse proxy to proxy Supabase requests
3. Or ensure Supabase CORS is configured correctly

---

### Payment Redirects to localhost:5173

**What it means:** `FRONTEND_URL` environment variable not set

**Checklist:**
- [ ] `FRONTEND_URL` is set in .env (for dev) or Coolify (for deployment)
- [ ] Value is correct URL (e.g., `http://stoicaf.local`)

**Solution:**
```bash
# Local: Update .env.local
FRONTEND_URL=http://stoicaf.local

# Coolify: Update in dashboard and rebuild
```

---

## Best Practices

### Security

1. **Never commit secrets**
   - `.env.local` is in `.gitignore`
   - Keep it local only
   - Don't share .env files

2. **Use different keys for different environments**
   ```
   Development:  Supabase dev project + Stripe test keys
   Production:   Supabase prod project + Stripe live keys
   ```

3. **Rotate keys if exposed**
   - Regenerate in Supabase/Stripe dashboard
   - Update all deployments immediately
   - Check logs for unauthorized access

4. **Limit key permissions**
   - Use "anon" keys only in frontend
   - Use "service_role" only in backend
   - Never use service_role keys in browser

### Deployment

1. **Test locally first**
   ```bash
   # Local with production-like keys
   cp .env.example .env.local
   # Fill in production keys
   npm run build
   npm run start
   # Test at http://localhost:3000
   ```

2. **Use separate credentials per environment**
   - Staging deployment: staging Supabase/Stripe keys
   - Production deployment: production keys

3. **Verify after deployment**
   - Check browser console for errors
   - Test authentication
   - Test payment flow
   - Check Stripe webhook logs

---

## Reference: Where to Get Each Key

| Variable | Source | Path |
|----------|--------|------|
| `VITE_SUPABASE_URL` | Supabase | Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase | Settings → API → anon key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Supabase | Settings → API → service_role key |
| `SUPABASE_URL` | Supabase | Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Settings → API → service_role key |
| `SUPABASE_ANON_KEY` | Supabase | Settings → API → anon key |
| `STRIPE_SECRET_KEY` | Stripe | Developers → API Keys → Secret Key |
| `FRONTEND_URL` | You | Your domain/IP (e.g., `http://stoicaf.local`) |

---

## Verification Checklist

Use this to verify your setup is correct:

```bash
# 1. Check .env.local exists
[ -f .env.local ] && echo "✅ .env.local exists" || echo "❌ Missing .env.local"

# 2. Check all required variables are set
for var in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY STRIPE_SECRET_KEY; do
  grep -q "^$var=" .env.local && echo "✅ $var set" || echo "❌ $var missing"
done

# 3. Start dev server and check console
npm run dev
# Should not see "Missing required environment variable" errors

# 4. Test Supabase connection in browser console
# See "Supabase Connection Failed" section above

# 5. Test authentication
# Try signing up/logging in from the app
```

---

## Questions?

- **Environment variables not working?** Check CLAUDE.md → Troubleshooting
- **Supabase-specific issues?** See Supabase docs: https://supabase.com/docs
- **Stripe integration?** See Stripe docs: https://stripe.com/docs/api
- **Coolify deployment?** See DEPLOYMENT.md
