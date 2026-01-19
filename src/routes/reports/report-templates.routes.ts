import { Router } from 'express';
import * as controller from '@/controllers/reports/report-templates.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import { validateRequest } from '@/middlewares/validateRequest';
import * as schema from '@contracts/api/report-templates.contract';

const router = Router();
router.use(isAuthenticated);

router.post('/', requireAccessRight('reports:templates:create'), validateRequest(schema.createTemplateSchema), controller.createTemplate);
router.get('/', requireAccessRight('reports:templates:read'), validateRequest(schema.listTemplatesSchema), controller.listTemplates);
router.get('/:templateId', requireAccessRight('reports:templates:read'), validateRequest(schema.getTemplateSchema), controller.getTemplate);
router.put('/:templateId', requireAccessRight('reports:templates:update'), validateRequest(schema.updateTemplateSchema), controller.updateTemplate);
router.delete('/:templateId', requireAccessRight('reports:templates:delete'), validateRequest(schema.deleteTemplateSchema), controller.deleteTemplate);
router.post('/:templateId/clone', requireAccessRight('reports:templates:create'), validateRequest(schema.cloneTemplateSchema), controller.cloneTemplate);

export default router;
