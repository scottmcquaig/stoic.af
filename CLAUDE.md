# CLAUDE.md - Stoic AF Journal Development Guide

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Stoic AF Journal** is a React/Vite journaling application based on Figma design (https://www.figma.com/design/MlK7WLvdLiSSHTQdrKmsxT/Stoic-AF-Journal-PRD). It's a 30-day journaling program focused on four Stoic principles: Money, Relationships, Discipline, and Ego.

---

## ⚠️ CRITICAL: Environment Variables

**NO HARDCODED CREDENTIALS ALLOWED.** All sensitive configuration must come from environment variables.

### Required Environment Variables

See `ENVIRONMENT_SETUP.md` and `.env.example` for complete list.

**Frontend (Vite - VITE_ prefix):**
- `VITE_SUPABASE_URL` - Supabase API endpoint (e.g., `http://supa.stoicaf.local` or `http://192.168.4.219:8000`)
- `VITE_SUPABASE_ANON_KEY` - Public JWT key for Supabase auth
- `VITE_SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only, DO NOT expose in client code)

**Backend (Deno Edge Functions):**
- `SUPABASE_URL` - Supabase internal URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server operations
- `SUPABASE_ANON_KEY` - Anon key for client operations within Edge Functions
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `FRONTEND_URL` - Frontend URL for payment redirects (e.g., `https://stoicaf.local`)

### Loading Environment Variables

**Frontend (src/utils/supabase/info.tsx):**
```typescript
// Vite automatically exposes env vars with VITE_ prefix via import.meta.env
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```

**Backend (Deno Edge Functions):**
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL');
```

### Setting Environment Variables

**Local Development (.env.local):**
```bash
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

**Coolify Deployment:**
Set variables in Coolify dashboard → Application Settings → Environment Variables

**Never commit .env.local or .env files to git** - they're in `.gitignore`

---

## Current Setup

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Dev Server:** Runs on port 3000
- **Styling:** Tailwind CSS v4 with PostCSS
- **UI Components:** shadcn/ui (Radix UI)

### Backend
- **Runtime:** Deno Edge Functions on Supabase
- **Framework:** Hono (lightweight routing)
- **Base Path:** `/make-server-6d6f37b2/`
- **Data Storage:** Supabase KV store (not database tables)

### Database
- **Type:** PostgreSQL (via Supabase)
- **Auth:** Supabase Auth + Custom JWT
- **Schema:** `database/create_users_table.sql`

---

## Development Commands

```bash
# Install dependencies
npm install

# Development server (port 3000)
npm run dev

# Build for production
npm run build

# Serve production build locally
npm run start
```

---

## Architecture

### Frontend Structure

Three main views:
- **Landing Page** - Unauthenticated users (marketing)
- **Dashboard** - Authenticated users (main app)
- **Admin Panel** - Admin users with `?admin=true` URL parameter

**Key Entry Points:**
- `src/main.tsx` - Application bootstrap
- `src/App.tsx` - Root component with AuthProvider and ErrorBoundary
- `src/components/AppContent.tsx` - Main routing logic

### Backend Architecture

Hono server running on Deno:
- **KV Store Keys:**
  - `profile:{userId}` - User profile data (track, day, streak)
  - `purchases:{userId}` - Purchased track names
  - `journal:{userId}:{trackName}` - Journal entries
  - `preferences:{userId}` - User preferences
  - `prompts:{TRACK_ID}` - Track seed data (30 days of content)
  - `access_code:{code}` - Access code data
  - `admin_emails` - Dynamic admin email list

### Authentication Flow

1. **Custom AuthContext** (`src/contexts/AuthContext.tsx`) wraps Supabase auth
2. **Non-blocking initialization** - App loads immediately, auth checks happen in background
3. **User and profile state** - Managed centrally, load asynchronously
4. **Token injection** - `apiCall` helper automatically adds auth tokens to requests

**Important:** Auth loads asynchronously. Always check `user` AND `profile` separately - they may be null independently.

### Payment Flow

**Two methods supported:**

1. **Stripe Checkout (redirect-based):**
   - Frontend calls `/payments/create-checkout`
   - Redirects to Stripe, then back with `?success=true&session_id=X`
   - `AppContent` processes via `/payments/direct-purchase`

2. **Payment Intents (embedded form):**
   - Frontend calls `/payments/create-intent`
   - Uses Stripe Elements for card input
   - After payment, calls `/payments/process-payment-intent`

**Important:** Stripe redirect URLs use `FRONTEND_URL` environment variable (fallback: `origin` header, then localhost:5173).

### Track Data Structure

Tracks: `"Money"`, `"Relationships"`, `"Discipline"`, `"Ego"`

Server-side track IDs (uppercase): `"MONEY"`, `"RELATIONSHIPS"`, `"DISCIPLINE"`, `"EGO"`

30-day content per track:
```typescript
{
  day: number,
  daily_theme: string,
  stoic_quote: string,
  quote_author: string,
  bro_translation: string,
  todays_challenge: string,
  todays_intention: string,
  evening_reflection_prompts: string[]
}
```

---

## Styling System

- **Framework:** Tailwind CSS v4 with PostCSS
- **Config Files:** `tailwind.config.js`, `postcss.config.js` (root directory)
- **Main CSS:** `src/styles/globals.css` (theme variables, base styles)
- **UI Components:** `src/components/ui/` (shadcn/ui + Radix UI)
- **Utility:** `cn()` helper merges Tailwind classes with class-variance-authority

**Important:** Config files must use CommonJS syntax and stay in root directory.

---

## Component Structure

**UI Components:** `src/components/ui/` - shadcn/ui components
- Use these for all new UI elements
- Built on Radix UI
- Theme system supports light/dark modes

**View Components:**
- `Dashboard.tsx` - Main user dashboard
- `DashboardView.tsx` - Active track daily view
- `ChallengesView.tsx` - Track challenges display
- `AdminPanel.tsx` - Admin interface
- `LandingPageUpdated.tsx` - Marketing landing page

**Common Components:**
- `AppHeader.tsx` - Top navigation
- `BottomNavigation.tsx` - Mobile bottom nav
- `AuthModal.tsx` - Login/signup
- `ErrorBoundary.tsx` - Error handling

---

## Admin System

**Admin Access:** Email-based

**Hardcoded Admins:**
- admin@stoicaf.com
- brad@stoicaf.com

**Dynamic Admins:** Stored in KV store (`admin_emails` key)

**Admin Features:**
- User management (view all, track access)
- Generate redemption codes
- Grant/revoke track access
- Bootstrap endpoint (⚠️ should be removed after initial setup)

**Access:** Add `?admin=true` to URL while logged in as admin

---

## Code Patterns

### Making API Calls

```typescript
import { supabase } from '../utils/supabase/client';

// Get auth token
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;

// Make authenticated request
const response = await fetch(
  `${supabaseUrl}/functions/v1/make-server-6d6f37b2/endpoint`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ data }),
  }
);
```

### Handling Auth State

```typescript
const { user, profile, loading } = useAuth();

// Always check BOTH separately
if (!user) {
  // Show login
}
if (!profile) {
  // Profile loading or error
}
```

### Error Handling

- Root ErrorBoundary catches all component errors
- API errors return user-friendly messages
- Use `toast` from `sonner` for notifications

---

## Special Considerations

1. **No Hardcoded Credentials** - All sensitive data MUST use environment variables
2. **KV Store Operations** - User data lives in Supabase KV, not database tables
3. **Non-blocking Auth** - Never add blocking auth checks that prevent initial render
4. **Payment Webhooks** - Stripe webhook signature verification is incomplete (⚠️)
5. **Admin Bootstrap** - `/admin/bootstrap` endpoint should be removed after initial setup
6. **Module Aliases** - Vite config maps package versions for Deno compatibility
7. **Tailwind v4** - Requires `@tailwindcss/postcss` plugin, config files in root
8. **Deployment Options** - Both Dockerfile and Nixpacks available (Dockerfile recommended)

---

## Deployment

### Coolify Frontend Deployment

**Build Packs Available:**
1. **Dockerfile** (Recommended) - Multi-stage Alpine build
2. **Nixpacks** - Alternative with `--prefer-offline --no-audit`

**Configuration:**
- Build output: `build/`
- Production server: `serve -s build -l 3000`
- Port: 3000
- Deployment: Push to `main` triggers rebuild

**Environment Variables Required:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

### Supabase Edge Functions

Edge Functions code: `src/supabase/functions/server/index.tsx`

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `FRONTEND_URL`

---

## File Structure

```
.
├── src/
│   ├── main.tsx                          # App entry point
│   ├── App.tsx                           # Root component
│   ├── components/
│   │   ├── AppContent.tsx                # Routing logic
│   │   ├── Dashboard.tsx                 # Main dashboard
│   │   ├── AdminPanel.tsx                # Admin interface
│   │   ├── ui/                           # shadcn/ui components
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx               # Auth state management
│   ├── utils/
│   │   └── supabase/
│   │       ├── client.tsx                # Supabase client
│   │       └── info.tsx                  # Config (env vars required)
│   ├── api/
│   │   └── users/                        # User management system
│   ├── styles/
│   │   └── globals.css                   # Tailwind + theme vars
│   └── supabase/functions/server/        # Backend (Deno Edge Functions)
├── database/
│   └── create_users_table.sql            # DB schema
├── supabase/                             # Supabase config
├── .env.example                          # Env var template
├── ENVIRONMENT_SETUP.md                  # Setup instructions
├── CLAUDE.md                             # This file
├── DEPLOYMENT.md                         # Coolify deployment guide
├── vite.config.ts                        # Vite configuration
├── tailwind.config.js                    # Tailwind configuration
├── postcss.config.js                     # PostCSS configuration
└── Dockerfile                            # Production build

```

---

## Documentation Files

- **ENVIRONMENT_SETUP.md** - How to set up environment variables
- **DEPLOYMENT.md** - Coolify deployment instructions
- **.env.example** - Reference template for all environment variables
- **COOLIFY_SUPABASE_SETUP.md** - Supabase-specific setup (legacy, see ENVIRONMENT_SETUP.md)

---

## Troubleshooting

### "Missing required environment variable" Error

**Cause:** Environment variable not set

**Fix:**
1. Check `.env.local` exists in project root
2. Compare against `.env.example`
3. Restart dev server after editing `.env.local`

### Supabase Connection Failed

**Cause:** Wrong URL in environment variables

**Fix:**
1. Verify `VITE_SUPABASE_URL` is correct
2. For local: `http://192.168.4.219:8000` or `http://supa.stoicaf.local`
3. For Coolify: Check internal networking configuration

### Auth Token Invalid

**Cause:** Wrong JWT key

**Fix:**
1. Verify `VITE_SUPABASE_ANON_KEY` matches deployment
2. Rebuild frontend after updating keys
3. Check Supabase dashboard for current keys

---

## Resources

- **Vite Docs:** https://vitejs.dev
- **React Docs:** https://react.dev
- **Supabase Docs:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com
- **Hono Docs:** https://hono.dev
- **Stripe Docs:** https://stripe.com/docs
