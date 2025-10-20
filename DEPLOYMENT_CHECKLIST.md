# Deployment Checklist - Environment Variables

Use this checklist to ensure all environment variables are properly configured for Coolify deployment.

---

## Pre-Deployment Tasks

### 1. Gather Credentials

#### Supabase Keys
- [ ] Log into Supabase (cloud or local instance)
- [ ] Go to Settings → API
- [ ] Copy these values:
  - [ ] Project URL: `https://xxxxx.supabase.co` or `http://192.168.4.219:8000`
  - [ ] Anon Key: (starts with `eyJ...`)
  - [ ] Service Role Key: (starts with `eyJ...`)

#### Stripe Keys
- [ ] Log into Stripe Dashboard
- [ ] Go to Developers → API Keys
- [ ] Copy these values:
  - [ ] Secret Key: `sk_test_...` or `sk_live_...`
  - [ ] **DO NOT** use Publishable Key

#### Frontend URL
- [ ] Determine your frontend URL:
  - [ ] Local: `http://stoicaf.local`
  - [ ] Coolify: `http://stoicaf.local` or your domain
  - [ ] Production: `https://yourdomain.com`

---

## Coolify Configuration

### 2. Add Environment Variables to Coolify

In Coolify Dashboard:

1. [ ] Navigate to: **Applications** → Your App → **Settings**
2. [ ] Find: **Environment** or **Variables** section
3. [ ] Add each variable below with your actual values:

**Frontend Variables (VITE_ prefix):**
```
VITE_SUPABASE_URL=[your-supabase-url]
VITE_SUPABASE_ANON_KEY=[your-anon-key]
VITE_SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

**Backend Variables:**
```
SUPABASE_URL=[your-supabase-url]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
SUPABASE_ANON_KEY=[your-anon-key]
STRIPE_SECRET_KEY=[your-stripe-secret-key]
FRONTEND_URL=[your-frontend-url]
```

### 3. Verification Checklist

After adding all variables in Coolify:

- [ ] All 8 variables are present (no typos)
- [ ] All values are pasted completely (not truncated)
- [ ] No extra spaces before/after values
- [ ] Service role keys are actual secrets (not anon keys)
- [ ] Stripe key starts with `sk_` (not `pk_`)

---

## Build & Deploy

### 4. Rebuild Application

In Coolify Dashboard:

- [ ] Click **Rebuild** or **Deploy**
- [ ] Wait for build to complete
- [ ] Check build logs for errors:
  - [ ] No "Missing required environment variable" errors
  - [ ] No "Cannot find module" errors
  - [ ] Build shows "Successfully built" or similar

### 5. Access Application

After deployment:

- [ ] Navigate to your app URL: `http://stoicaf.local`
- [ ] Page should load (not show error)
- [ ] Open browser console: **F12** → **Console** tab

---

## Testing

### 6. Test Supabase Connection

In browser console:

```javascript
// Test Supabase API is reachable
fetch(import.meta.env.VITE_SUPABASE_URL + '/auth/v1/health')
  .then(r => r.json())
  .then(d => console.log('✅ Supabase connected:', d))
  .catch(e => console.error('❌ Supabase failed:', e))
```

Results:
- [ ] ✅ Supabase connected: `{...}` → Success
- [ ] ❌ Failed → Check VITE_SUPABASE_URL in Coolify

### 7. Test Authentication

In the app:

- [ ] Sign up page loads
- [ ] Click "Sign up"
- [ ] Fill in email and password
- [ ] Submit form
- [ ] Check for errors:
  - [ ] "Missing required environment variable" → Env var not set
  - [ ] "Network error" → Wrong URL or firewall
  - [ ] "Invalid API key" → Wrong key
  - [ ] Success → Auth working

### 8. Test Payment Flow (if enabled)

In the app:

- [ ] Log in with test account
- [ ] Try to purchase a track
- [ ] Redirected to Stripe
- [ ] Check redirect URL after payment:
  - [ ] Should go to `[FRONTEND_URL]/?success=true&...`
  - [ ] Not `http://localhost:5173/?...`
  - [ ] Check that payment was successful

---

## Troubleshooting

### Issue: "Missing required environment variable: VITE_SUPABASE_URL"

**Checklist:**
- [ ] Variable is set in Coolify
- [ ] Spelled exactly: `VITE_SUPABASE_URL` (case-sensitive)
- [ ] Application has been rebuilt after adding variable
- [ ] Value is not empty

**Fix:**
1. Go to Coolify → Settings → Environment
2. Verify variable exists and has a value
3. Click **Rebuild**
4. Wait for rebuild to complete

---

### Issue: "Network connection failed" in browser

**Checklist:**
- [ ] VITE_SUPABASE_URL is correct URL format
- [ ] Supabase service is running (if local)
- [ ] Firewall allows connection
- [ ] DNS resolution works (if using hostname)

**Test in browser console:**
```javascript
fetch(import.meta.env.VITE_SUPABASE_URL)
  .then(r => console.log('Status:', r.status))
  .catch(e => console.error('Failed:', e.message))
```

**Fix:**
1. Verify VITE_SUPABASE_URL is reachable from your network
2. Try using IP address instead of hostname
3. Check Supabase is running (local deployments)

---

### Issue: "Invalid API key" in browser

**Checklist:**
- [ ] VITE_SUPABASE_ANON_KEY is complete (not truncated)
- [ ] Key hasn't expired (if manually created)
- [ ] Key matches your deployment (not using dev key in production)

**Fix:**
1. Go to Supabase dashboard
2. Get fresh API key from Settings → API
3. Update in Coolify
4. Rebuild application

---

### Issue: Payment redirects to localhost:5173

**Checklist:**
- [ ] FRONTEND_URL is set in Coolify
- [ ] Value is correct (e.g., `http://stoicaf.local`)
- [ ] Application has been rebuilt

**Fix:**
1. Set FRONTEND_URL in Coolify
2. Rebuild application
3. Try payment again

---

## Rollback / Emergency

If something goes wrong:

### Revert to Previous Configuration
1. In Coolify, take note of current environment variables
2. Check git history for previous values (if any)
3. Update variables back to working state
4. Rebuild

### Check Recent Changes
```bash
# In your local git repo
git log --oneline -10
git diff HEAD~1
```

### Get Help
- Check ENVIRONMENT_SETUP.md for detailed troubleshooting
- Check CLAUDE.md for architecture details
- Review Supabase docs: https://supabase.com/docs
- Review Stripe docs: https://stripe.com/docs

---

## Verification Summary

After complete deployment, all of these should be ✅:

- [ ] Application loads without errors
- [ ] Browser console shows no "Missing environment variable" errors
- [ ] Supabase connection test succeeds
- [ ] Authentication works (can sign up/log in)
- [ ] Payment flow works (if enabled)
- [ ] Payment redirects to correct URL
- [ ] Admin panel accessible (if admin)
- [ ] All features working as expected

---

## Reference: Variable Quick Copy

Use this for copying all variables to Coolify at once:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
FRONTEND_URL=
```

Then fill in the values from your Supabase and Stripe dashboards.

---

## Notes

- **Sensitive Data:** Service role and Stripe keys are like passwords. Keep them secret.
- **Different Environments:** Use different keys for dev/staging/production
- **Monitoring:** After deployment, monitor application logs for any errors
- **Backups:** Keep record of working configuration in case you need to revert

---

Last Updated: 2025-10-20
See ENVIRONMENT_SETUP.md for complete documentation
