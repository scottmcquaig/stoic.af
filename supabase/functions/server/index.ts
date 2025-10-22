import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";
import Stripe from "npm:stripe@17.3.1";

const app = new Hono();

// Initialize Supabase client with service role key for server operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20.acacia',
});

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to get user from token
const getUser = async (authorization: string | undefined) => {
  if (!authorization?.startsWith('Bearer ')) {
    console.log('❌ Missing or invalid authorization header format:', authorization);
    throw new Error('Invalid authorization header');
  }
  
  const token = authorization.split(' ')[1];
  console.log('🔍 Attempting to validate token (first 20 chars):', token.substring(0, 20) + '...');
  
  // Check if we have the required environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing environment variables:', { 
      hasUrl: !!supabaseUrl, 
      hasAnonKey: !!supabaseAnonKey 
    });
    throw new Error('Server configuration error');
  }
  
  // Create a new supabase client for this user verification using the anon key
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: { user }, error } = await userSupabase.auth.getUser(token);
  
  if (error) {
    console.log('❌ Supabase auth error:', error.message, error);
    throw new Error('Unauthorized');
  }
  
  if (!user) {
    console.log('❌ No user returned from token validation');
    throw new Error('Unauthorized');
  }
  
  console.log('✅ User validated successfully:', user.id);
  return user;
};

// Health check endpoint with database connectivity test
app.get("/make-server-6d6f37b2/health", async (c) => {
  const health: any = {
    status: "checking",
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check environment variables
  health.checks.environment = {
    supabase_url: !!Deno.env.get('SUPABASE_URL'),
    service_role_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    anon_key: !!Deno.env.get('SUPABASE_ANON_KEY'),
    stripe_key: !!Deno.env.get('STRIPE_SECRET_KEY'),
    frontend_url: !!Deno.env.get('FRONTEND_URL')
  };

  // Check Supabase client initialization
  health.checks.supabase_client = !!supabase;

  // Test KV store connectivity
  try {
    const testKey = 'health:check:' + Date.now();
    const testValue = { test: true, timestamp: new Date().toISOString() };

    console.log('🏥 Health check: Testing KV store write...');
    await kv.set(testKey, testValue);

    console.log('🏥 Health check: Testing KV store read...');
    const retrieved = await kv.get(testKey);

    console.log('🏥 Health check: Testing KV store delete...');
    await kv.del(testKey);

    health.checks.kv_store = {
      status: 'healthy',
      can_write: true,
      can_read: true,
      can_delete: true,
      test_successful: JSON.stringify(retrieved) === JSON.stringify(testValue)
    };
  } catch (kvError) {
    console.error('❌ Health check KV store error:', kvError);
    health.checks.kv_store = {
      status: 'unhealthy',
      error: kvError instanceof Error ? kvError.message : 'Unknown KV error',
      details: 'KV store operations failed - check if kv_store_6d6f37b2 table exists'
    };
  }

  // Test Supabase auth connectivity
  try {
    if (supabase?.auth?.admin) {
      // Try to list users (with limit 1 to be quick)
      const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        health.checks.supabase_auth = {
          status: 'unhealthy',
          error: error.message
        };
      } else {
        health.checks.supabase_auth = {
          status: 'healthy',
          admin_available: true
        };
      }
    } else {
      health.checks.supabase_auth = {
        status: 'unhealthy',
        error: 'Supabase admin auth not available'
      };
    }
  } catch (authError) {
    health.checks.supabase_auth = {
      status: 'unhealthy',
      error: authError instanceof Error ? authError.message : 'Unknown auth error'
    };
  }

  // Determine overall health
  const isHealthy = health.checks.environment.supabase_url &&
                    health.checks.environment.service_role_key &&
                    health.checks.supabase_client &&
                    health.checks.kv_store?.status === 'healthy' &&
                    health.checks.supabase_auth?.status === 'healthy';

  health.status = isHealthy ? 'healthy' : 'unhealthy';

  // Add recommendations if unhealthy
  if (!isHealthy) {
    health.recommendations = [];

    if (!health.checks.environment.supabase_url || !health.checks.environment.service_role_key) {
      health.recommendations.push('Set required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    }

    if (health.checks.kv_store?.status === 'unhealthy') {
      health.recommendations.push('Create kv_store_6d6f37b2 table - run SQL from database/create_kv_store_table.sql');
    }

    if (health.checks.supabase_auth?.status === 'unhealthy') {
      health.recommendations.push('Check Supabase service role key permissions');
    }
  }

  console.log('🏥 Health check result:', health);

  return c.json(health, isHealthy ? 200 : 503);
});

// Stripe configuration endpoint
app.get("/make-server-6d6f37b2/stripe/config", (c) => {
  console.log('Stripe config request received');
  const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
  console.log('Publishable key available:', !!publishableKey);
  
  if (!publishableKey) {
    console.log('Stripe not configured - missing STRIPE_PUBLISHABLE_KEY');
    return c.json({ error: 'Stripe not configured' }, 500);
  }
  
  console.log('Returning publishable key (first 12 chars):', publishableKey.substring(0, 12));
  return c.json({ publishableKey });
});

// Authentication endpoints
app.post("/make-server-6d6f37b2/auth/signup", async (c) => {
  try {
    console.log('📝 Signup endpoint called');

    // Parse request body
    let requestBody;
    try {
      requestBody = await c.req.json();
      console.log('📦 Request body parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return c.json({ error: 'Invalid request body format' }, 400);
    }

    const { email, password, fullName } = requestBody;

    if (!email || !password || !fullName) {
      console.log('❌ Missing required fields:', { hasEmail: !!email, hasPassword: !!password, hasFullName: !!fullName });
      return c.json({ error: 'Email, password, and full name are required' }, 400);
    }

    // Check Supabase client initialization
    if (!supabase) {
      console.error('❌ Supabase client is not initialized');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      console.error('Environment check:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlValue: supabaseUrl?.substring(0, 30)
      });
      return c.json({ error: 'Server configuration error - Supabase not initialized' }, 500);
    }

    console.log('🔐 Creating user with Supabase auth for email:', email);

    // Check if auth.admin is available
    if (!supabase.auth?.admin) {
      console.error('❌ Supabase admin auth not available');
      return c.json({ error: 'Server configuration error - Admin auth not available' }, 500);
    }

    // Create user with admin privileges
    let authResult;
    try {
      authResult = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name: fullName },
        // Automatically confirm the user's email since an email server hasn't been configured
        email_confirm: true
      });
      console.log('✅ Supabase auth.admin.createUser call completed');
    } catch (authError) {
      console.error('❌ Supabase auth.admin.createUser threw exception:', authError);
      return c.json({
        error: 'Failed to create user account',
        details: authError instanceof Error ? authError.message : 'Unknown auth error'
      }, 500);
    }

    const { data, error } = authResult;

    if (error) {
      // Handle specific error cases
      if (error.code === 'email_exists' ||
          error.message?.includes('already been registered') ||
          error.message?.includes('User already registered')) {
        console.log('🔍 Email already exists for signup attempt:', email);
        return c.json({
          error: 'Account already exists with this email address. Please try logging in instead.',
          code: 'email_exists'
        }, 422);
      } else if (error.message?.includes('Invalid email')) {
        console.error('❌ Invalid email format during signup:', email);
        return c.json({ error: 'Please enter a valid email address' }, 400);
      } else if (error.message?.includes('Password')) {
        console.error('❌ Password validation failed during signup');
        return c.json({ error: 'Password does not meet security requirements' }, 400);
      } else {
        console.error('❌ Unexpected Supabase auth error:', {
          code: error.code,
          message: error.message,
          status: error.status
        });
        return c.json({
          error: `Signup failed: ${error.message}`,
          code: error.code
        }, 400);
      }
    }

    if (!data?.user) {
      console.error('❌ User creation succeeded but no user data returned');
      return c.json({ error: 'User creation failed - no user data' }, 500);
    }

    console.log('✅ User created successfully with ID:', data.user.id);
    console.log('📋 Creating user profile in KV store...');

    // Create initial user profile in KV store
    const userProfile = {
      current_track: null,
      current_day: 0,
      streak: 0,
      total_days_completed: 0,
      tracks_completed: [],
      onboarding_completed: false,
      created_at: new Date().toISOString()
    };

    // Initialize empty purchases array
    const userPurchases: string[] = [];

    try {
      console.log('💾 Attempting to save profile to KV store with key:', `profile:${data.user.id}`);
      await kv.set(`profile:${data.user.id}`, userProfile);
      console.log('✅ Profile saved successfully');

      console.log('💾 Attempting to save purchases to KV store with key:', `purchases:${data.user.id}`);
      await kv.set(`purchases:${data.user.id}`, userPurchases);
      console.log('✅ Purchases saved successfully');

      console.log('🎉 Signup completed successfully for:', email);
    } catch (kvError) {
      console.error('❌ KV store error details:', {
        message: kvError instanceof Error ? kvError.message : 'Unknown KV error',
        stack: kvError instanceof Error ? kvError.stack : undefined,
        error: kvError
      });

      // Try to clean up the created user since profile creation failed
      try {
        console.log('🧹 Attempting to delete user due to profile creation failure');
        await supabase.auth.admin.deleteUser(data.user.id);
        console.log('✅ User deleted successfully');
      } catch (deleteError) {
        console.error('⚠️ Could not delete user after profile creation failure:', deleteError);
      }

      return c.json({
        error: 'User created but profile setup failed. Please try again.',
        details: kvError instanceof Error ? kvError.message : 'KV store error'
      }, 500);
    }

    return c.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    console.error('❌ Signup error (outer catch):', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({
      error: `Internal server error during signup`,
      details: errorMessage
    }, 500);
  }
});

