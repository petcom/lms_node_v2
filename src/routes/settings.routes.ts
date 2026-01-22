import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { requireEscalation } from '@/middlewares/requireEscalation';
import { requireAdminRole } from '@/middlewares/requireAdminRole';
import * as settingsController from '@/controllers/system/settings.controller';

const router = Router();

/**
 * Settings Routes
 * Base path: /api/v2/settings
 *
 * All routes require authentication
 * Comprehensive system settings and configuration management
 *
 * Authorization:
 * - Public settings: All authenticated users can read
 * - Private settings: Instructors can read (read-only), admins can read and write
 * - Write operations: Only department-admin and system-admin
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/settings
 * List all settings with filtering
 * Query params:
 *   - category: string (optional) - general|authentication|enrollment|notifications|security|features|branding
 *   - includePrivate: boolean (optional) - Include private settings (admin only)
 *   - departmentId: ObjectId (optional) - Get department-specific overrides
 * Access Rights: None (public) OR system:department-settings:manage (private, read-only for instructors)
 * Roles: All authenticated (public), instructor/department-admin/system-admin (private)
 */
router.get('/', settingsController.getAllSettings);

/**
 * GET /api/v2/settings/categories/:category
 * Get all settings in a specific category
 * Params:
 *   - category: string (required) - general|authentication|enrollment|notifications|security|features|branding
 * Query params:
 *   - includePrivate: boolean (optional) - Include private settings (admin only)
 *   - departmentId: ObjectId (optional) - Include department-specific overrides
 * Access Rights: None (public) OR system:department-settings:manage (private, read-only for instructors)
 * Roles: All authenticated (public), instructor/department-admin/system-admin (private)
 */
router.get('/categories/:category', settingsController.getSettingsByCategory);

/**
 * GET /api/v2/settings/:key
 * Get a specific setting value by its key
 * Params:
 *   - key: string (required) - Setting key in dot notation (e.g., system.name)
 * Query params:
 *   - departmentId: ObjectId (optional) - Get department-specific override value
 * Access Rights: None (public) OR system:department-settings:manage (private, read-only for instructors)
 * Roles: All authenticated (public), instructor/department-admin/system-admin (private)
 */
router.get('/:key', settingsController.getSettingByKey);

/**
 * PUT /api/v2/settings/:key
 * Update a specific setting value
 * Params:
 *   - key: string (required) - Setting key to update
 * Body:
 *   - value: any (required) - New setting value (must match setting type)
 *   - departmentId: ObjectId (optional) - Create department-specific override
 * Access Rights: system:department-settings:manage
 * Roles: department-admin (dept settings), system-admin (all)
 * Requires: Escalation
 */
router.put('/:key',
  requireEscalation,
  authorize('system:department-settings:manage'),
  settingsController.updateSetting
);

/**
 * POST /api/v2/settings/bulk
 * Update multiple settings in a single request
 * Body:
 *   - settings: array (required) - Array of setting objects with key, value, and optional departmentId
 *   - validateOnly: boolean (optional) - Validate without applying changes (dry run)
 * Access Rights: system:department-settings:manage
 * Roles: department-admin (dept settings), system-admin (all)
 * Requires: Escalation
 */
router.post('/bulk',
  requireEscalation,
  authorize('system:department-settings:manage'),
  settingsController.bulkUpdateSettings
);

/**
 * POST /api/v2/settings/reset
 * Reset settings to their default values
 * Body:
 *   - keys: array (optional) - Specific setting keys to reset
 *   - category: string (optional) - Reset all settings in a category
 *   - departmentId: ObjectId (optional) - Reset department overrides only
 *   - confirm: boolean (required) - Must be true to confirm reset operation
 * Access Rights: system:*
 * Roles: system-admin only
 * Requires: Escalation + Admin Role
 */
router.post('/reset',
  requireEscalation,
  requireAdminRole(['system-admin']),
  authorize('system:*'),
  settingsController.resetSettings
);

export default router;
