# Stoic AF + Supabase Auth in Coolify - Complete Setup Guide

## What Was Wrong

Your Supabase auth wasn't working in Coolify because:

1. **Outdated JWT tokens** - The anon key in `info.tsx` didn't match the keys Coolify generated
2. **DNS resolution issues** - Browsers couldn't find `supa.stoicaf.local` without hosts file entries
3. **No environment variable support** - Credentials were hardcoded instead of using `.env` files

## What's Fixed

- Updated `src/utils/supabase/info.tsx` with correct JWT tokens from Coolify
- Added environment variable support (can now override via `.env` files)
- Created `.env.example` as a reference template
- Added better comments explaining the DNS requirements

---

## Quick Start (3 Steps)

### Step 1: Add DNS Entries to Your Local Computer

On the **computer where you browse** (not the server), add these to `/etc/hosts`:

**Mac/Linux:**
```bash
sudo nano /etc/hosts
```

**Windows:**
Open `C:\Windows\System32\drivers\etc\hosts` as Administrator

Add these lines:
```
192.168.4.219   supa.stoicaf.local
192.168.4.219   stoicaf.local
```

Save and exit.

### Step 2: Rebuild the App in Coolify

Push your changes to trigger a Coolify rebuild:

```bash
cd /home/scott/apps/stoicaf.local/stoicaf.local
git add -A
git commit -m "Fix: Update Supabase credentials for Coolify deployment"
git push origin main
```

Or manually trigger a rebuild in the Coolify UI.

### Step 3: Test the Connection

After Coolify deploys, open your browser and:

1. Go to `http://stoicaf.local`
2. Open browser console (F12)
3. Try signing up or signing in
4. Auth should work now!

**Quick connectivity test:**
```javascript
fetch('http://supa.stoicaf.local/auth/v1/health', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYwNDgyMTI3LCJleHAiOjIwNzU4NDIxMjd9.Dq0e3_lyOjEuwePRscF84wDQd3fAJtEb_VSZnf2DRHs'
  }
})
  .then(r => r.json())
  .then(data => console.log('✅ Supabase connected:', data))
  .catch(err => console.error('❌ Connection failed:', err))
```

---

## Advanced: Using Environment Variables (Optional)

If you want different settings per environment, create a `.env.local` file:

```bash
cd /home/scott/apps/stoicaf.local/stoicaf.local
cp .env.example .env.local
```

Then edit `.env.local` with your values. The app will prefer these over the hardcoded defaults.

In **Coolify**, you can also set environment variables in the application settings:
- `VITE_SUPABASE_URL=http://supa.stoicaf.local`
- `VITE_SUPABASE_ANON_KEY=your-key-here`

---

## Better Solution: Reverse Proxy (Recommended for Production)

Instead of requiring every user to edit their hosts file, use Coolify's proxy feature:

### Option A: Caddy Proxy (If using Caddy in Coolify)

Add this to your Coolify proxy configuration:

```
stoicaf.local {
    # Proxy Supabase API requests
    handle /api/* {
        reverse_proxy supa.stoicaf.local:8000
    }

    # Serve the frontend
    reverse_proxy localhost:3000
}
```

Then update `src/utils/supabase/info.tsx`:
```typescript
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "/api"
```

This way all API calls go through the same domain as your frontend, eliminating CORS and DNS issues.

### Option B: Use Direct IP (Quick Test)

For testing without hosts file:

```typescript
// src/utils/supabase/info.tsx
export const supabaseUrl = "http://192.168.4.219:8000"
```

This will work from any device on your network but won't work over the internet unless port 8000 is exposed.

---

## Troubleshooting

### "Network connection failed" Error

**Cause:** Browser can't resolve `supa.stoicaf.local`

**Fix:** Make sure you added the hosts entries (Step 1 above)

**Test:**
```bash
ping supa.stoicaf.local
# Should respond with 192.168.4.219
```

### "Invalid API key" Error

**Cause:** Old JWT token still in use

**Fix:** Make sure you rebuilt the app after updating `info.tsx`

### "CORS Error" in Console

**Cause:** Browser is blocking cross-domain requests

**Fix:**
1. Check that Supabase has CORS enabled (it should by default)
2. Consider using the reverse proxy solution above
3. Make sure `ADDITIONAL_REDIRECT_URLS` in Supabase includes your frontend URL

### Auth Works Locally but Not in Coolify

**Possible causes:**
1. Environment variables not set in Coolify
2. Build cache - try clearing Coolify's build cache and rebuild
3. DNS not resolving on server - check server's `/etc/hosts` file

---

## Current Configuration Summary

**Frontend (stoicaf.local):**
- Running on port 3000
- Served via Coolify
- Accessible at `http://stoicaf.local`

**Backend (Supabase):**
- Running via Coolify's Supabase service
- Kong proxy on port 8000
- Accessible at `http://supa.stoicaf.local` (requires hosts entry)

**Database:**
- PostgreSQL on port 5432
- Password: `5TbGOz9CsCY7n5UykN7cECnx49qeF6LM`
- Connection string: `postgresql://postgres:5TbGOz9CsCY7n5UykN7cECnx49qeF6LM@localhost:5432/postgres`

**Auth Configuration:**
- Email signup: Enabled
- Email auto-confirm: Disabled (users need to verify email)
- Anonymous users: Enabled
- Phone signup: Enabled

---

## Next Steps

After auth is working:

1. **Set up email delivery** - Configure SMTP in Supabase so users can verify emails
2. **Add SSL certificates** - Use Caddy/Traefik for HTTPS
3. **Configure redirect URLs** - Update `ADDITIONAL_REDIRECT_URLS` in Supabase for production domain
4. **Test payment flow** - Ensure Stripe integration works with auth
5. **Set up database backups** - Use Coolify's backup feature for PostgreSQL

---

## Files Modified

- `src/utils/supabase/info.tsx` - Updated with correct JWT tokens and environment variable support
- `.env.example` - Created as template for environment variables
- `COOLIFY_SUPABASE_SETUP.md` - This guide

---

## Support & Resources

- **Coolify Docs:** https://coolify.io/docs
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **Issue Tracker:** Check existing docs in the repo:
  - `FIX_SIGNIN_ERROR.md` - DNS troubleshooting
  - `NETWORK_FIX.md` - Network configuration
  - `DEPLOYMENT.md` - Coolify deployment guide

---

## Summary

The main issues were:
1. ✅ Wrong JWT token - **Fixed** by updating `info.tsx`
2. ✅ No environment variable support - **Fixed** by adding `import.meta.env` checks
3. ⚠️ DNS resolution requires hosts file - **Documented** (consider reverse proxy for production)

Auth should now work! Test it out and let me know if you hit any issues.
