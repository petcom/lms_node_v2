/**
 * Report Templates Controller
 * Handles CRUD operations for report templates
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '@/utils/asyncHandler';
import reportTemplateService from '@/services/reports/report-templates.service';

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const template = await reportTemplateService.createReportTemplate({
    ...req.body,
    createdBy: userId,
    departmentId: userDepartmentIds[0]
  });

  res.status(201).json({
    success: true,
    data: { id: template._id.toString(), name: template.name, createdAt: template.createdAt },
    message: 'Template created successfully'
  });
});

export const listTemplates = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));
  const userRoles = req.user!.roles || [];

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await reportTemplateService.listReportTemplates(
    { reportType: req.query.reportType as string, search: req.query.search as string },
    userId,
    userDepartmentIds,
    userRoles,
    page,
    limit
  );

  res.status(200).json({
    success: true,
    data: result.templates.map(t => ({
      id: t._id.toString(),
      name: t.name,
      reportType: t.reportType,
      usageCount: t.usageCount,
      createdAt: t.createdAt
    })),
    pagination: { page: result.page, limit, total: result.total, totalPages: result.totalPages }
  });
});

export const getTemplate = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const template = await reportTemplateService.getReportTemplateById(
    req.params.templateId,
    userId,
    userDepartmentIds
  );

  res.status(200).json({ success: true, data: template });
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const template = await reportTemplateService.updateReportTemplate(
    req.params.templateId,
    req.body,
    userId,
    userDepartmentIds
  );

  res.status(200).json({ success: true, data: template, message: 'Template updated' });
});

export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  await reportTemplateService.deleteReportTemplate(req.params.templateId, userId, userDepartmentIds);

  res.status(200).json({ success: true, message: 'Template deleted' });
});

export const cloneTemplate = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map((id: string) => new mongoose.Types.ObjectId(id));

  const template = await reportTemplateService.cloneReportTemplate(
    req.params.templateId,
    userId,
    userDepartmentIds,
    [],
    req.body.name
  );

  res.status(201).json({ success: true, data: template, message: 'Template cloned' });
});
