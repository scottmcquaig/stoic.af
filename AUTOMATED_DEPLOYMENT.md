# Automated Deployment Guide for Stoic AF

This guide covers the complete deployment process with minimal manual steps.

## Architecture Overview

The application consists of two parts that deploy separately:
1. **Frontend (React)** - Deployed via Docker/Coolify
2. **Edge Functions** - Deployed to Supabase

```
┌─────────────────┐     ┌─────────────────────┐
│   Frontend      │────▶│  Supabase Platform  │
│  (Docker/K8s)   │     │  - Edge Functions   │
│                 │     │  - Database (PG)    │
│                 │     │  - Auth Service     │
└─────────────────┘     └─────────────────────┘
```

---

## One-Time Setup (Manual)

### 1. Create Database Table

This is the ONLY manual step required. Run this SQL in Supabase Dashboard:

```sql
-- Go to: https://api.mcquaig.org → SQL Editor → New Query
-- Copy and run the contents of: database/complete_setup.sql
```

The SQL file is already fixed and tested. It creates:
- `kv_store_6d6f37b2` table for storing application data
- Proper indexes and triggers
- Required permissions

### 2. Get Deployment Credentials

#### For GitHub Actions:
1. Go to https://app.supabase.com/account/tokens
2. Generate a new access token
3. Add to GitHub Secrets:
   - `SUPABASE_ACCESS_TOKEN` - Your access token
   - `SUPABASE_DB_PASSWORD` - Your database password (if needed)

#### For Local Deployment:
```bash
export SUPABASE_ACCESS_TOKEN="your-token-here"
export SUPABASE_PROJECT_ID="vuqwcuhudysudgjbeota"
```

---

## Automated Deployment Options

### Option 1: GitHub Actions (Recommended)

Every push to `main` automatically deploys Edge Functions:

```yaml
# Already configured in: .github/workflows/deploy-edge-functions.yml
# Triggers on:
- Push to main branch
- Changes to Edge Function files
- Manual workflow dispatch
```

The workflow:
1. Syncs files from `src/` to `supabase/`
2. Deploys to Supabase using CLI
3. Tests the health endpoint
4. Reports status

### Option 2: Local Deployment Script

For deployments from your local machine:

```bash
# Using Node.js script (no CLI needed)
node scripts/deploy-via-api.js

# Or using npm script
npm run deploy:functions
```

This script:
- Prepares Edge Function files
- Attempts API deployment
- Falls back to creating a ZIP for manual upload if needed
- Tests the deployment

### Option 3: Docker Compose with Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

  edge-deployer:
    image: supabase/cli:latest
    environment:
      - SUPABASE_ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN}
      - SUPABASE_PROJECT_ID=vuqwcuhudysudgjbeota
    volumes:
      - ./supabase:/workspace/supabase
      - ./src:/workspace/src
    command: |
      sh -c "
        cd /workspace
        # Sync files
        cp src/supabase/functions/server/index.tsx supabase/functions/server/index.ts
        cp src/supabase/functions/server/kv_store.tsx supabase/functions/server/kv_store.tsx
        # Link and deploy
        supabase link --project-ref $$SUPABASE_PROJECT_ID
        supabase functions deploy server --no-verify-jwt
      "
```

---

## Complete Deployment Commands

### Quick Deploy Everything

```bash
# 1. One-time database setup (manual in Supabase Dashboard)
# Run SQL from: database/complete_setup.sql

# 2. Deploy frontend with Docker
docker build -t stoic-af .
docker run -d -p 3000:3000 \
  -e VITE_SUPABASE_URL=https://api.mcquaig.org \
  -e VITE_SUPABASE_ANON_KEY=your-anon-key \
  stoic-af

# 3. Deploy Edge Functions
npm run deploy:functions

# 4. Test everything
npm run test:health
```

### Using Make (Optional)

Create a `Makefile`:

```makefile
.PHONY: deploy-all deploy-frontend deploy-functions test

deploy-all: deploy-frontend deploy-functions test

deploy-frontend:
	docker build -t stoic-af .
	docker run -d -p 3000:3000 --name stoic-af-app stoic-af

deploy-functions:
	node scripts/deploy-via-api.js

test:
	curl https://api.mcquaig.org/functions/v1/make-server-6d6f37b2/health

clean:
	docker stop stoic-af-app
	docker rm stoic-af-app
```

Then just run:
```bash
make deploy-all
```

---

## Environment Variables

### Frontend (.env.local or Docker env)
```env
VITE_SUPABASE_URL=https://api.mcquaig.org
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Edge Functions (Set in Supabase Dashboard)
```env
SUPABASE_URL=https://api.mcquaig.org
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_...
FRONTEND_URL=https://stoic.mcquaig.org
```

### Deployment Scripts
```env
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_ID=vuqwcuhudysudgjbeota
```

---

## Deployment Verification

### 1. Check Frontend
```bash
curl http://localhost:3000
# Should return HTML
```

### 2. Check Edge Functions
```bash
curl https://api.mcquaig.org/functions/v1/make-server-6d6f37b2/health
# Should return: {"status": "healthy", ...}
```

### 3. Check Full Flow
Try creating a user account through the UI. If successful, everything is working!

---

## Troubleshooting

### Edge Function Not Deploying

If automated deployment fails:

1. **Manual ZIP Upload**:
   ```bash
   cd supabase/functions/server
   zip edge-function.zip index.ts kv_store.tsx
   ```
   Upload at: https://app.supabase.com/project/vuqwcuhudysudgjbeota/functions

2. **Check Files Exist**:
   ```bash
   ls -la supabase/functions/server/
   # Should show: index.ts and kv_store.tsx
   ```

### Database Errors

If you get "relation does not exist":
1. Re-run the SQL from `database/complete_setup.sql`
2. Verify table exists:
   ```sql
   SELECT * FROM public.kv_store_6d6f37b2 LIMIT 1;
   ```

### Docker Issues

If frontend isn't accessible:
```bash
# Check if container is running
docker ps

# Check logs
docker logs stoic-af-app

# Restart
docker restart stoic-af-app
```

---

## CI/CD Pipeline

For complete automation with your CI/CD:

### GitLab CI Example
```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build-frontend:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:latest

deploy-functions:
  stage: deploy
  image: supabase/cli:latest
  script:
    - supabase link --project-ref $SUPABASE_PROJECT_ID
    - supabase functions deploy server --no-verify-jwt
  only:
    - main
```

### Jenkins Example
```groovy
pipeline {
  agent any

  environment {
    SUPABASE_ACCESS_TOKEN = credentials('supabase-token')
  }

  stages {
    stage('Build Frontend') {
      steps {
        sh 'docker build -t stoic-af .'
      }
    }

    stage('Deploy Edge Functions') {
      steps {
        sh 'node scripts/deploy-via-api.js'
      }
    }

    stage('Test') {
      steps {
        sh 'npm run test:health'
      }
    }
  }
}
```

---

## Summary

The deployment is now automated except for one-time database setup:

1. **Database**: Run SQL once in Supabase Dashboard ✅
2. **Frontend**: Automated via Docker ✅
3. **Edge Functions**: Automated via scripts/GitHub Actions ✅

Use the provided scripts and workflows to deploy with a single command or push.