// Get user profile
app.get("/make-server-6d6f37b2/user/profile", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    
    console.log('🔍 Fetching profile for user:', user.id);
    
    let profile;
    try {
      // Get profile from KV store
      profile = await kv.get(`profile:${user.id}`);
      console.log('📋 Profile KV result:', profile);
    } catch (kvError) {
      console.error('❌ KV store error in profile fetch:', kvError);
      
      // Return a default profile if KV store fails
      const defaultProfile = {
        current_track: null,
        current_day: 0,
        streak: 0,
        total_days_completed: 0,
        tracks_completed: [],
        onboarding_completed: false,
        created_at: new Date().toISOString()
      };
      
      return c.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name,
          created_at: user.created_at
        },
        profile: defaultProfile,
        warning: 'Database temporarily unavailable - showing default profile'
      });
    }
    
    if (!profile) {
      // Create default profile if it doesn't exist
      const defaultProfile = {
        current_track: null,
        current_day: 0,
        streak: 0,
        total_days_completed: 0,
        tracks_completed: [],
        onboarding_completed: false,
        created_at: new Date().toISOString()
      };
      
      try {
        await kv.set(`profile:${user.id}`, defaultProfile);
        
        // Initialize empty purchases if not exists
        const existingPurchases = await kv.get(`purchases:${user.id}`);
        if (!existingPurchases) {
          await kv.set(`purchases:${user.id}`, []);
        }
      } catch (kvSetError) {
        console.error('❌ Failed to create default profile:', kvSetError);
        // Continue anyway with the default profile
      }
      
      return c.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name,
          created_at: user.created_at
        },
        profile: defaultProfile
      });
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        created_at: user.created_at
      },
      profile
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    return c.json({ 
      error: 'Failed to fetch profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Update user profile
app.put("/make-server-6d6f37b2/user/profile", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    const updates = await c.req.json();
    
    // Get current profile
    const currentProfile = await kv.get(`profile:${user.id}`);
    
    if (!currentProfile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    // Update profile with new data
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`profile:${user.id}`, updatedProfile);
    
    return c.json({
      success: true,
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Update user account information (name, email, password)
app.put("/make-server-6d6f37b2/user/account", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    const { name, email, currentPassword, newPassword } = await c.req.json();
    
    console.log('🔧 Updating user account:', { userId: user.id, hasName: !!name, hasEmail: !!email, hasPasswordChange: !!newPassword });
    
    const updates: any = {};
    
    // Update name if provided
    if (name && name.trim().length > 0) {
      updates.user_metadata = { ...user.user_metadata, name: name.trim() };
    }
    
    // Update email if provided and different
    if (email && email !== user.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return c.json({ error: 'Invalid email format' }, 400);
      }
      updates.email = email;
    }
    
    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return c.json({ error: 'Current password required to change password' }, 400);
      }
      
      if (newPassword.length < 6) {
        return c.json({ error: 'New password must be at least 6 characters' }, 400);
      }
      
      // Verify current password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      
      if (signInError) {
        return c.json({ error: 'Current password is incorrect' }, 400);
      }
      
      updates.password = newPassword;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, updates);
      
      if (error) {
        console.error('Supabase user update error:', error);
        
        if (error.message.includes('email_address_not_confirmed')) {
          return c.json({ error: 'Please verify your new email address' }, 400);
        } else if (error.message.includes('email_exists')) {
          return c.json({ error: 'Email address is already in use' }, 400);
        }
        
        return c.json({ error: error.message || 'Failed to update account' }, 400);
      }
      
      console.log('✅ User account updated successfully');
      
      return c.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name,
          updated_at: data.user.updated_at
        },
        message: email && email !== user.email 
          ? 'Account updated. Please check your email to confirm the new address.'
          : 'Account updated successfully'
      });
    } else {
      return c.json({ success: true, message: 'No changes to apply' });
    }
  } catch (error) {
    console.error('Account update error:', error);
    return c.json({ error: 'Failed to update account' }, 500);
  }
});

