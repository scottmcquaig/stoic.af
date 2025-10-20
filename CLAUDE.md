# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stoic AF Journal** is a React/Vite journaling application based on Figma design (https://www.figma.com/design/MlK7WLvdLiSSHTQdrKmsxT/Stoic-AF-Journal-PRD). It's a 30-day journaling program focused on four Stoic principles: Money, Relationships, Discipline, and Ego.

## Current Setup

**Local Supabase** is configured and running at `http://supa.stoicaf.local`
- 50+ Docker containers providing full Supabase stack
- PostgreSQL database with custom users table and CRUD API
- Authentication configured for local development
- See `/home/scott/apps/stoicaf.local/supa-variables.md` for environment variables

**IMPORTANT:** For browser access, add to your local machine's `/etc/hosts`:
```
192.168.4.219   supa.stoicaf.local
192.168.4.219   stoicaf.local
```
Without these entries, you'll get "Network connection failed" errors.

## Development Commands

```bash
# Install dependencies
npm install

# Development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Serve production build locally (port 3000)
npm run start

# Run tests (not yet configured)
# npm test

# Apply database schema (local Supabase)
psql postgresql://postgres:5TbGOz9CsCY7n5UykN7cECnx49qeF6LM@localhost:5432/postgres -f database/create_users_table.sql

# Deploy Edge Functions to local Supabase
supabase functions deploy server --local
```

## Architecture

### Frontend Structure

The application follows a single-page architecture with three main states:
- **Landing Page** (unauthenticated users)
- **Dashboard** (authenticated users)
- **Admin Panel** (admin users with `?admin=true` URL parameter)

**Key Entry Points:**
- `src/main.tsx` - Application bootstrap
- `src/App.tsx` - Root component with AuthProvider and ErrorBoundary
- `src/components/AppContent.tsx` - Main routing logic that handles landing/dashboard/admin views

### New User Management System

Located in `src/api/users/`:
- **userService.ts** - Complete CRUD operations with Supabase integration
- **validation.ts** - Zod schemas for input validation (email, password, username, etc.)
- **types.ts** - TypeScript interfaces for User, CreateUserDTO, UpdateUserDTO, etc.
- **routes.tsx** - REST API route handlers and React hooks (`useUserApi`)
- **__tests__/userService.test.ts** - Comprehensive test suite

**Database Schema:** `database/create_users_table.sql`
- Extended user profiles with RLS policies
- Automatic triggers for profile creation and timestamps
- Performance indexes on commonly queried fields

### Authentication Flow

Authentication is handled through a custom AuthContext (`src/contexts/AuthContext.tsx`) that wraps Supabase auth:

1. **Non-blocking initialization** - App loads immediately, auth checks happen in background
2. **Auth state management** - User and profile state managed centrally
3. **API communication** - All backend calls use the `apiCall` helper function with automatic token injection

**Important:** Auth loads asynchronously to prevent blocking the UI. Check for `user` and `profile` separately - they may be null even after loading completes.

### Backend Architecture

The backend is a **Hono server** running on Deno (`src/supabase/functions/server/index.tsx`):

- **Base path:** `/make-server-6d6f37b2/`
- **Data storage:** Supabase KV store (not database tables)
- **Payment processing:** Stripe Checkout and Payment Intents
- **Admin features:** User management, access code generation, track grants

**KV Store Keys:**
- `profile:{userId}` - User profile data (current track, day, streak, etc.)
- `purchases:{userId}` - Array of purchased track names
- `journal:{userId}:{trackName}` - Journal entries for a specific track
- `preferences:{userId}` - User preferences
- `prompts:{TRACK_ID}` - Track seed data (30 days of prompts, quotes, challenges)
- `access_code:{code}` - Access code data for redemption
- `admin_emails` - Dynamic admin email list

### Payment Flow

**Two payment methods supported:**

1. **Stripe Checkout (redirect-based):**
   - Frontend calls `/payments/create-checkout` or `/payments/create-bundle-checkout`
   - User redirected to Stripe, then back to app with `?success=true&track=X&session_id=X`
   - AppContent processes payment via `/payments/direct-purchase` or `/payments/process-bundle-purchase`

