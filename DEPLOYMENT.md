# Coolify Deployment Guide for Stoic AF Journal

This guide will help you deploy the Stoic AF Journal application using Coolify with Nixpacks.

## Prerequisites

- A Coolify instance set up and running
- Git repository access to this project
- Environment variables configured (if any)

## Deployment Steps

### 1. Create a New Application in Coolify

1. Log in to your Coolify dashboard
2. Click "Create New Resource" > "Application"
3. Connect your Git repository containing this project
4. Select the branch you want to deploy (e.g., `main`)

### 2. Configure Build Settings

1. **Build Pack**: Select `nixpacks` as the build pack
2. **Base Directory**: Leave as root `/` (unless your app is in a subdirectory)
3. **Port**: Set to `3000` (default port configured in nixpacks.toml)

### 3. Configure Environment Variables

Add any required environment variables in the Coolify settings panel:

```
NODE_ENV=production
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Add other environment variables as needed
```

### 4. Deploy

1. Click "Deploy" to start the deployment process
2. Monitor the build logs to ensure everything compiles correctly
3. Once deployed, Coolify will provide you with a URL to access your application

## What the Nixpacks Configuration Does

The `nixpacks.toml` file configures the deployment process:

- **Setup Phase**: Installs Node.js 20
- **Install Phase**: Runs `npm ci` to install dependencies
- **Build Phase**: Runs `npm run build` to compile the Vite application
- **Start Phase**: Serves the built files using `serve` on port 3000

## Deployment Files

- `nixpacks.toml` - Nixpacks configuration for Coolify
- `.dockerignore` - Files to exclude from the Docker build context
- `.coolify` - Marker file for Coolify configuration

## Build Output

The Vite build process outputs files to the `build` directory as configured in `vite.config.ts:55`.

## Troubleshooting

### Build Fails

- Check the Coolify build logs for specific errors
- Ensure all dependencies are correctly specified in `package.json`
- Verify that the Node.js version (20) is compatible with your dependencies

### Application Doesn't Start

- Verify the port configuration (should be 3000)
- Check that the `serve` package is installed in dependencies
- Review Coolify application logs for runtime errors

### Environment Variables Not Working

- Ensure all Vite environment variables start with `VITE_`
- Verify variables are set in Coolify settings before deployment
- Rebuild the application after adding new environment variables

## Custom Domain

To use a custom domain:

1. Go to your application settings in Coolify
2. Add your custom domain in the "Domains" section
3. Configure your DNS records as instructed by Coolify
4. Enable SSL/TLS certificates (Coolify handles this automatically)

## Continuous Deployment

Coolify can automatically deploy when you push to your Git repository:

1. Enable "Automatic Deployment" in application settings
2. Select which branch(es) should trigger deployments
3. Push to the configured branch to trigger automatic deployment

## References

- [Coolify Documentation](https://coolify.io/docs)
- [Nixpacks Documentation](https://nixpacks.com/docs)
- [Vite Build Documentation](https://vitejs.dev/guide/build.html)

## Support

For issues specific to:
- **Coolify**: Check the [Coolify GitHub Issues](https://github.com/coollabsio/coolify/issues)
- **Nixpacks**: Check the [Nixpacks Documentation](https://nixpacks.com/docs)
- **This Application**: Contact your development team
