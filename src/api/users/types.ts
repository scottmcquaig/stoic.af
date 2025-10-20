/**
 * User-related type definitions
 */

export interface User {
  id: string;
  email: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  location?: string | null;
  website?: string | null;
  is_active: boolean;
  is_verified: boolean;
  role: 'user' | 'admin' | 'moderator';
  preferences: Record<string, any>;
  metadata: Record<string, any>;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  username?: string;
  full_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location?: string;
  website?: string;
  bio?: string;
}

export interface UpdateUserDTO {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location?: string;
  website?: string;
  preferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UserFilters {
  is_active?: boolean;
  is_verified?: boolean;
  role?: 'user' | 'admin' | 'moderator';
  search?: string;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'updated_at' | 'email' | 'username';
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ValidationError[];
}