2. **Payment Intents (embedded form):**
   - Frontend calls `/payments/create-intent`
   - Uses Stripe Elements for card input
   - After payment, calls `/payments/process-payment-intent`

**Important:** Always include `session_id` in success URLs for payment verification.

**Payment Recovery Mechanism:**
AppContent (lines 72-169) includes automatic payment recovery if `session_id` is missing:
- Extracts `session_id` from URL using regex fallback
- If no `session_id` found, polls `/purchases` endpoint up to 6 times (30 seconds)
- Waits for Stripe webhook to process payment and update KV store
- Shows appropriate error messages if payment can't be verified
- This handles edge cases where payment succeeds but redirect parameters are malformed

### Track Data Structure

Each track has 30 days of structured content:
```typescript
{
  track_id: "MONEY" | "RELATIONSHIPS" | "DISCIPLINE" | "EGO",
  days: [{
    day: number,
    daily_theme: string,
    stoic_quote: string,
    quote_author: string,
    bro_translation: string,
    todays_challenge: string,
    todays_intention: string,
    evening_reflection_prompts: string[]
  }]
}
```

Track data is seeded via `/admin/seed-prompts` and fetched via `/prompts/:trackName`.

## Styling System

**Tailwind CSS v4** is configured with PostCSS:
- **Config files:** `tailwind.config.js` and `postcss.config.js` in root directory
- **Main CSS:** `src/styles/globals.css` contains theme variables and base styles
- **PostCSS plugin:** Uses `@tailwindcss/postcss` (required for Tailwind v4)
- **Content paths:** Scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`

**Important:** Config files must use CommonJS syntax (`module.exports`), not ES modules.

## Component Structure

**UI Components:** Located in `src/components/ui/` - shadcn/ui components built on Radix UI
- Use these for all new UI elements
- Components use Tailwind CSS with class-variance-authority (cva)
- Theme system supports light/dark modes via CSS variables
- Helper function: `cn()` from `src/components/ui/utils.ts` merges Tailwind classes

**View Components:**
- `Dashboard.tsx` - Main user dashboard with track overview
- `DashboardView.tsx` - Active track daily view
- `ChallengesView.tsx` - Track challenges display
- `AdminPanel.tsx` - Admin interface for user/track management
- `LandingPageUpdated.tsx` - Marketing landing page

**Common Components:**
- `AppHeader.tsx` - Top navigation with user menu
- `BottomNavigation.tsx` - Mobile bottom nav
- `AuthModal.tsx` - Login/signup modal
- `ErrorBoundary.tsx` - Error handling wrapper

## Admin System

Admin access is email-based (checked in server-side `isAdminUser` function):

**Hardcoded admins:**
- admin@stoicaf.com
- brad@stoicaf.com

**Dynamic admins:** Stored in KV store under `admin_emails` key

**Admin Features:**
- User management (view all users, purchases, progress)
- Grant/revoke track access
- Generate redemption codes
- Bootstrap endpoint for initial admin setup (should be removed after use)

**Access admin panel:** Add `?admin=true` to URL while logged in as admin

## Environment Variables

### Local Supabase (Current Configuration)

Located in `src/utils/supabase/info.tsx`:
```typescript
export const supabaseUrl = "http://supa.stoicaf.local"
export const publicAnonKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

Database connection for local development:
- **Host:** localhost (or supa.stoicaf.local via /etc/hosts)
- **Port:** 5432
- **Database:** postgres
- **Password:** 5TbGOz9CsCY7n5UykN7cECnx49qeF6LM

See `supa-variables.md` for complete environment variable list.


## Deployment

### Frontend Deployment (Coolify)

**Two deployment options available:**

1. **Dockerfile (Recommended):**
   - Multi-stage Alpine-based build for smaller images
   - More reliable and faster than Nixpacks
   - Set build pack to "Dockerfile" in Coolify settings

2. **Nixpacks:**
   - Alternative build method
   - Optimized with `--prefer-offline --no-audit` flags
   - Set build pack to "Nixpacks" in Coolify settings

