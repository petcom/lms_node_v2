import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as academicYearsController from '@/controllers/academic/academic-years.controller';

const router = Router();

/**
 * Academic Calendar Routes
 * Base paths: /api/v2/calendar/years, /api/v2/calendar/terms, /api/v2/calendar/cohorts
 *
 * All routes require authentication
 * Admin-only routes: POST, PUT, DELETE
 * Staff can view all data (GET routes)
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * =====================
 * ACADEMIC YEARS ROUTES
 * Base: /api/v2/calendar/years
 * =====================
 */

/**
 * GET /api/v2/calendar/years
 * List all academic years
 * Permissions: admin, staff
 */
router.get('/years', academicYearsController.listYears);

/**
 * POST /api/v2/calendar/years
 * Create a new academic year
 * Permissions: admin
 */
router.post('/years', academicYearsController.createYear);

/**
 * GET /api/v2/calendar/years/:id
 * Get details of a specific academic year
 * Permissions: admin, staff
 */
router.get('/years/:id', academicYearsController.getYear);

/**
 * PUT /api/v2/calendar/years/:id
 * Update an academic year
 * Permissions: admin
 */
router.put('/years/:id', academicYearsController.updateYear);

/**
 * DELETE /api/v2/calendar/years/:id
 * Delete an academic year
 * Permissions: admin
 */
router.delete('/years/:id', academicYearsController.deleteYear);

/**
 * =====================
 * ACADEMIC TERMS ROUTES
 * Base: /api/v2/calendar/terms
 * =====================
 */

/**
 * GET /api/v2/calendar/terms
 * List all academic terms
 * Permissions: admin, staff
 */
router.get('/terms', academicYearsController.listTerms);

/**
 * POST /api/v2/calendar/terms
 * Create a new academic term
 * Permissions: admin
 */
router.post('/terms', academicYearsController.createTerm);

/**
 * GET /api/v2/calendar/terms/:id
 * Get details of a specific academic term
 * Permissions: admin, staff
 */
router.get('/terms/:id', academicYearsController.getTerm);

/**
 * PUT /api/v2/calendar/terms/:id
 * Update an academic term
 * Permissions: admin
 */
router.put('/terms/:id', academicYearsController.updateTerm);

/**
 * DELETE /api/v2/calendar/terms/:id
 * Delete an academic term
 * Permissions: admin
 */
router.delete('/terms/:id', academicYearsController.deleteTerm);

/**
 * =====================
 * COHORTS ROUTES
 * Base: /api/v2/calendar/cohorts
 * =====================
 */

/**
 * GET /api/v2/calendar/cohorts
 * List all cohorts
 * Permissions: admin, staff
 */
router.get('/cohorts', academicYearsController.listCohorts);

/**
 * POST /api/v2/calendar/cohorts
 * Create a new cohort
 * Permissions: admin
 */
router.post('/cohorts', academicYearsController.createCohort);

/**
 * GET /api/v2/calendar/cohorts/:id
 * Get details of a specific cohort
 * Permissions: admin, staff
 */
router.get('/cohorts/:id', academicYearsController.getCohort);

/**
 * PUT /api/v2/calendar/cohorts/:id
 * Update a cohort
 * Permissions: admin
 */
router.put('/cohorts/:id', academicYearsController.updateCohort);

/**
 * DELETE /api/v2/calendar/cohorts/:id
 * Delete a cohort
 * Permissions: admin
 */
router.delete('/cohorts/:id', academicYearsController.deleteCohort);

export default router;