// Get user preferences
app.get("/make-server-6d6f37b2/user/preferences", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    
    console.log('🔍 Fetching preferences for user:', user.id);
    
    // Get preferences from KV store
    let preferences = await kv.get(`preferences:${user.id}`);
    
    if (!preferences) {
      // Create default preferences if none exist
      preferences = {
        daily_reminder_time: '18:00', // 6 PM default
        daily_reminder_enabled: true,
        email_notifications: {
          streaks: true,
          milestones: true,
          reminders: true,
          weekly_summary: true
        },
        journal_export: {
          format: 'pdf',
          include_quotes: true,
          include_challenges: true
        },
        display: {
          theme: 'light',
          show_streak_counter: true,
          show_progress_percentage: true
        },
        privacy: {
          data_sharing: false,
          analytics: true
        },
        created_at: new Date().toISOString()
      };
      
      // Save default preferences
      await kv.set(`preferences:${user.id}`, preferences);
    }
    
    return c.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    return c.json({ error: 'Failed to fetch preferences' }, 500);
  }
});

// Update user preferences
app.put("/make-server-6d6f37b2/user/preferences", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    const updates = await c.req.json();
    
    console.log('🔧 Updating preferences for user:', user.id);
    
    // Get current preferences
    let currentPreferences = await kv.get(`preferences:${user.id}`);
    
    if (!currentPreferences) {
      // Create default if none exist
      currentPreferences = {
        daily_reminder_time: '18:00',
        daily_reminder_enabled: true,
        email_notifications: {
          streaks: true,
          milestones: true,
          reminders: true,
          weekly_summary: true
        },
        journal_export: {
          format: 'pdf',
          include_quotes: true,
          include_challenges: true
        },
        display: {
          theme: 'light',
          show_streak_counter: true,
          show_progress_percentage: true
        },
        privacy: {
          data_sharing: false,
          analytics: true
        },
        created_at: new Date().toISOString()
      };
    }
    
    // Merge updates with current preferences (deep merge for nested objects)
    const updatedPreferences = {
      ...currentPreferences,
      ...updates,
      email_notifications: {
        ...currentPreferences.email_notifications,
        ...(updates.email_notifications || {})
      },
      journal_export: {
        ...currentPreferences.journal_export,
        ...(updates.journal_export || {})
      },
      display: {
        ...currentPreferences.display,
        ...(updates.display || {})
      },
      privacy: {
        ...currentPreferences.privacy,
        ...(updates.privacy || {})
      },
      updated_at: new Date().toISOString()
    };
    
    // Validate daily reminder time format
    if (updates.daily_reminder_time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(updates.daily_reminder_time)) {
      return c.json({ error: 'Invalid time format. Use HH:MM (24-hour format)' }, 400);
    }
    
    await kv.set(`preferences:${user.id}`, updatedPreferences);
    
    console.log('✅ Preferences updated successfully');
    
    return c.json({
      success: true,
      preferences: updatedPreferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    return c.json({ error: 'Failed to update preferences' }, 500);
  }
});

