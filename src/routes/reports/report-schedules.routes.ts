import { Router } from 'express';
import { z } from 'zod';
import * as controller from '@/controllers/reports/report-schedules.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validateRequest';

// Inlined schemas from @contracts/api/report-schedules.contract to avoid rootDir issues
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const createScheduleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    templateId: objectIdSchema,
    schedule: z.object({
      frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'quarterly']),
      timezone: z.string().default('UTC'),
      timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional()
    }),
    output: z.object({
      format: z.string()
    }),
    delivery: z.object({
      method: z.enum(['email', 'storage', 'both'])
    })
  })
});

const listSchedulesSchema = z.object({
  query: z.object({
    templateId: objectIdSchema.optional(),
    isActive: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
  })
});

const getScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema })
});

const updateScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema }),
  body: z.record(z.string(), z.any())
});

const pauseScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema }),
  body: z.object({ reason: z.string().optional() })
});

const resumeScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema })
});

const router = Router();
router.use(isAuthenticated);

router.post('/', authorize('reports:schedules:create'), validateRequest(createScheduleSchema), controller.createSchedule);
router.get('/', authorize('reports:schedules:read'), validateRequest(listSchedulesSchema), controller.listSchedules);
router.get('/:scheduleId', authorize('reports:schedules:read'), validateRequest(getScheduleSchema), controller.getSchedule);
router.put('/:scheduleId', authorize('reports:schedules:update'), validateRequest(updateScheduleSchema), controller.updateSchedule);
router.post('/:scheduleId/pause', authorize('reports:schedules:update'), validateRequest(pauseScheduleSchema), controller.pauseSchedule);
router.post('/:scheduleId/resume', authorize('reports:schedules:update'), validateRequest(resumeScheduleSchema), controller.resumeSchedule);

export default router;
