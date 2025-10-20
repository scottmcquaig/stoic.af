import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';



interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

interface UserProfile {
  current_track: string | null;
  current_day: number;
  streak: number;
  total_days_completed: number;
  tracks_completed: Array<{
    track: string;
    completed_at: string;
    days_completed: number;
  }>;
  onboarding_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  try {
    const context = useContext(AuthContext);
    if (context === undefined) {
      console.error('useAuth must be used within an AuthProvider');
      // Return a safe fallback instead of throwing
      return {
        user: null,
        profile: null,
        loading: false,
        signIn: async () => ({ success: false, error: 'Authentication not available' }),
        signUp: async () => ({ success: false, error: 'Authentication not available' }),
        signOut: async () => {},
        refreshProfile: async () => {},
      };
    }
    return context;
  } catch (error) {
    console.error('Error in useAuth hook:', error);
    // Return safe fallback
    return {
      user: null,
      profile: null,
      loading: false,
      signIn: async () => ({ success: false, error: 'Authentication error' }),
      signUp: async () => ({ success: false, error: 'Authentication error' }),
      signOut: async () => {},
      refreshProfile: async () => {},
    };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const apiCall = async (url: string, options: RequestInit = {}) => {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      // If no access token and this is a protected endpoint, return an error
      const isProtectedEndpoint = url.includes('/journal/') || url.includes('/purchases') || url.includes('/user/');
      if (!accessToken && isProtectedEndpoint) {
        throw new Error('Authentication required for this operation');
      }
      
      const finalToken = accessToken || publicAnonKey;

      console.log('Making API call to:', url);

      const response = await fetch(`${supabaseUrl}/functions/v1${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalToken}`,
          ...options.headers,
        },
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `Network error - HTTP ${response.status}` 
        }));
        
        // Don't log "email already exists" as an error since it's expected behavior
        const isEmailExistsError = errorData.code === 'email_exists' || 
                                  errorData.error?.includes('already exists') ||
                                  errorData.error?.includes('already been registered');
        
        if (isEmailExistsError) {
          console.log('📧 Email already registered - this is expected behavior for existing users');
        } else {
          console.error('API error response:', errorData);
        }
        
        const error = new Error(errorData.error || `HTTP ${response.status}`);
        if (errorData.code) {
          (error as any).code = errorData.code;
        }
        throw error;
      }

      const data = await response.json();
      console.log('API response data received');
      return data;
    } catch (fetchError) {
      // Don't log "email already exists" errors since they're expected
      const isEmailExistsError = fetchError instanceof Error && (
        (fetchError as any).code === 'email_exists' || 
        fetchError.message.includes('already exists') ||
        fetchError.message.includes('already been registered')
      );
      
      if (isEmailExistsError) {
        console.log('📧 Handling existing email case gracefully');
      } else {
        console.error('API call failed:', fetchError);
      }
      
      // Check if it's a network error
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      
      throw fetchError;
    }
  };

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile...');
      const data = await apiCall('/make-server-6d6f37b2/user/profile');
      
      if (data?.user) {
        setUser(data.user);
      }
      if (data?.profile) {
        setProfile(data.profile);
      }
      console.log('Profile loaded successfully');
    } catch (error) {
      console.warn('Profile fetch error:', error);
      // Gracefully handle profile fetch errors
      setProfile(null);
      
      // Don't crash the app, just log and continue
      if (error instanceof Error) {
        console.warn('Profile fetch failed with message:', error.message);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Supabase auth error:', error);
        
        // Transform Supabase error messages to be more user-friendly
        let userFriendlyMessage = error.message;
        
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('Invalid email or password') ||
            error.message.includes('Email not confirmed') ||
            error.message.includes('Invalid credentials')) {
          userFriendlyMessage = 'Email or password incorrect. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          userFriendlyMessage = 'Please verify your email address before signing in.';
        } else if (error.message.includes('Too many requests')) {
          userFriendlyMessage = 'Too many login attempts. Please wait a few minutes and try again.';
        } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
          userFriendlyMessage = 'Connection error. Please check your internet connection.';
        }
        
        return { success: false, error: userFriendlyMessage };
      }

      console.log('Sign in successful, fetching profile...');
      await fetchProfile();
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Handle network errors and other unexpected errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('Network')) {
        return { success: false, error: 'Connection error. Please check your internet connection and try again.' };
      }
      
      return { success: false, error: 'Unable to sign in. Please try again.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Starting signup process for:', email);
      
      const response = await apiCall('/make-server-6d6f37b2/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      });

      console.log('Signup API response received:', response);

      // After successful signup, sign in the user
      console.log('Attempting to sign in after successful signup...');
      const signInResult = await signIn(email, password);
      if (!signInResult.success) {
        console.error('Sign in after signup failed:', signInResult.error);
        return { success: false, error: 'Account created but sign in failed' };
      }

      console.log('Signup and sign in completed successfully');
      return { success: true };
    } catch (error) {
      // Handle email already exists case gracefully
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      const isEmailExistsError = errorMessage.includes('already exists') ||
                                errorMessage.includes('already been registered') ||
                                (error as any)?.code === 'email_exists';
      
      if (isEmailExistsError) {
        console.log('📧 Signup attempted with existing email - returning appropriate response');
      } else {
        console.error('Sign up error:', error);
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    // Check if user is still authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile();
    }
  };

  useEffect(() => {
    let mounted = true;
    let subscription: any = null;

    // Start app immediately - no loading state
    console.log('Starting non-blocking auth initialization...');
    setLoading(false); // App loads immediately
    setUser(null);
    setProfile(null);

    // Check auth in background
    const checkAuthInBackground = async () => {
      try {
        console.log('Checking auth in background...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.warn('Background auth check error:', error);
        } else if (session?.user) {
          console.log('Background auth found user:', session.user.id);
          setUser(session.user);
          // Fetch profile asynchronously
          fetchProfile().catch(console.warn);
          
          // Optional: Show a subtle notification that user is authenticated
          // (Only import toast if needed to avoid errors)
          // Removed welcome back notification as requested
        }
      } catch (error) {
        console.warn('Background auth check failed:', error);
        // Silently fail - app continues to work
      }
    };

    // Set up auth listener first
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;
          
          console.log('Auth state changed:', event);
          
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('User signed in via auth state change');
            setUser(session.user);
            fetchProfile().catch(console.warn);
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out via auth state change');
            setUser(null);
            setProfile(null);
          }
        }
      );
      subscription = data.subscription;
    } catch (error) {
      console.warn('Failed to set up auth listener:', error);
    }

    // Start background auth check after a short delay
    const timeoutId = setTimeout(() => {
      if (mounted) {
        checkAuthInBackground();
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.warn('Error cleaning up auth subscription:', error);
        }
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};