// Get user purchases
app.get("/make-server-6d6f37b2/purchases", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    
    console.log('🔍 Fetching purchases for user:', user.id);
    
    let purchases;
    try {
      // Get purchases from KV store
      purchases = await kv.get(`purchases:${user.id}`) || [];
      console.log('📋 Purchases KV result:', purchases);
    } catch (kvError) {
      console.error('❌ KV store error in purchases fetch:', kvError);
      // Return empty array if KV store fails
      purchases = [];
    }
    
    if (!Array.isArray(purchases)) {
      console.log('⚠️ Purchases data is not an array, resetting to empty array');
      purchases = [];
      // Try to reset it in KV store
      try {
        await kv.set(`purchases:${user.id}`, purchases);
      } catch (kvSetError) {
        console.error('❌ Failed to reset purchases array:', kvSetError);
      }
    }
    
    console.log('✅ Returning purchases for user:', user.id, purchases);

    return c.json({
      success: true,
      purchases
    });
  } catch (error) {
    console.error('Purchases fetch error:', error);
    
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    return c.json({ 
      error: 'Failed to fetch purchases',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Create payment intent for direct card processing
app.post("/make-server-6d6f37b2/payments/create-intent", async (c) => {
  try {
    console.log('💳 Payment intent creation request received');
    
    const authHeader = c.req.header('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    const user = await getUser(authHeader);
    const body = await c.req.json();
    
    const { trackName, isBundle, bundlePrice, bundleTracks, bundleTitle } = body;
    
    console.log('Payment intent request:', { userId: user.id, trackName, isBundle, bundlePrice, bundleTracks });
    
    if (isBundle) {
      // Bundle purchase validation
      if (!bundleTracks || !Array.isArray(bundleTracks) || bundleTracks.length === 0) {
        console.log('❌ Invalid bundle tracks:', bundleTracks);
        return c.json({ error: 'Invalid bundle tracks' }, 400);
      }
      
      if (!bundlePrice || bundlePrice < 2 || bundlePrice > 20) {
        console.log('❌ Invalid bundle price:', bundlePrice);
        return c.json({ error: 'Invalid bundle price' }, 400);
      }
      
      // Check if user already owns any of these tracks
      const purchases = await kv.get(`purchases:${user.id}`) || [];
      console.log('Current user purchases:', purchases);
      
      const alreadyOwned = bundleTracks.filter(track => purchases.includes(track));
      if (alreadyOwned.length > 0) {
        console.log('❌ Some tracks already purchased by user:', alreadyOwned);
        return c.json({ error: `Already own: ${alreadyOwned.join(', ')}` }, 400);
      }
      
      // Create payment intent for bundle
      const paymentIntent = await stripe.paymentIntents.create({
        amount: bundlePrice * 100, // Convert to cents
        currency: 'usd',
        metadata: {
          user_id: user.id,
          is_bundle: 'true',
          bundle_tracks: bundleTracks.join(','),
          bundle_title: bundleTitle || 'Bundle',
        },
        description: `Stoic AF Journal - ${bundleTitle || 'Bundle'} (${bundleTracks.join(', ')})`,
      });
      
      console.log('✅ Bundle payment intent created successfully:', {
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret?.substring(0, 20) + '...',
        user_id: user.id,
        bundle_tracks: bundleTracks,
        amount: paymentIntent.amount
      });
      
      return c.json({ 
        success: true, 
        client_secret: paymentIntent.client_secret
      });
    } else {
      // Single track purchase validation
      if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
        console.log('❌ Invalid track name:', trackName);
        return c.json({ error: 'Invalid track name' }, 400);
      }

      // Check if user already owns this track
      const purchases = await kv.get(`purchases:${user.id}`) || [];
      console.log('Current user purchases:', purchases);
      
      if (purchases.includes(trackName)) {
        console.log('❌ Track already purchased by user');
        return c.json({ error: 'Track already purchased' }, 400);
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 400, // $4.00 in cents
        currency: 'usd',
        metadata: {
          user_id: user.id,
          track_name: trackName,
        },
        description: `Stoic AF Journal - ${trackName} Track (30-day program)`,
      });
      
      console.log('✅ Payment intent created successfully:', {
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret?.substring(0, 20) + '...',
        user_id: user.id,
        track_name: trackName,
        amount: paymentIntent.amount
      });
      
      return c.json({ 
        success: true, 
        client_secret: paymentIntent.client_secret
      });
    }


  } catch (error) {
    console.error('❌ Payment intent creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Failed to create payment intent: ${errorMessage}` }, 500);
  }
});

// Create Stripe Checkout session for single track
app.post("/make-server-6d6f37b2/payments/create-checkout", async (c) => {
  try {
    console.log('💳 Stripe checkout creation request received');
    
    const authHeader = c.req.header('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    const user = await getUser(authHeader);
    const { trackName } = await c.req.json();
    
    console.log('Checkout request:', { userId: user.id, trackName });
    
    if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
      console.log('❌ Invalid track name:', trackName);
      return c.json({ error: 'Invalid track name' }, 400);
    }

    // Check if user already owns this track
    const purchases = await kv.get(`purchases:${user.id}`) || [];
    console.log('Current user purchases:', purchases);
    
    if (purchases.includes(trackName)) {
      console.log('❌ Track already purchased by user');
      return c.json({ error: 'Track already purchased' }, 400);
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Stoic AF Journal - ${trackName} Focus`,
              description: `30-day journaling program focused on ${trackName}`,
            },
            unit_amount: 400, // $4.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${c.req.header('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/?success=true&track=${trackName}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.req.header('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/?canceled=true`,
      metadata: {
        user_id: user.id,
        track_name: trackName,
      },
    });

    console.log('✅ Checkout session created successfully:', {
      session_id: session.id,
      checkout_url: session.url?.substring(0, 50) + '...',
      user_id: user.id,
      track_name: trackName
    });

    return c.json({ 
      success: true, 
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('❌ Checkout creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Failed to create checkout: ${errorMessage}` }, 500);
  }
});

// Create Stripe Checkout session for bundle
app.post("/make-server-6d6f37b2/payments/create-bundle-checkout", async (c) => {
  try {
    console.log('💳 Bundle checkout creation request received');
    
    const authHeader = c.req.header('Authorization');
    const user = await getUser(authHeader);
    const { bundlePrice, trackNames } = await c.req.json();
    
    console.log('Bundle checkout request:', { userId: user.id, bundlePrice, trackNames });
    
    if (!trackNames || !Array.isArray(trackNames) || trackNames.length === 0) {
      console.log('❌ Invalid track names:', trackNames);
      return c.json({ error: 'Invalid track names' }, 400);
    }
    
    if (!bundlePrice || bundlePrice < 2 || bundlePrice > 20) {
      console.log('❌ Invalid bundle price:', bundlePrice);
      return c.json({ error: 'Invalid bundle price' }, 400);
    }

    // Check if user already owns any of these tracks
    const purchases = await kv.get(`purchases:${user.id}`) || [];
    console.log('Current user purchases:', purchases);
    
    const alreadyOwned = trackNames.filter(track => purchases.includes(track));
    if (alreadyOwned.length > 0) {
      console.log('❌ Some tracks already purchased by user:', alreadyOwned);
      return c.json({ error: `Already own: ${alreadyOwned.join(', ')}` }, 400);
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Stoic AF Journal - Complete Bundle',
              description: `All 4 focus areas: ${trackNames.join(', ')}`,
            },
            unit_amount: bundlePrice * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${c.req.header('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/?success=true&bundle=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.req.header('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/?canceled=true`,
      metadata: {
        user_id: user.id,
        is_bundle: 'true',
        bundle_tracks: trackNames.join(','),
      },
    });

    console.log('✅ Bundle checkout session created successfully:', {
      session_id: session.id,
      checkout_url: session.url?.substring(0, 50) + '...',
      user_id: user.id,
      bundle_tracks: trackNames
    });
    
    return c.json({ 
      success: true, 
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('❌ Bundle checkout creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Failed to create bundle checkout: ${errorMessage}` }, 500);
  }
});

// Stripe webhook to handle successful payments
app.post("/make-server-6d6f37b2/payments/webhook", async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header('stripe-signature');
    
    if (!signature) {
      console.log('❌ No Stripe signature header');
      return c.json({ error: 'No signature header' }, 400);
    }

    // Note: In production, you should verify the webhook signature
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    // For now, parse the body directly (less secure but functional)
    const event = JSON.parse(body);
    
    console.log('🔔 Webhook received:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      console.log('💰 Payment completed:', {
        session_id: session.id,
        user_id: session.metadata?.user_id,
        track_name: session.metadata?.track_name,
        is_bundle: session.metadata?.is_bundle
      });

      if (session.metadata?.user_id) {
        const userId = session.metadata.user_id;
        
        // Get current purchases
        const purchases = await kv.get(`purchases:${userId}`) || [];
        
        if (session.metadata.is_bundle === 'true') {
          // Handle bundle purchase
          const bundleTracks = session.metadata.bundle_tracks?.split(',') || [];
          
          // Add tracks not already owned
          const newTracks = bundleTracks.filter(track => !purchases.includes(track));
          const updatedPurchases = [...purchases, ...newTracks];
          
          await kv.set(`purchases:${userId}`, updatedPurchases);
          
          console.log('✅ Bundle purchase processed:', {
            userId,
            newTracks,
            totalTracks: updatedPurchases.length
          });
        } else {
          // Handle single track purchase
          const trackName = session.metadata.track_name;
          
          if (trackName && !purchases.includes(trackName)) {
            purchases.push(trackName);
            await kv.set(`purchases:${userId}`, purchases);
            
            console.log('✅ Track purchase processed:', {
              userId,
              trackName,
              totalTracks: purchases.length
            });
          }
        }
      }
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// Process payment intent after successful payment
app.post("/make-server-6d6f37b2/payments/process-payment-intent", async (c) => {
  try {
    console.log('✅ Processing payment intent request received');
    
    const authHeader = c.req.header('Authorization');
    const user = await getUser(authHeader);
    const { paymentIntentId, trackName } = await c.req.json();
    
    console.log('Process payment intent request:', { userId: user.id, trackName, paymentIntentId });
    
    if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
      return c.json({ error: 'Invalid track name' }, 400);
    }

    if (!paymentIntentId) {
      return c.json({ error: 'Payment intent ID required' }, 400);
    }

    // Verify the payment intent with Stripe
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return c.json({ error: 'Payment not completed' }, 400);
      }

      if (paymentIntent.metadata?.user_id !== user.id || paymentIntent.metadata?.track_name !== trackName) {
        return c.json({ error: 'Payment intent metadata mismatch' }, 400);
      }

      console.log('✅ Stripe payment intent verified:', {
        payment_intent_id: paymentIntentId,
        status: paymentIntent.status,
        amount: paymentIntent.amount
      });

      // Get current purchases
      const purchases = await kv.get(`purchases:${user.id}`) || [];
      console.log('Current user purchases before payment:', purchases);
      
      // Add the track if not already present
      if (!purchases.includes(trackName)) {
        purchases.push(trackName);
        await kv.set(`purchases:${user.id}`, purchases);
        
        // Verify the purchase was saved
        const verifiedPurchases = await kv.get(`purchases:${user.id}`);
        console.log('Verified purchases after payment:', verifiedPurchases);
        
        console.log('✅ Payment processing completed successfully:', {
          userId: user.id,
          trackName,
          totalTracks: verifiedPurchases?.length || 0
        });

        return c.json({
          success: true,
          message: `Successfully purchased ${trackName} track`,
          purchases: verifiedPurchases,
          track: trackName
        });
      } else {
        console.log('Track already owned by user, payment processed');
        return c.json({
          success: true,
          message: `${trackName} track already owned`,
          purchases
        });
      }

    } catch (stripeError) {
      console.error('❌ Stripe payment intent verification failed:', stripeError);
      return c.json({ error: 'Payment verification failed' }, 400);
    }

  } catch (error) {
    console.error('❌ Payment intent processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Payment processing failed: ${errorMessage}` }, 500);
  }
});

// Development endpoint to grant tracks for testing
app.post("/make-server-6d6f37b2/dev/grant-track", async (c) => {
  try {
    console.log('🚀 Dev grant track request received');
    
    const user = await getUser(c.req.header('Authorization'));
    const { trackName } = await c.req.json();
    
    console.log('Dev grant track request:', { userId: user.id, trackName });
    
    if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
      return c.json({ error: 'Invalid track name' }, 400);
    }

    // Get current purchases
    const purchases = await kv.get(`purchases:${user.id}`) || [];
    console.log('Current user purchases:', purchases);
    
    if (purchases.includes(trackName)) {
      console.log('✅ Track already owned by user');
      return c.json({ 
        success: true, 
        message: 'Track already owned',
        purchases 
      });
    }

    // Add track to user's purchases
    purchases.push(trackName);
    await kv.set(`purchases:${user.id}`, purchases);
    
    // Verify the purchase was saved
    const verifiedPurchases = await kv.get(`purchases:${user.id}`);
    console.log('Verified purchases after dev grant:', verifiedPurchases);
    
    console.log('✅ Dev grant completed successfully:', {
      userId: user.id,
      trackName,
      totalTracks: verifiedPurchases?.length || 0
    });

    return c.json({
      success: true,
      message: `Successfully granted ${trackName} track for development`,
      purchases: verifiedPurchases,
      track: trackName
    });

  } catch (error) {
    console.error('❌ Dev grant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Dev grant failed: ${errorMessage}` }, 500);
  }
});

// Admin endpoint to seed track prompts
app.post("/make-server-6d6f37b2/admin/seed-prompts", async (c) => {
  try {
    console.log('🌱 Seeding prompts request received');
    
    const data = await c.req.json();
    
    console.log('Seeding data:', { track_id: data.track_id, days_count: data.days?.length });
    
    if (!data.track_id || !['MONEY', 'RELATIONSHIPS', 'DISCIPLINE', 'EGO'].includes(data.track_id)) {
      return c.json({ error: 'Invalid track_id' }, 400);
    }

    if (!data.days || !Array.isArray(data.days) || data.days.length !== 30) {
      return c.json({ error: 'Days array must contain exactly 30 days' }, 400);
    }

    // Validate each day object
    for (let i = 0; i < data.days.length; i++) {
      const day = data.days[i];
      if (!day.day || !day.daily_theme || !day.stoic_quote || !day.quote_author || 
          !day.bro_translation || !day.todays_challenge || !day.todays_intention ||
          !day.evening_reflection_prompts || !Array.isArray(day.evening_reflection_prompts)) {
        return c.json({ error: `Day ${i + 1} is missing required fields` }, 400);
      }
    }

    // Store in KV
    await kv.set(`prompts:${data.track_id}`, data);
    
    console.log('✅ Prompts seeded successfully for track:', data.track_id);

    return c.json({
      success: true,
      message: `Successfully seeded prompts for ${data.track_id} track`
    });
  } catch (error) {
    console.error('❌ Prompts seeding error:', error);
    return c.json({ error: 'Failed to seed prompts' }, 500);
  }
});

// Track prompts/seed data endpoints - No auth required since these are static track data
app.get("/make-server-6d6f37b2/prompts/:trackName", async (c) => {
  try {
    const trackName = c.req.param('trackName');
    
    console.log('Fetching prompts for track:', { trackName });
    
    if (!trackName || !['MONEY', 'RELATIONSHIPS', 'DISCIPLINE', 'EGO'].includes(trackName.toUpperCase())) {
      return c.json({ error: 'Invalid track name' }, 400);
    }

    // Get track data from KV store
    const trackData = await kv.get(`prompts:${trackName.toUpperCase()}`);
    
    if (!trackData) {
      console.log('No prompts found for track:', trackName);
      return c.json({ error: 'Track prompts not found' }, 404);
    }
    
    console.log('Found prompts for track:', trackName, 'Days:', trackData.days?.length || 0);

    return c.json(trackData);
  } catch (error) {
    console.error('Track prompts fetch error:', error);
    return c.json({ error: 'Failed to fetch track prompts' }, 500);
  }
});

// Track management endpoints
app.post("/make-server-6d6f37b2/journal/start-track", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    const { trackName } = await c.req.json();
    
    console.log('Starting track:', { userId: user.id, trackName });
    
    if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
      return c.json({ error: 'Invalid track name' }, 400);
    }

    // Check if user owns this track
    const purchases = await kv.get(`purchases:${user.id}`) || [];
    if (!purchases.includes(trackName)) {
      return c.json({ error: 'Track not purchased' }, 400);
    }

    // Get current profile
    const profile = await kv.get(`profile:${user.id}`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Update profile to start the track
    const updatedProfile = {
      ...profile,
      current_track: trackName,
      current_day: 1,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`profile:${user.id}`, updatedProfile);
    
    console.log('Track started successfully:', { userId: user.id, trackName });

    return c.json({
      success: true,
      message: `Started ${trackName} track`,
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Track start error:', error);
    return c.json({ error: 'Failed to start track' }, 500);
  }
});

// Journal endpoints
app.get("/make-server-6d6f37b2/journal/entries/:trackName", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    const trackName = c.req.param('trackName');
    
    console.log('Fetching journal entries:', { userId: user.id, trackName });
    
    if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
      return c.json({ error: 'Invalid track name' }, 400);
    }

    // Get entries from KV store
    const entries = await kv.get(`journal:${user.id}:${trackName}`) || [];
    
    console.log('Found journal entries:', entries.length);

    return c.json({
      success: true,
      entries
    });
  } catch (error) {
    console.error('Journal entries fetch error:', error);
    return c.json({ error: 'Failed to fetch journal entries' }, 500);
  }
});

