#!/usr/bin/env node

/**
 * Deploy Edge Functions via Supabase Management API
 * This script deploys Edge Functions without needing the Supabase CLI
 *
 * Usage:
 * 1. Set environment variables:
 *    - SUPABASE_ACCESS_TOKEN: Your personal access token from https://app.supabase.com/account/tokens
 *    - SUPABASE_PROJECT_ID: Your project ID (e.g., vuqwcuhudysudgjbeota)
 *
 * 2. Run: node scripts/deploy-via-api.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'vuqwcuhudysudgjbeota';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const FUNCTION_NAME = 'server';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check for access token
if (!ACCESS_TOKEN) {
  log('❌ Error: SUPABASE_ACCESS_TOKEN environment variable is required', 'red');
  log('Get your access token from: https://app.supabase.com/account/tokens', 'yellow');
  log('Then run: export SUPABASE_ACCESS_TOKEN="your-token-here"', 'yellow');
  process.exit(1);
}

// Prepare the Edge Function files
function prepareFiles() {
  log('📦 Preparing Edge Function files...', 'blue');

  const srcDir = path.join(__dirname, '..', 'src', 'supabase', 'functions', 'server');
  const deployDir = path.join(__dirname, '..', 'supabase', 'functions', 'server');

  // Create deployment directory if it doesn't exist
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  // Copy index.tsx to index.ts
  const indexSrc = path.join(srcDir, 'index.tsx');
  const indexDest = path.join(deployDir, 'index.ts');

  if (fs.existsSync(indexSrc)) {
    fs.copyFileSync(indexSrc, indexDest);
    log('✅ Copied index.tsx to deployment directory', 'green');
  } else {
    log('❌ Source index.tsx not found', 'red');
    process.exit(1);
  }

  // Copy kv_store.tsx
  const kvSrc = path.join(srcDir, 'kv_store.tsx');
  const kvDest = path.join(deployDir, 'kv_store.tsx');

  if (fs.existsSync(kvSrc)) {
    fs.copyFileSync(kvSrc, kvDest);
    log('✅ Copied kv_store.tsx to deployment directory', 'green');
  } else {
    log('❌ Source kv_store.tsx not found', 'red');
    process.exit(1);
  }

  return { indexDest, kvDest, deployDir };
}

// Create a multipart form data payload
function createMultipartPayload(files) {
  const boundary = `----FormBoundary${Date.now()}`;
  const parts = [];

  // Add each file
  for (const [fieldName, filePath] of Object.entries(files)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    parts.push(
      `--${boundary}`,
      `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"`,
      'Content-Type: text/plain',
      '',
      fileContent
    );
  }

  // Add metadata
  parts.push(
    `--${boundary}`,
    'Content-Disposition: form-data; name="import_map"',
    '',
    '{}'
  );

  parts.push(`--${boundary}--`, '');

  const body = parts.join('\r\n');

  return { boundary, body };
}

// Deploy via API
function deployViaAPI(files) {
  return new Promise((resolve, reject) => {
    log('🚀 Deploying Edge Function via API...', 'blue');

    const { boundary, body } = createMultipartPayload(files);

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/functions/${FUNCTION_NAME}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          log('✅ Edge Function deployed successfully!', 'green');
          resolve(JSON.parse(data));
        } else {
          log(`❌ Deployment failed with status ${res.statusCode}`, 'red');
          log(`Response: ${data}`, 'red');
          reject(new Error(`Deployment failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      log(`❌ Request error: ${error.message}`, 'red');
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

// Alternative: Deploy using ZIP file
async function deployViaZip() {
  const { deployDir } = prepareFiles();

  log('📦 Creating ZIP file for deployment...', 'blue');

  const archiver = require('archiver');
  const output = fs.createWriteStream(path.join(__dirname, '..', 'edge-function.zip'));
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      log(`✅ ZIP file created (${archive.pointer()} bytes)`, 'green');
      log('', 'reset');
      log('📤 Upload the zip file manually:', 'yellow');
      log('1. Go to: https://app.supabase.com/project/' + PROJECT_ID + '/functions', 'yellow');
      log('2. Click on your "server" function', 'yellow');
      log('3. Click "Deploy new version"', 'yellow');
      log('4. Upload: edge-function.zip', 'yellow');
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(deployDir, false);
    archive.finalize();
  });
}

// Test the deployment
async function testDeployment() {
  log('🧪 Testing deployment...', 'blue');

  const healthUrl = `https://api.mcquaig.org/functions/v1/make-server-6d6f37b2/health`;

  return new Promise((resolve) => {
    https.get(healthUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            if (health.status === 'healthy') {
              log('✅ Health check passed - deployment successful!', 'green');
            } else {
              log('⚠️ Function is deployed but not fully healthy', 'yellow');
              log('Check if database tables are created', 'yellow');
            }
          } catch (e) {
            log('⚠️ Could not parse health response', 'yellow');
          }
        } else {
          log(`⚠️ Health check returned status ${res.statusCode}`, 'yellow');
        }
        resolve();
      });
    }).on('error', (err) => {
      log(`⚠️ Could not reach health endpoint: ${err.message}`, 'yellow');
      resolve();
    });
  });
}

// Main execution
async function main() {
  log('====================================', 'blue');
  log('Stoic AF Edge Function Deployment', 'blue');
  log('====================================', 'blue');
  log('', 'reset');

  try {
    const { indexDest, kvDest } = prepareFiles();

    // Try API deployment
    try {
      await deployViaAPI({
        'index.ts': indexDest,
        'kv_store.tsx': kvDest
      });

      // Wait a bit for deployment to be ready
      log('⏳ Waiting for deployment to be ready...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 5000));

      await testDeployment();
    } catch (apiError) {
      log('', 'reset');
      log('ℹ️ API deployment failed, creating ZIP file for manual upload...', 'yellow');

      // Check if archiver is available
      try {
        require.resolve('archiver');
        await deployViaZip();
      } catch (e) {
        log('', 'reset');
        log('📦 Manual deployment instructions:', 'yellow');
        log('1. The files are ready in: supabase/functions/server/', 'yellow');
        log('2. Create a ZIP file with: index.ts and kv_store.tsx', 'yellow');
        log('3. Upload to Supabase Dashboard → Edge Functions → server', 'yellow');
      }
    }

    log('', 'reset');
    log('====================================', 'green');
    log('✅ Deployment process complete!', 'green');
    log('====================================', 'green');
    log('', 'reset');
    log('Next steps:', 'yellow');
    log('1. Ensure database tables are created (run SQL in dashboard)', 'yellow');
    log('2. Set environment variables in Edge Function settings', 'yellow');
    log('3. Test the signup flow in your application', 'yellow');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the deployment
main();