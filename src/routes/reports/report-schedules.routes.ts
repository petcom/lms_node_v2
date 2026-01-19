import { Router } from 'express';
import * as controller from '@/controllers/reports/report-schedules.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import { validateRequest } from '@/middlewares/validateRequest';
import * as schema from '@contracts/api/report-schedules.contract';

const router = Router();
router.use(isAuthenticated);

router.post('/', requireAccessRight('reports:schedules:create'), validateRequest(schema.createScheduleSchema), controller.createSchedule);
router.get('/', requireAccessRight('reports:schedules:read'), validateRequest(schema.listSchedulesSchema), controller.listSchedules);
router.get('/:scheduleId', requireAccessRight('reports:schedules:read'), validateRequest(schema.getScheduleSchema), controller.getSchedule);
router.put('/:scheduleId', requireAccessRight('reports:schedules:update'), validateRequest(schema.updateScheduleSchema), controller.updateSchedule);
router.post('/:scheduleId/pause', requireAccessRight('reports:schedules:update'), validateRequest(schema.pauseScheduleSchema), controller.pauseSchedule);
router.post('/:scheduleId/resume', requireAccessRight('reports:schedules:update'), validateRequest(schema.resumeScheduleSchema), controller.resumeSchedule);

export default router;