**Common Configuration:**
- Build output directory: `build/`
- Production server: `serve -s build -l 3000`
- Port: 3000
- Automatic deployment: Push to `main` branch triggers rebuild
- See `DEPLOYMENT.md` for complete Coolify instructions

### Backend Deployment (Supabase Edge Function)

For local Supabase, Edge Functions are deployed to the local container stack. The function code is in `supabase/functions/server/index.ts`.

## Code Patterns

### Making API Calls

```typescript
import { supabase } from '../utils/supabase/client';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

// Get auth token
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token || publicAnonKey;

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

**Using the new User API:**
```typescript
import { useUserApi } from './api/users/routes';

// In component
const { getCurrentUser, updateUser, loading, error } = useUserApi();

// Or direct service calls
import { UserService } from './api/users/userService';
const result = await UserService.getUserById(userId);
```

### Handling Auth State

```typescript
const { user, profile, loading } = useAuth();

// Always check user AND profile separately
if (!user) {
  // Show login
}

if (!profile) {
  // Profile loading or error
}
```

### Working with Tracks

Track names must be: `"Money"`, `"Relationships"`, `"Discipline"`, or `"Ego"`
Server-side track IDs are uppercase: `"MONEY"`, `"RELATIONSHIPS"`, `"DISCIPLINE"`, `"EGO"`

### Error Handling

- All components wrapped in ErrorBoundary at root
- API errors should return user-friendly messages
- Use `toast` from `sonner` for user notifications

## Figma Design Reference

This codebase implements the design from Figma file MlK7WLvdLiSSHTQdrKmsxT.
- Uses shadcn/ui components (MIT license)
- Includes Unsplash photos (Unsplash license)
- See `src/Attributions.md` for full attribution details

## Special Considerations

1. **DNS Resolution:** Users must add `supa.stoicaf.local` and `stoicaf.local` to their `/etc/hosts` file pointing to the server IP (192.168.4.219) for the application to work. See `FIX_SIGNIN_ERROR.md` for detailed instructions.

2. **KV Store Operations:** All user data is in Supabase KV, not database tables. Handle KV errors gracefully with fallback to default values.

3. **Payment Webhooks:** Stripe webhook endpoint exists at `/payments/webhook` but webhook signature verification is noted as incomplete. Webhook should handle `checkout.session.completed` events.

4. **Admin Bootstrap Security:** The `/admin/bootstrap` endpoint (line 1718 in server index.tsx) should be removed after initial admin setup for security.

5. **User Table Creation:** Run the SQL script to create the users table: `psql postgresql://postgres:5TbGOz9CsCY7n5UykN7cECnx49qeF6LM@localhost:5432/postgres -f database/create_users_table.sql`

6. **Module Aliases:** Vite config includes extensive module version aliases (e.g., `stripe@17.3.1` -> `stripe`). This is to handle JSR/npm package resolution in Deno Edge Functions.

7. **Non-blocking Auth:** The auth system intentionally loads the app before completing auth checks. Never add blocking auth checks that prevent initial render. Auth initializes in background after 100ms delay (AuthContext.tsx:340).

8. **Dev Track Grants:** The `/dev/grant-track` endpoint exists for development testing and should be disabled in production.

9. **Tailwind CSS Configuration:** The project uses Tailwind v4 which requires `@tailwindcss/postcss` plugin. Config files must be in root directory and use CommonJS syntax. Never move config files to `src/` directory.

10. **Deployment Options:** Both Dockerfile and Nixpacks configurations exist. Dockerfile is recommended for more reliable builds. Nixpacks has been optimized with `--prefer-offline --no-audit` flags to prevent timeout issues.

11. **Landing Page Structure:** Landing page is split into modular sections in `src/components/landing/`:
    - `HeroSection.tsx` - Main hero with CTA buttons
    - `ProblemsSection.tsx` - Pain points
    - `SolutionSection.tsx` - Value proposition
    - `TracksSection.tsx` - Track details and purchase flow
    - `SocialProofSection.tsx` - Testimonials
    - `FooterCTA.tsx` - Final call to action
    - `data.tsx` - Static content data for landing sections