// Start a track (set as active track for user)
app.post("/make-server-6d6f37b2/journal/start-track", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    const { trackName } = await c.req.json();
    
    console.log('Starting track for user:', { userId: user.id, trackName });
    
    if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
      return c.json({ error: 'Invalid track name' }, 400);
    }

    // Verify user owns this track
    const purchases = await kv.get(`purchases:${user.id}`) || [];
    if (!purchases.includes(trackName)) {
      return c.json({ error: 'Track not purchased' }, 403);
    }

    // Get or create user profile
    let profile = await kv.get(`profile:${user.id}`);
    if (!profile) {
      // Create new profile
      profile = {
        current_track: null,
        current_day: 1,
        streak: 0,
        total_days_completed: 0,
        tracks_completed: [],
        onboarding_completed: false
      };
    }

    // Check if track is already completed
    const isCompleted = profile.tracks_completed?.some((completed: any) => {
      return typeof completed === 'string' ? completed === trackName : completed.track === trackName;
    });

    // Set track as active
    profile.current_track = trackName;
    profile.current_day = isCompleted ? 1 : (profile.current_track === trackName ? profile.current_day : 1);

    // Save updated profile
    await kv.set(`profile:${user.id}`, profile);
    
    console.log('✅ Track started successfully:', { 
      userId: user.id, 
      trackName, 
      currentDay: profile.current_day,
      isRestart: isCompleted 
    });

    return c.json({
      success: true,
      message: `Started ${trackName} track`,
      profile,
      currentDay: profile.current_day,
      isRestart: isCompleted
    });
  } catch (error) {
    console.error('Start track error:', error);
    return c.json({ error: 'Failed to start track' }, 500);
  }
});

