import { Router } from 'express';
import { z } from 'zod';
import * as controller from '@/controllers/reports/report-templates.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validateRequest';

// Inlined schemas from @contracts/api/report-templates.contract to avoid rootDir issues
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    reportType: z.string().min(1),
    parameters: z.record(z.string(), z.any()),
    defaultOutput: z.object({
      format: z.string().min(1),
      filenameTemplate: z.string().optional()
    }),
    visibility: z.string().optional(),
    sharedWith: z.object({
      users: z.array(objectIdSchema).optional(),
      departments: z.array(objectIdSchema).optional(),
      roles: z.array(z.string()).optional()
    }).optional()
  })
});

const listTemplatesSchema = z.object({
  query: z.object({
    reportType: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
  })
});

const getTemplateSchema = z.object({
  params: z.object({ templateId: objectIdSchema })
});

const updateTemplateSchema = z.object({
  params: z.object({ templateId: objectIdSchema }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    parameters: z.record(z.string(), z.any()).optional(),
    isActive: z.boolean().optional()
  })
});

const deleteTemplateSchema = z.object({
  params: z.object({ templateId: objectIdSchema })
});

const cloneTemplateSchema = z.object({
  params: z.object({ templateId: objectIdSchema }),
  body: z.object({ name: z.string().min(1).max(200).optional() })
});

const router = Router();
router.use(isAuthenticated);

router.post('/', authorize('reports:templates:create'), validateRequest(createTemplateSchema), controller.createTemplate);
router.get('/', authorize('reports:templates:read'), validateRequest(listTemplatesSchema), controller.listTemplates);
router.get('/:templateId', authorize('reports:templates:read'), validateRequest(getTemplateSchema), controller.getTemplate);
router.put('/:templateId', authorize('reports:templates:update'), validateRequest(updateTemplateSchema), controller.updateTemplate);
router.delete('/:templateId', authorize('reports:templates:delete'), validateRequest(deleteTemplateSchema), controller.deleteTemplate);
router.post('/:templateId/clone', authorize('reports:templates:create'), validateRequest(cloneTemplateSchema), controller.cloneTemplate);

export default router;
