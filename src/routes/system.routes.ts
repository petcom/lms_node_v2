import { Router } from 'express';
import {
  getHealth,
  getStatus,
  getMetrics,
  getVersion,
  getStats,
  toggleMaintenance
} from '@/controllers/system/system.controller';
import { authorize } from '@/middlewares/authenticate';
import { isAuthenticated } from '@/middlewares/isAuthenticated';

const router = Router();

/**
 * System Health and Monitoring Routes
 * Base path: /api/v2/system
 */

// PUBLIC endpoints (no authentication required)
router.get('/health', getHealth);
router.get('/version', getVersion);

// ADMIN-ONLY endpoints
router.get('/status', isAuthenticated, authorize('system-admin', 'global-admin'), getStatus);
router.get('/metrics', isAuthenticated, authorize('system-admin', 'global-admin'), getMetrics);
router.get('/stats', isAuthenticated, authorize('system-admin', 'global-admin'), getStats);
router.post('/maintenance', isAuthenticated, authorize('system-admin', 'global-admin'), toggleMaintenance);

export default router;
