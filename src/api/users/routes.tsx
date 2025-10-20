/**
 * User API Routes - REST endpoints for user operations
 */

import React from 'react';
import { UserService } from './userService';
import { CreateUserDTO, UpdateUserDTO, UserFilters } from './types';

// API Route handlers for integration with React Router or Express

export const userRoutes = {
  /**
   * POST /api/users - Create new user
   */
  createUser: async (req: Request) => {
    const body: CreateUserDTO = await req.json();
    return UserService.createUser(body);
  },

  /**
   * GET /api/users/:id - Get user by ID
   */
  getUserById: async (id: string) => {
    return UserService.getUserById(id);
  },

  /**
   * GET /api/users/email/:email - Get user by email
   */
  getUserByEmail: async (email: string) => {
    return UserService.getUserByEmail(email);
  },

  /**
   * GET /api/users/username/:username - Get user by username
   */
  getUserByUsername: async (username: string) => {
    return UserService.getUserByUsername(username);
  },

  /**
   * PUT /api/users/:id - Update user
   */
  updateUser: async (id: string, req: Request) => {
    const body: UpdateUserDTO = await req.json();
    return UserService.updateUser(id, body);
  },

  /**
   * DELETE /api/users/:id - Soft delete user
   */
  deleteUser: async (id: string) => {
    return UserService.deleteUser(id);
  },

  /**
   * DELETE /api/users/:id/permanent - Hard delete user
   */
  permanentlyDeleteUser: async (id: string) => {
    return UserService.permanentlyDeleteUser(id);
  },

  /**
   * GET /api/users - List users with filters
   */
  listUsers: async (req: Request) => {
    const url = new URL(req.url);
    const filters: UserFilters = {
      is_active: url.searchParams.get('is_active') === 'true' ? true :
                 url.searchParams.get('is_active') === 'false' ? false : undefined,
      is_verified: url.searchParams.get('is_verified') === 'true' ? true :
                   url.searchParams.get('is_verified') === 'false' ? false : undefined,
      role: url.searchParams.get('role') as any,
      search: url.searchParams.get('search') || undefined,
      created_after: url.searchParams.get('created_after') || undefined,
      created_before: url.searchParams.get('created_before') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '20'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
      order_by: url.searchParams.get('order_by') as any || 'created_at',
      order: url.searchParams.get('order') as any || 'desc',
    };
    return UserService.listUsers(filters);
  },

  /**
   * PUT /api/users/:id/email - Update user email
   */
  updateEmail: async (id: string, req: Request) => {
    const body = await req.json();
    return UserService.updateEmail(id, body);
  },

  /**
   * PUT /api/users/:id/password - Update user password
   */
  updatePassword: async (id: string, req: Request) => {
    const body = await req.json();
    return UserService.updatePassword(id, body);
  },

  /**
   * GET /api/users/me - Get current user
   */
  getCurrentUser: async () => {
    return UserService.getCurrentUser();
  },

  /**
   * PUT /api/users/:id/verify - Verify user
   */
  verifyUser: async (id: string) => {
    return UserService.verifyUser(id);
  },
};

/**
 * React Hook for User API
 */
export const useUserApi = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const callApi = React.useCallback(async <T,>(
    apiCall: Promise<any>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall;
      if (result.success) {
        return result.data;
      } else {
        setError(result.error || 'Operation failed');
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,

    // User operations
    createUser: React.useCallback(
      (data: CreateUserDTO) => callApi(UserService.createUser(data)),
      [callApi]
    ),

    getUserById: React.useCallback(
      (id: string) => callApi(UserService.getUserById(id)),
      [callApi]
    ),

    getUserByEmail: React.useCallback(
      (email: string) => callApi(UserService.getUserByEmail(email)),
      [callApi]
    ),

    getUserByUsername: React.useCallback(
      (username: string) => callApi(UserService.getUserByUsername(username)),
      [callApi]
    ),

    updateUser: React.useCallback(
      (id: string, data: UpdateUserDTO) => callApi(UserService.updateUser(id, data)),
      [callApi]
    ),

    deleteUser: React.useCallback(
      (id: string) => callApi(UserService.deleteUser(id)),
      [callApi]
    ),

    permanentlyDeleteUser: React.useCallback(
      (id: string) => callApi(UserService.permanentlyDeleteUser(id)),
      [callApi]
    ),

    listUsers: React.useCallback(
      (filters?: UserFilters) => callApi(UserService.listUsers(filters)),
      [callApi]
    ),

    updateEmail: React.useCallback(
      (id: string, data: { new_email: string; password: string }) =>
        callApi(UserService.updateEmail(id, data)),
      [callApi]
    ),

    updatePassword: React.useCallback(
      (id: string, data: { current_password: string; new_password: string; confirm_password: string }) =>
        callApi(UserService.updatePassword(id, data)),
      [callApi]
    ),

    getCurrentUser: React.useCallback(
      () => callApi(UserService.getCurrentUser()),
      [callApi]
    ),

    verifyUser: React.useCallback(
      (id: string) => callApi(UserService.verifyUser(id)),
      [callApi]
    ),
  };
};