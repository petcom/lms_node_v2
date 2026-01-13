import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { requireAccessRight } from '@/middlewares/require-access-right';
import * as usersController from '@/controllers/users/users.controller';

const router = Router();

/**
 * Users Routes
 * Base path: /api/v2/users
 *
 * All routes require authentication
 * Note: /me routes are self-access (no additional authorization)
 * List routes require staff/admin permissions
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/users/me
 * Get current authenticated user profile (unified for all roles)
 */
router.get('/me', usersController.getMe);

/**
 * PUT /api/v2/users/me
 * Update current authenticated user profile
 */
router.put('/me', usersController.updateMe);

/**
 * POST /api/v2/users/me/password
 * Change current user's password
 * Requires current password for verification (ISS-001)
 */
router.post('/me/password', usersController.changePassword);

/**
 * GET /api/v2/users/me/departments
 * Get departments assigned to current user (staff only)
 */
router.get('/me/departments', usersController.getMyDepartments);

/**
 * GET /api/v2/users/me/courses
 * Get courses assigned to current user as instructor (staff only)
 */
router.get('/me/courses', usersController.getMyCourses);

/**
 * GET /api/v2/users/me/enrollments
 * Get all enrollments for current user (learner)
 */
router.get('/me/enrollments', usersController.getMyEnrollments);

/**
 * GET /api/v2/users/me/progress
 * Get comprehensive progress summary for current user
 */
router.get('/me/progress', usersController.getMyProgress);

// ============================================================================
// NEW v2.0.0: Person & Demographics Routes
// ============================================================================

/**
 * GET /api/v2/users/me/person
 * Get current user's person data (IPerson Basic)
 */
router.get('/me/person', usersController.getMyPerson);

/**
 * PUT /api/v2/users/me/person
 * Update current user's person data
 */
router.put('/me/person', usersController.updateMyPerson);

/**
 * GET /api/v2/users/me/person/extended
 * Get current user's extended person data (role-specific)
 */
router.get('/me/person/extended', usersController.getMyPersonExtended);

/**
 * PUT /api/v2/users/me/person/extended
 * Update current user's extended person data
 */
router.put('/me/person/extended', usersController.updateMyPersonExtended);

/**
 * GET /api/v2/users/me/demographics
 * Get current user's demographics data
 */
router.get('/me/demographics', usersController.getMyDemographics);

/**
 * PUT /api/v2/users/me/demographics
 * Update current user's demographics data
 */
router.put('/me/demographics', usersController.updateMyDemographics);

export default router;
