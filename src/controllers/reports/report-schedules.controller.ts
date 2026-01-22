/**
 * Report Schedules Controller
 * Handles CRUD operations for report schedules
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '@/utils/asyncHandler';
import reportScheduleService from '@/services/reports/report-schedules.service';

export const createSchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const schedule = await reportScheduleService.createReportSchedule({
    ...req.body,
    templateId: new mongoose.Types.ObjectId(req.body.templateId),
    createdBy: userId,
    departmentId: userDepartmentIds[0]
  });

  res.status(201).json({
    success: true,
    data: { id: schedule._id.toString(), name: schedule.name, nextRunAt: schedule.nextRunAt },
    message: 'Schedule created successfully'
  });
});

export const listSchedules = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await reportScheduleService.listReportSchedules(
    { isActive: req.query.isActive === 'true' },
    userId,
    userDepartmentIds,
    page,
    limit
  );

  res.status(200).json({
    success: true,
    data: result.schedules.map(s => ({
      id: s._id.toString(),
      name: s.name,
      frequency: s.schedule.frequency,
      nextRunAt: s.nextRunAt,
      isActive: s.isActive,
      isPaused: s.isPaused
    })),
    pagination: { page: result.page, limit, total: result.total, totalPages: result.totalPages }
  });
});

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const schedule = await reportScheduleService.getReportScheduleById(
    req.params.scheduleId,
    userId,
    userDepartmentIds
  );

  res.status(200).json({ success: true, data: schedule });
});

export const updateSchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const schedule = await reportScheduleService.updateReportSchedule(
    req.params.scheduleId,
    req.body,
    userId,
    userDepartmentIds
  );

  res.status(200).json({ success: true, data: schedule, message: 'Schedule updated' });
});

export const pauseSchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const schedule = await reportScheduleService.pauseReportSchedule(
    req.params.scheduleId,
    userId,
    userDepartmentIds,
    req.body.reason
  );

  res.status(200).json({ success: true, data: schedule, message: 'Schedule paused' });
});

export const resumeSchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const schedule = await reportScheduleService.resumeReportSchedule(
    req.params.scheduleId,
    userId,
    userDepartmentIds
  );

  res.status(200).json({ success: true, data: schedule, message: 'Schedule resumed' });
});
