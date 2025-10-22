/* Supabase Configuration - Environment Variables Required */

// All configuration must come from environment variables
// DO NOT hardcode URLs, keys, or other credentials
// See .env.example and ENVIRONMENT_SETUP.md for required variables

const getRequiredEnv = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please check .env.local or your deployment environment variables. ` +
      `See ENVIRONMENT_SETUP.md for details.`
    );
  }
  return value;
};

// Supabase configuration - MUST be set via environment variables
export const supabaseUrl = getRequiredEnv('VITE_SUPABASE_URL');
export const publicAnonKey = getRequiredEnv('VITE_SUPABASE_ANON_KEY');

// Project ID for backward compatibility
export const projectId = 'stoicaf';