app.post("/make-server-6d6f37b2/journal/entry", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    const { trackName, day, entryText } = await c.req.json();
    
    console.log('Saving journal entry:', { userId: user.id, trackName, day });
    
    if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
      return c.json({ error: 'Invalid track name' }, 400);
    }

    if (!day || day < 1 || day > 30) {
      return c.json({ error: 'Invalid day number' }, 400);
    }

    if (!entryText || entryText.trim().length === 0) {
      return c.json({ error: 'Entry text is required' }, 400);
    }

    // Get existing entries
    const entries = await kv.get(`journal:${user.id}:${trackName}`) || [];
    
    // Find existing entry for this day
    const existingEntryIndex = entries.findIndex((entry: any) => entry.day === day);
    
    const entryData = {
      day,
      entry_text: entryText.trim(),
      created_at: existingEntryIndex >= 0 ? entries[existingEntryIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingEntryIndex >= 0) {
      // Update existing entry
      entries[existingEntryIndex] = entryData;
    } else {
      // Add new entry
      entries.push(entryData);
    }

    // Save entries back to KV store
    await kv.set(`journal:${user.id}:${trackName}`, entries);
    
    console.log('Journal entry saved successfully');

    return c.json({
      success: true,
      entry: entryData
    });
  } catch (error) {
    console.error('Journal entry save error:', error);
    return c.json({ error: 'Failed to save journal entry' }, 500);
  }
});

app.post("/make-server-6d6f37b2/journal/complete-day", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    const { trackName, day } = await c.req.json();
    
    console.log('Completing day:', { userId: user.id, trackName, day });
    
    if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
      return c.json({ error: 'Invalid track name' }, 400);
    }

    if (!day || day < 1 || day > 30) {
      return c.json({ error: 'Invalid day number' }, 400);
    }

    // Get current profile
    const profile = await kv.get(`profile:${user.id}`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Check if this is the current track and day
    if (profile.current_track !== trackName) {
      return c.json({ error: 'Not the current active track' }, 400);
    }

    if (profile.current_day !== day) {
      return c.json({ error: 'Not the current day' }, 400);
    }

    // Update profile for next day or complete track
    let updatedProfile;
    let trackCompleted = false;
    
    if (day >= 30) {
      // Track completed
      trackCompleted = true;
      const completedTracks = Array.isArray(profile.tracks_completed) ? profile.tracks_completed : [];
      
      // Only add if not already completed
      if (!completedTracks.includes(trackName)) {
        completedTracks.push(trackName);
      }

      updatedProfile = {
        ...profile,
        current_track: null,
        current_day: 0,
        total_days_completed: (profile.total_days_completed || 0) + 1,
        tracks_completed: completedTracks,
        streak: (profile.streak || 0) + 1,
        updated_at: new Date().toISOString()
      };
    } else {
      // Move to next day
      updatedProfile = {
        ...profile,
        current_day: day + 1,
        total_days_completed: (profile.total_days_completed || 0) + 1,
        streak: (profile.streak || 0) + 1,
        updated_at: new Date().toISOString()
      };
    }
    
    await kv.set(`profile:${user.id}`, updatedProfile);
    
    console.log('Day completed successfully');

    return c.json({
      success: true,
      profile: updatedProfile,
      trackCompleted,
      message: day >= 30 ? `🎉 Congratulations! You've completed the ${trackName} track!` : `Day ${day} completed! Ready for day ${day + 1}.`
    });
  } catch (error) {
    console.error('Complete day error:', error);
    return c.json({ error: 'Failed to complete day' }, 500);
  }
});

// Start the server
// Admin Helper Functions
const isAdminUser = async (email: string): Promise<boolean> => {
  // Hardcoded admin emails
  const hardcodedAdmins = [
    'admin@stoicaf.com', 
    'brad@stoicaf.com',
    // Add your email here:
    'your-email@example.com'  // <- Replace this with your actual email address
  ];
  
  if (hardcodedAdmins.includes(email.toLowerCase())) {
    return true;
  }
  
  // Check dynamic admin list from KV store
  try {
    const dynamicAdmins = await kv.get('admin_emails') || [];
    return dynamicAdmins.includes(email.toLowerCase());
  } catch (error) {
    console.error('Error checking dynamic admin list:', error);
    return false;
  }
};

