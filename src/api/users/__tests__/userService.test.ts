/**
 * User Service Tests - Comprehensive test suite for CRUD operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from '../userService';
import { supabase } from '../../../utils/supabase/client';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserFilters,
  User,
} from '../types';

// Mock Supabase client
vi.mock('../../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
      admin: {
        deleteUser: vi.fn(),
      },
    },
    from: vi.fn(),
  },
}));

describe('UserService', () => {
  // Sample test data
  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    full_name: 'Test User',
    avatar_url: null,
    bio: 'Test bio',
    phone_number: '+1234567890',
    date_of_birth: '1990-01-01',
    gender: 'male',
    location: 'Test City',
    website: 'https://example.com',
    is_active: true,
    is_verified: false,
    role: 'user',
    preferences: {},
    metadata: {},
    last_login_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockCreateUserDTO: CreateUserDTO = {
    email: 'newuser@example.com',
    password: 'SecurePass123!',
    username: 'newuser',
    full_name: 'New User',
    phone_number: '+1234567890',
    date_of_birth: '1995-05-05',
    gender: 'female',
    location: 'New York',
    website: 'https://newuser.com',
    bio: 'New user bio',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Mock auth signup
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email!,
            created_at: mockUser.created_at,
          },
          session: null,
        },
        error: null,
      } as any);

      // Mock profile update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const result = await UserService.createUser(mockCreateUserDTO);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockCreateUserDTO.email,
          password: mockCreateUserDTO.password,
        })
      );
    });

    it('should return error for invalid email', async () => {
      const invalidData = { ...mockCreateUserDTO, email: 'invalid-email' };
      const result = await UserService.createUser(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should return error for weak password', async () => {
      const invalidData = { ...mockCreateUserDTO, password: 'weak' };
      const result = await UserService.createUser(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should handle auth signup failure', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email already exists' },
      } as any);

      const result = await UserService.createUser(mockCreateUserDTO);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email already exists');
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await UserService.getUserById(mockUser.id);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockEq).toHaveBeenCalledWith('id', mockUser.id);
    });

    it('should return error for non-existent user', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await UserService.getUserById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('updateUser', () => {
    it('should update user profile successfully', async () => {
      const updateData: UpdateUserDTO = {
        full_name: 'Updated Name',
        bio: 'Updated bio',
      };

      // Mock username check (not taken)
      const mockSelectUsername = vi.fn().mockReturnThis();
      const mockEqUsername = vi.fn().mockReturnThis();
      const mockSingleUsername = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock update operation
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { ...mockUser, ...updateData },
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
          select: mockSelect,
          single: mockSingle,
        } as any);

      const result = await UserService.updateUser(mockUser.id, updateData);

      expect(result.success).toBe(true);
      expect(result.data?.full_name).toBe(updateData.full_name);
      expect(result.data?.bio).toBe(updateData.bio);
    });

    it('should prevent duplicate username', async () => {
      const updateData: UpdateUserDTO = {
        username: 'existinguser',
      };

      // Mock username check (already taken)
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { id: 'different-user-id' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await UserService.updateUser(mockUser.id, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Username already taken');
    });

    it('should reject empty update data', async () => {
      const result = await UserService.updateUser(mockUser.id, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
        eq: mockEq,
      } as any);

      const result = await UserService.deleteUser(mockUser.id);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    });
  });

  describe('listUsers', () => {
    it('should list users with default filters', async () => {
      const mockUsers = [mockUser];
      const filters: UserFilters = {};

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValueOnce({
        data: mockUsers,
        error: null,
        count: 1,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      } as any);

      const result = await UserService.listUsers(filters);

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockUsers);
      expect(result.data?.total).toBe(1);
      expect(result.data?.page).toBe(1);
    });

    it('should apply search filter correctly', async () => {
      const filters: UserFilters = {
        search: 'test',
        limit: 10,
        offset: 0,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValueOnce({
        data: [mockUser],
        error: null,
        count: 1,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
        range: mockRange,
      } as any);

      const result = await UserService.listUsers(filters);

      expect(result.success).toBe(true);
      expect(mockOr).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      const filters: UserFilters = {
        limit: 5,
        offset: 10,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValueOnce({
        data: [],
        error: null,
        count: 50,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      } as any);

      const result = await UserService.listUsers(filters);

      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(3); // offset 10, limit 5 = page 3
      expect(result.data?.total_pages).toBe(10); // 50 total, limit 5 = 10 pages
      expect(result.data?.has_next).toBe(true);
      expect(result.data?.has_previous).toBe(true);
    });
  });

  describe('updateEmail', () => {
    it('should update email successfully', async () => {
      const updateData = {
        new_email: 'newemail@example.com',
        password: 'CurrentPass123!',
      };

      // Mock current user
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      } as any);

      // Mock email update
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      } as any);

      // Mock database update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: mockUpdate,
        eq: mockEq,
      } as any);

      const result = await UserService.updateEmail(mockUser.id, updateData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Email update initiated');
    });

    it('should prevent unauthorized email update', async () => {
      const updateData = {
        new_email: 'newemail@example.com',
        password: 'CurrentPass123!',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: {
            id: 'different-user-id',
            email: 'other@example.com',
          },
        },
        error: null,
      } as any);

      const result = await UserService.updateEmail(mockUser.id, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const updateData = {
        current_password: 'CurrentPass123!',
        new_password: 'NewSecurePass456!',
        confirm_password: 'NewSecurePass456!',
      };

      // Mock current user
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      } as any);

      // Mock password update
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      } as any);

      const result = await UserService.updatePassword(mockUser.id, updateData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password updated successfully');
    });

    it('should reject mismatched passwords', async () => {
      const updateData = {
        current_password: 'CurrentPass123!',
        new_password: 'NewSecurePass456!',
        confirm_password: 'DifferentPass789!',
      };

      const result = await UserService.updatePassword(mockUser.id, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current authenticated user', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      } as any);

      // Mock user data fetch
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await UserService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should return error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      } as any);

      const result = await UserService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated');
    });
  });
});