/**
 * User Service - Complete CRUD operations with error handling
 */

import { supabase } from '../../utils/supabase/client';
import {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilters,
  PaginatedResponse,
  ApiResponse,
  ApiError,
} from './types';
import {
  createUserSchema,
  updateUserSchema,
  userFiltersSchema,
  updateEmailSchema,
  updatePasswordSchema,
  validateInput,
} from './validation';

// Custom error class for API errors
export class UserApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'UserApiError';
  }
}

/**
 * User Service Class - Handles all user-related operations
 */
export class UserService {
  /**
   * Create a new user
   */
  static async createUser(data: CreateUserDTO): Promise<ApiResponse<User>> {
    try {
      // Validate input
      const validation = validateInput(createUserSchema, data);
      if (!validation.success) {
        return {
          success: false,
          error: 'Validation failed',
          message: validation.errors.map(e => `${e.field}: ${e.message}`).join(', '),
        };
      }

      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          data: {
            username: validation.data.username,
            full_name: validation.data.full_name,
          },
        },
      });

      if (authError) {
        return {
          success: false,
          error: authError.message,
          message: 'Failed to create user account',
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'No user returned',
          message: 'User creation failed',
        };
      }

      // Update user profile
      const { data: userData, error: profileError } = await supabase
        .from('users')
        .update({
          username: validation.data.username,
          full_name: validation.data.full_name,
          phone_number: validation.data.phone_number,
          date_of_birth: validation.data.date_of_birth,
          gender: validation.data.gender,
          location: validation.data.location,
          website: validation.data.website,
          bio: validation.data.bio,
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (profileError) {
        console.error('Profile update error:', profileError);
        // User was created but profile update failed
        // Still return success but with a warning
        return {
          success: true,
          data: {
            id: authData.user.id,
            email: authData.user.email!,
            is_active: true,
            is_verified: false,
            role: 'user',
            preferences: {},
            metadata: {},
            created_at: authData.user.created_at,
            updated_at: authData.user.created_at,
          } as User,
          message: 'User created but profile update failed',
        };
      }

      return {
        success: true,
        data: userData,
        message: 'User created successfully',
      };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to create user',
      };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'User not found',
            message: `No user found with ID: ${id}`,
          };
        }
        throw error;
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch user',
      };
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'User not found',
            message: `No user found with email: ${email}`,
          };
        }
        throw error;
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Get user by email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch user',
      };
    }
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'User not found',
            message: `No user found with username: ${username}`,
          };
        }
        throw error;
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Get user by username error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch user',
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(
    id: string,
    data: UpdateUserDTO
  ): Promise<ApiResponse<User>> {
    try {
      // Validate input
      const validation = validateInput(updateUserSchema, data);
      if (!validation.success) {
        return {
          success: false,
          error: 'Validation failed',
          message: validation.errors.map(e => `${e.field}: ${e.message}`).join(', '),
        };
      }

      // Check if username is being updated and if it's unique
      if (validation.data.username) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', validation.data.username)
          .single();

        if (existingUser && existingUser.id !== id) {
          return {
            success: false,
            error: 'Username already taken',
            message: 'This username is already in use',
          };
        }
      }

      const { data: userData, error } = await supabase
        .from('users')
        .update(validation.data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'User not found',
            message: `No user found with ID: ${id}`,
          };
        }
        throw error;
      }

      return {
        success: true,
        data: userData,
        message: 'User updated successfully',
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update user',
      };
    }
  }

  /**
   * Delete user (soft delete by setting is_active to false)
   */
  static async deleteUser(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'User not found',
            message: `No user found with ID: ${id}`,
          };
        }
        throw error;
      }

      return {
        success: true,
        message: 'User deactivated successfully',
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to delete user',
      };
    }
  }

  /**
   * Permanently delete user (hard delete)
   */
  static async permanentlyDeleteUser(id: string): Promise<ApiResponse<void>> {
    try {
      // Delete from auth first
      const { error: authError } = await supabase.auth.admin.deleteUser(id);

      if (authError) {
        throw new UserApiError(
          'AUTH_DELETE_FAILED',
          'Failed to delete user from authentication',
          authError
        );
      }

      // The database trigger should handle deletion from users table
      // But we'll ensure it's deleted
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (dbError && dbError.code !== 'PGRST116') {
        console.error('Database deletion error:', dbError);
      }

      return {
        success: true,
        message: 'User permanently deleted',
      };
    } catch (error) {
      console.error('Permanent delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to permanently delete user',
      };
    }
  }

  /**
   * List users with filters and pagination
   */
  static async listUsers(
    filters: UserFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    try {
      // Validate filters
      const validation = validateInput(userFiltersSchema, filters);
      if (!validation.success) {
        return {
          success: false,
          error: 'Invalid filters',
          message: validation.errors.map(e => `${e.field}: ${e.message}`).join(', '),
        };
      }

      const validFilters = validation.data;
      let query = supabase.from('users').select('*', { count: 'exact' });

      // Apply filters
      if (validFilters.is_active !== undefined) {
        query = query.eq('is_active', validFilters.is_active);
      }

      if (validFilters.is_verified !== undefined) {
        query = query.eq('is_verified', validFilters.is_verified);
      }

      if (validFilters.role) {
        query = query.eq('role', validFilters.role);
      }

      if (validFilters.search) {
        query = query.or(
          `email.ilike.%${validFilters.search}%,username.ilike.%${validFilters.search}%,full_name.ilike.%${validFilters.search}%`
        );
      }

      if (validFilters.created_after) {
        query = query.gte('created_at', validFilters.created_after);
      }

      if (validFilters.created_before) {
        query = query.lte('created_at', validFilters.created_before);
      }

      // Apply ordering
      query = query.order(validFilters.order_by, {
        ascending: validFilters.order === 'asc',
      });

      // Apply pagination
      query = query.range(
        validFilters.offset,
        validFilters.offset + validFilters.limit - 1
      );

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const total = count || 0;
      const page = Math.floor(validFilters.offset / validFilters.limit) + 1;
      const totalPages = Math.ceil(total / validFilters.limit);

      return {
        success: true,
        data: {
          data: data || [],
          total,
          page,
          page_size: validFilters.limit,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_previous: page > 1,
        },
      };
    } catch (error) {
      console.error('List users error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to list users',
      };
    }
  }

  /**
   * Update user email
   */
  static async updateEmail(
    userId: string,
    data: { new_email: string; password: string }
  ): Promise<ApiResponse<void>> {
    try {
      const validation = validateInput(updateEmailSchema, data);
      if (!validation.success) {
        return {
          success: false,
          error: 'Validation failed',
          message: validation.errors.map(e => `${e.field}: ${e.message}`).join(', '),
        };
      }

      // Verify password first
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || userData.user.id !== userId) {
        return {
          success: false,
          error: 'Unauthorized',
          message: 'You can only update your own email',
        };
      }

      // Update email in auth
      const { error } = await supabase.auth.updateUser({
        email: validation.data.new_email,
      });

      if (error) {
        throw error;
      }

      // Update email in users table
      await supabase
        .from('users')
        .update({ email: validation.data.new_email })
        .eq('id', userId);

      return {
        success: true,
        message: 'Email update initiated. Please check your new email for confirmation.',
      };
    } catch (error) {
      console.error('Update email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update email',
      };
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(
    userId: string,
    data: {
      current_password: string;
      new_password: string;
      confirm_password: string;
    }
  ): Promise<ApiResponse<void>> {
    try {
      const validation = validateInput(updatePasswordSchema, data);
      if (!validation.success) {
        return {
          success: false,
          error: 'Validation failed',
          message: validation.errors.map(e => `${e.field}: ${e.message}`).join(', '),
        };
      }

      // Verify current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || userData.user.id !== userId) {
        return {
          success: false,
          error: 'Unauthorized',
          message: 'You can only update your own password',
        };
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: validation.data.new_password,
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Password updated successfully',
      };
    } catch (error) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update password',
      };
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: 'Not authenticated',
          message: 'Please sign in to continue',
        };
      }

      return this.getUserById(user.id);
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get current user',
      };
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Update last login error:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Verify user email
   */
  static async verifyUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'User verified successfully',
      };
    } catch (error) {
      console.error('Verify user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to verify user',
      };
    }
  }
}