const getAdminUser = async (authorization: string | undefined) => {
  const user = await getUser(authorization);
  const isAdmin = await isAdminUser(user.email!);
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
  return user;
};

// Admin Routes
app.get("/make-server-6d6f37b2/admin/users", async (c) => {
  try {
    await getAdminUser(c.req.header('Authorization'));
    
    console.log('📊 Admin fetching all users');
    
    // Get all profiles from KV store
    const allProfiles = await kv.getByPrefix('profile:');
    const allPurchases = await kv.getByPrefix('purchases:');
    
    // Get users from Supabase
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users from Supabase:', error);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }
    
    // Combine data
    const enrichedUsers = users.users.map(user => {
      const profile = allProfiles.find(p => p.key === `profile:${user.id}`)?.value;
      const purchases = allPurchases.find(p => p.key === `purchases:${user.id}`)?.value || [];
      
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        profile,
        purchases
      };
    });
    
    console.log(`✅ Found ${enrichedUsers.length} users`);
    
    return c.json({
      success: true,
      users: enrichedUsers,
      total: enrichedUsers.length
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

app.post("/make-server-6d6f37b2/admin/grant-access", async (c) => {
  try {
    await getAdminUser(c.req.header('Authorization'));
    
    const { userId, trackNames } = await c.req.json();
    
    console.log('🎁 Admin granting access:', { userId, trackNames });
    
    if (!userId || !trackNames || !Array.isArray(trackNames)) {
      return c.json({ error: 'User ID and track names array required' }, 400);
    }
    
    // Validate track names
    const validTracks = ['Money', 'Relationships', 'Discipline', 'Ego'];
    const invalidTracks = trackNames.filter(track => !validTracks.includes(track));
    
    if (invalidTracks.length > 0) {
      return c.json({ error: `Invalid track names: ${invalidTracks.join(', ')}` }, 400);
    }
    
    // Get current purchases
    const purchases = await kv.get(`purchases:${userId}`) || [];
    
    // Add new tracks
    const newTracks = trackNames.filter(track => !purchases.includes(track));
    const updatedPurchases = [...purchases, ...newTracks];
    
    await kv.set(`purchases:${userId}`, updatedPurchases);
    
    console.log(`✅ Granted ${newTracks.length} new tracks to user ${userId}`);
    
    return c.json({
      success: true,
      message: `Granted access to ${newTracks.length} tracks`,
      addedTracks: newTracks,
      totalTracks: updatedPurchases.length
    });
  } catch (error) {
    console.error('Admin grant access error:', error);
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    return c.json({ error: 'Failed to grant access' }, 500);
  }
});

app.post("/make-server-6d6f37b2/admin/revoke-access", async (c) => {
  try {
    await getAdminUser(c.req.header('Authorization'));
    
    const { userId, trackNames } = await c.req.json();
    
    console.log('🚫 Admin revoking access:', { userId, trackNames });
    
    if (!userId || !trackNames || !Array.isArray(trackNames)) {
      return c.json({ error: 'User ID and track names array required' }, 400);
    }
    
    // Get current purchases
    const purchases = await kv.get(`purchases:${userId}`) || [];
    
    // Remove specified tracks
    const updatedPurchases = purchases.filter(track => !trackNames.includes(track));
    
    await kv.set(`purchases:${userId}`, updatedPurchases);
    
    const removedCount = purchases.length - updatedPurchases.length;
    
    console.log(`✅ Revoked ${removedCount} tracks from user ${userId}`);
    
    return c.json({
      success: true,
      message: `Revoked access to ${removedCount} tracks`,
      removedTracks: trackNames.filter(track => purchases.includes(track)),
      totalTracks: updatedPurchases.length
    });
  } catch (error) {
    console.error('Admin revoke access error:', error);
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    return c.json({ error: 'Failed to revoke access' }, 500);
  }
});

app.post("/make-server-6d6f37b2/admin/generate-code", async (c) => {
  try {
    await getAdminUser(c.req.header('Authorization'));
    
    const { trackNames, expiresInDays = 30, usageLimit = 1 } = await c.req.json();
    
    console.log('🎫 Admin generating access code:', { trackNames, expiresInDays, usageLimit });
    
    if (!trackNames || !Array.isArray(trackNames) || trackNames.length === 0) {
      return c.json({ error: 'Track names array required' }, 400);
    }
    
    // Validate track names
    const validTracks = ['Money', 'Relationships', 'Discipline', 'Ego'];
    const invalidTracks = trackNames.filter(track => !validTracks.includes(track));
    
    if (invalidTracks.length > 0) {
      return c.json({ error: `Invalid track names: ${invalidTracks.join(', ')}` }, 400);
    }
    
    // Generate unique code
    const code = 'STOIC-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const codeData = {
      code,
      trackNames,
      usageLimit,
      usageCount: 0,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      active: true
    };
    
    await kv.set(`access_code:${code}`, codeData);
    
    console.log(`✅ Generated access code: ${code}`);
    
    return c.json({
      success: true,
      accessCode: codeData
    });
  } catch (error) {
    console.error('Admin generate code error:', error);
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    return c.json({ error: 'Failed to generate access code' }, 500);
  }
});

app.post("/make-server-6d6f37b2/admin/redeem-code", async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    const { code } = await c.req.json();
    
    console.log('🎫 User redeeming access code:', { userId: user.id, code });
    
    if (!code) {
      return c.json({ error: 'Access code required' }, 400);
    }
    
    // Get code data
    const codeData = await kv.get(`access_code:${code}`);
    
    if (!codeData) {
      return c.json({ error: 'Invalid access code' }, 400);
    }
    
    // Check if code is active
    if (!codeData.active) {
      return c.json({ error: 'Access code has been deactivated' }, 400);
    }
    
    // Check if code has expired
    if (new Date() > new Date(codeData.expiresAt)) {
      return c.json({ error: 'Access code has expired' }, 400);
    }
    
    // Check usage limit
    if (codeData.usageCount >= codeData.usageLimit) {
      return c.json({ error: 'Access code usage limit reached' }, 400);
    }
    
    // Get current purchases
    const purchases = await kv.get(`purchases:${user.id}`) || [];
    
    // Add new tracks
    const newTracks = codeData.trackNames.filter(track => !purchases.includes(track));
    const updatedPurchases = [...purchases, ...newTracks];
    
    // Update purchases
    await kv.set(`purchases:${user.id}`, updatedPurchases);
    
    // Update code usage
    const updatedCodeData = {
      ...codeData,
      usageCount: codeData.usageCount + 1,
      lastUsedAt: new Date().toISOString(),
      lastUsedBy: user.id
    };
    
    await kv.set(`access_code:${code}`, updatedCodeData);
    
    console.log(`✅ Access code redeemed: ${newTracks.length} new tracks for user ${user.id}`);
    
    return c.json({
      success: true,
      message: `Successfully redeemed access code for ${newTracks.length} tracks`,
      addedTracks: newTracks,
      totalTracks: updatedPurchases.length
    });
  } catch (error) {
    console.error('Code redemption error:', error);
    return c.json({ error: 'Failed to redeem access code' }, 500);
  }
});

app.get("/make-server-6d6f37b2/admin/codes", async (c) => {
  try {
    await getAdminUser(c.req.header('Authorization'));
    
    console.log('📋 Admin fetching all access codes');
    
    // Get all access codes
    const allCodes = await kv.getByPrefix('access_code:');
    
    const codes = allCodes.map(item => item.value);
    
    console.log(`✅ Found ${codes.length} access codes`);
    
    return c.json({
      success: true,
      codes,
      total: codes.length
    });
  } catch (error) {
    console.error('Admin codes fetch error:', error);
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    return c.json({ error: 'Failed to fetch access codes' }, 500);
  }
});

// Bootstrap endpoint - REMOVE AFTER FIRST USE for security
app.post("/make-server-6d6f37b2/admin/bootstrap", async (c) => {
  try {
    const { email, secretKey } = await c.req.json();
    
    // Change this secret key for security
    const BOOTSTRAP_SECRET = "STOIC_ADMIN_SETUP_2024";
    
    if (secretKey !== BOOTSTRAP_SECRET) {
      return c.json({ error: 'Invalid secret key' }, 403);
    }
    
    if (!email) {
      return c.json({ error: 'Email required' }, 400);
    }
    
    // Store the admin email in KV for dynamic admin management
    const currentAdmins = await kv.get('admin_emails') || [];
    if (!currentAdmins.includes(email.toLowerCase())) {
      currentAdmins.push(email.toLowerCase());
      await kv.set('admin_emails', currentAdmins);
    }
    
    console.log(`✅ Bootstrap: Added admin email: ${email}`);
    
    return c.json({
      success: true,
      message: `${email} has been granted admin access`,
      note: 'IMPORTANT: Remove this bootstrap endpoint after use!'
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    return c.json({ error: 'Bootstrap failed' }, 500);
  }
});

// Process bundle purchase after successful Stripe checkout
app.post("/make-server-6d6f37b2/payments/process-bundle-purchase", async (c) => {
  try {
    console.log('✅ Processing bundle purchase request received');
    
    const authHeader = c.req.header('Authorization');
    const user = await getUser(authHeader);
    const { sessionId } = await c.req.json();
    
    console.log('Process bundle purchase request:', { userId: user.id, sessionId });
    
    if (!sessionId) {
      return c.json({ error: 'Session ID required' }, 400);
    }

    // Verify the session with Stripe
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return c.json({ error: 'Payment not completed' }, 400);
      }

      if (session.metadata?.user_id !== user.id) {
        return c.json({ error: 'Session user mismatch' }, 400);
      }

      console.log('✅ Stripe session verified:', {
        session_id: sessionId,
        status: session.payment_status,
        amount: session.amount_total
      });

      // Get current purchases
      const purchases = await kv.get(`purchases:${user.id}`) || [];
      console.log('Current user purchases before bundle purchase:', purchases);
      
      // Get bundle tracks from metadata
      const bundleTracks = session.metadata?.bundle_tracks?.split(',') || [];
      
      // Add tracks not already owned
      const newTracks = bundleTracks.filter(track => !purchases.includes(track));
      const updatedPurchases = [...purchases, ...newTracks];
      
      await kv.set(`purchases:${user.id}`, updatedPurchases);
      
      // Verify the purchases were saved
      const verifiedPurchases = await kv.get(`purchases:${user.id}`);
      console.log('Verified purchases after bundle purchase:', verifiedPurchases);
      
      console.log('✅ Bundle purchase processing completed successfully:', {
        userId: user.id,
        newTracks,
        totalTracks: verifiedPurchases?.length || 0
      });

      return c.json({
        success: true,
        message: `Successfully purchased bundle with ${newTracks.length} tracks`,
        addedTracks: newTracks,
        purchases: verifiedPurchases
      });

    } catch (stripeError) {
      console.error('❌ Stripe session verification failed:', stripeError);
      return c.json({ error: 'Payment verification failed' }, 400);
    }

  } catch (error) {
    console.error('❌ Bundle purchase processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Bundle purchase processing failed: ${errorMessage}` }, 500);
  }
});

// Process direct purchase after successful Stripe checkout  
app.post("/make-server-6d6f37b2/payments/direct-purchase", async (c) => {
  try {
    console.log('✅ Processing direct purchase request received');
    
    const authHeader = c.req.header('Authorization');
    const user = await getUser(authHeader);
    const { trackName, sessionId } = await c.req.json();
    
    console.log('Process direct purchase request:', { userId: user.id, trackName, sessionId });
    
    if (!trackName || !['Money', 'Relationships', 'Discipline', 'Ego'].includes(trackName)) {
      return c.json({ error: 'Invalid track name' }, 400);
    }

    if (!sessionId) {
      return c.json({ error: 'Session ID required' }, 400);
    }

    // Verify the session with Stripe
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return c.json({ error: 'Payment not completed' }, 400);
      }

      if (session.metadata?.user_id !== user.id || session.metadata?.track_name !== trackName) {
        return c.json({ error: 'Session metadata mismatch' }, 400);
      }

      console.log('✅ Stripe session verified:', {
        session_id: sessionId,
        status: session.payment_status,
        amount: session.amount_total
      });

      // Get current purchases
      const purchases = await kv.get(`purchases:${user.id}`) || [];
      console.log('Current user purchases before purchase:', purchases);
      
      // Add the track if not already present
      if (!purchases.includes(trackName)) {
        purchases.push(trackName);
        await kv.set(`purchases:${user.id}`, purchases);
        
        // Verify the purchase was saved
        const verifiedPurchases = await kv.get(`purchases:${user.id}`);
        console.log('Verified purchases after purchase:', verifiedPurchases);
        
        console.log('✅ Direct purchase processing completed successfully:', {
          userId: user.id,
          trackName,
          totalTracks: verifiedPurchases?.length || 0
        });

        return c.json({
          success: true,
          message: `Successfully purchased ${trackName} track`,
          purchases: verifiedPurchases,
          track: trackName
        });
      } else {
        console.log('Track already owned by user, payment processed');
        return c.json({
          success: true,
          message: `${trackName} track already owned`,
          purchases
        });
      }

    } catch (stripeError) {
      console.error('❌ Stripe session verification failed:', stripeError);
      return c.json({ error: 'Payment verification failed' }, 400);
    }

  } catch (error) {
    console.error('❌ Direct purchase processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Direct purchase processing failed: ${errorMessage}` }, 500);
  }
});

Deno.serve(app.fetch);