/**
 * User input validation schemas
 */

import { z } from 'zod';

// Email validation
const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character');

// Username validation
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
  .toLowerCase()
  .trim()
  .optional()
  .nullable();

// Phone number validation (basic international format)
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .nullable();

// URL validation
const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(255, 'URL must be less than 255 characters')
  .optional()
  .nullable();

// Date validation
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed <= new Date();
  }, 'Invalid date or date is in the future')
  .optional()
  .nullable();

// Gender validation
const genderSchema = z
  .enum(['male', 'female', 'other', 'prefer_not_to_say'])
  .optional()
  .nullable();

// Create user validation schema
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  full_name: z
    .string()
    .min(1, 'Full name must be at least 1 character')
    .max(100, 'Full name must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
  phone_number: phoneSchema,
  date_of_birth: dateSchema,
  gender: genderSchema,
  location: z
    .string()
    .max(255, 'Location must be less than 255 characters')
    .trim()
    .optional()
    .nullable(),
  website: urlSchema,
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
});

// Update user validation schema
export const updateUserSchema = z.object({
  username: usernameSchema,
  full_name: z
    .string()
    .min(1, 'Full name must be at least 1 character')
    .max(100, 'Full name must be less than 100 characters')
    .trim()
    .optional(),
  avatar_url: urlSchema,
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .trim()
    .optional(),
  phone_number: phoneSchema,
  date_of_birth: dateSchema,
  gender: genderSchema,
  location: z
    .string()
    .max(255, 'Location must be less than 255 characters')
    .trim()
    .optional(),
  website: urlSchema,
  preferences: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// User filters validation schema
export const userFiltersSchema = z.object({
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  search: z.string().min(1).max(100).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  order_by: z
    .enum(['created_at', 'updated_at', 'email', 'username'])
    .default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Email update validation schema
export const updateEmailSchema = z.object({
  new_email: emailSchema,
  password: passwordSchema,
});

// Password update validation schema
export const updatePasswordSchema = z.object({
  current_password: passwordSchema,
  new_password: passwordSchema,
  confirm_password: passwordSchema,
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

// Validate input helper function
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { success: false, errors };
    }
    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Validation failed' }],
    };
  }
}

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

interface ValidationError {
  field: string;
  message: string;
}