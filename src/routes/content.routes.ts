import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import { requireEscalation } from '@/middlewares/requireEscalation';
import * as contentController from '@/controllers/content/content.controller';

const router = Router();

/**
 * Content Routes
 * Base path: /api/v2/content
 *
 * All routes require authentication
 * File upload routes use multer middleware
 */

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    // Determine upload directory based on field name
    if (file.fieldname === 'thumbnail') {
      cb(null, 'uploads/thumbnails/');
    } else if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, 'uploads/media/');
    } else if (file.originalname.endsWith('.zip')) {
      cb(null, 'uploads/scorm/');
    } else {
      cb(null, 'uploads/media/');
    }
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max (handled per-type in service)
  }
});

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * =====================
 * SCORM PACKAGE ROUTES
 * Base: /api/v2/content/scorm
 * =====================
 * Note: SCORM routes must come BEFORE the generic /:id route
 * to prevent 'scorm' from being treated as an ID
 */

/**
 * GET /api/v2/content/scorm
 * List SCORM packages
 * Access Right: content:courses:read
 * Roles: course-taker, auditor, instructor, content-admin, department-admin
 */
router.get('/scorm',
  requireAccessRight('content:courses:read'),
  contentController.listScorm
);

/**
 * POST /api/v2/content/scorm
 * Upload SCORM package
 * Access Right: content:courses:manage
 * Roles: content-admin, department-admin
 * Content-Type: multipart/form-data
 */
router.post(
  '/scorm',
  requireAccessRight('content:courses:manage'),
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  contentController.uploadScorm
);

/**
 * GET /api/v2/content/scorm/:id
 * Get SCORM package details
 * Access Right: content:courses:read
 * Roles: course-taker, auditor, instructor, content-admin, department-admin
 */
router.get('/scorm/:id',
  requireAccessRight('content:courses:read'),
  contentController.getScorm
);

/**
 * PUT /api/v2/content/scorm/:id
 * Update SCORM package metadata
 * Access Right: content:courses:manage
 * Roles: content-admin, department-admin
 */
router.put('/scorm/:id',
  requireAccessRight('content:courses:manage'),
  contentController.updateScorm
);

/**
 * DELETE /api/v2/content/scorm/:id
 * Delete SCORM package
 * Access Right: content:courses:manage
 * Roles: department-admin
 * Requires: Escalation
 */
router.delete('/scorm/:id',
  requireEscalation,
  requireAccessRight('content:courses:manage'),
  contentController.deleteScorm
);

/**
 * POST /api/v2/content/scorm/:id/launch
 * Launch SCORM player
 * Access Right: content:lessons:read
 * Roles: course-taker, instructor, content-admin
 */
router.post('/scorm/:id/launch',
  requireAccessRight('content:lessons:read'),
  contentController.launchScorm
);

/**
 * POST /api/v2/content/scorm/:id/publish
 * Publish SCORM package
 * Access Right: content:courses:manage
 * Roles: content-admin, department-admin
 */
router.post('/scorm/:id/publish',
  requireAccessRight('content:courses:manage'),
  contentController.publishScorm
);

/**
 * POST /api/v2/content/scorm/:id/unpublish
 * Unpublish SCORM package
 * Access Right: content:courses:manage
 * Roles: content-admin, department-admin
 */
router.post('/scorm/:id/unpublish',
  requireAccessRight('content:courses:manage'),
  contentController.unpublishScorm
);

/**
 * =====================
 * MEDIA LIBRARY ROUTES
 * Base: /api/v2/content/media
 * =====================
 */

/**
 * GET /api/v2/content/media
 * List media files
 * Access Right: content:courses:read
 * Roles: course-taker, auditor, instructor, content-admin, department-admin
 */
router.get('/media',
  requireAccessRight('content:courses:read'),
  contentController.listMedia
);

/**
 * POST /api/v2/content/media
 * Upload media file
 * Access Right: content:courses:manage
 * Roles: content-admin, department-admin
 * Content-Type: multipart/form-data
 */
router.post('/media',
  requireAccessRight('content:courses:manage'),
  upload.single('file'),
  contentController.uploadMedia
);

/**
 * GET /api/v2/content/media/:id
 * Get media file details
 * Access Right: content:courses:read
 * Roles: course-taker, auditor, instructor, content-admin, department-admin
 */
router.get('/media/:id',
  requireAccessRight('content:courses:read'),
  contentController.getMedia
);

/**
 * PUT /api/v2/content/media/:id
 * Update media metadata
 * Access Right: content:courses:manage
 * Roles: content-admin, department-admin
 */
router.put('/media/:id',
  requireAccessRight('content:courses:manage'),
  contentController.updateMedia
);

/**
 * DELETE /api/v2/content/media/:id
 * Delete media file
 * Access Right: content:courses:manage
 * Roles: content-admin, department-admin
 */
router.delete('/media/:id',
  requireAccessRight('content:courses:manage'),
  contentController.deleteMedia
);

/**
 * =====================
 * CONTENT OVERVIEW ROUTES
 * Base: /api/v2/content
 * =====================
 * Note: These generic routes must come LAST to avoid
 * catching specific routes like /scorm and /media
 */

/**
 * GET /api/v2/content
 * List all content items
 * Access Right: content:courses:read
 * Roles: course-taker, auditor, instructor, content-admin, department-admin
 */
router.get('/',
  requireAccessRight('content:courses:read'),
  contentController.listContent
);

/**
 * GET /api/v2/content/:id
 * Get content item details
 * Access Right: content:courses:read
 * Roles: course-taker, auditor, instructor, content-admin, department-admin
 */
router.get('/:id',
  requireAccessRight('content:courses:read'),
  contentController.getContent
);

export default router;
