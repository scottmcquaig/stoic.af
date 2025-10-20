/* Supabase Configuration for Coolify Environment */

// IMPORTANT: For browser access, add this to your LOCAL computer's /etc/hosts file:
// 192.168.4.219   supa.stoicaf.local
// 192.168.4.219   stoicaf.local
// (Windows: C:\Windows\System32\drivers\etc\hosts)

// Use environment variables if available, otherwise fall back to direct URL
// For production, consider using Coolify's proxy feature to avoid cross-domain issues
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "http://supa.stoicaf.local"

// Updated anon key from Coolify's generated environment (supa-variables.md)
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYwNDgyMTI3LCJleHAiOjIwNzU4NDIxMjd9.Dq0e3_lyOjEuwePRscF84wDQd3fAJtEb_VSZnf2DRHs"

// Service role key for server-side operations (DO NOT expose in client code)
export const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjA0ODIxMjcsImV4cCI6MjA3NTg0MjEyN30.zGK8pLWTq_nRhKzkyoDdxD13Lj2MnvkEyKclQAmFMOs"

// Keep projectId for backward compatibility (not used for local instance)
export const projectId = "local"