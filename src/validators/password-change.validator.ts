import { z } from 'zod';

/**
 * Password Change Validation Schema
 * For POST /api/v2/users/me/password endpoint
 *
 * Requirements:
 * - Current password is required (for verification)
 * - New password must meet complexity requirements
 * - Confirmation must match new password
 */

export const passwordChangeSchema = z.object({
  body: z.object({
    currentPassword: z
      .string({
        required_error: 'Current password is required'
      })
      .min(1, 'Current password is required'),

    newPassword: z
      .string({
        required_error: 'New password is required'
      })
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password must not exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'New password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),

    confirmPassword: z
      .string({
        required_error: 'Password confirmation is required'
      })
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }).refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword']
  })
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>['body'];
