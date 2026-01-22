"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneTemplateSchema = exports.deleteTemplateSchema = exports.updateTemplateSchema = exports.getTemplateSchema = exports.listTemplatesSchema = exports.createTemplateSchema = void 0;
const zod_1 = require("zod");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
exports.createTemplateSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(200),
        description: zod_1.z.string().max(1000).optional(),
        reportType: zod_1.z.string().min(1),
        parameters: zod_1.z.record(zod_1.z.any()),
        defaultOutput: zod_1.z.object({
            format: zod_1.z.string().min(1),
            filenameTemplate: zod_1.z.string().optional()
        }),
        visibility: zod_1.z.string().optional(),
        sharedWith: zod_1.z.object({
            users: zod_1.z.array(objectIdSchema).optional(),
            departments: zod_1.z.array(objectIdSchema).optional(),
            roles: zod_1.z.array(zod_1.z.string()).optional()
        }).optional()
    })
});
exports.listTemplatesSchema = zod_1.z.object({
    query: zod_1.z.object({
        reportType: zod_1.z.string().optional(),
        search: zod_1.z.string().optional(),
        page: zod_1.z.coerce.number().int().positive().default(1),
        limit: zod_1.z.coerce.number().int().positive().max(100).default(20)
    })
});
exports.getTemplateSchema = zod_1.z.object({
    params: zod_1.z.object({ templateId: objectIdSchema })
});
exports.updateTemplateSchema = zod_1.z.object({
    params: zod_1.z.object({ templateId: objectIdSchema }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().max(1000).optional(),
        parameters: zod_1.z.record(zod_1.z.any()).optional(),
        isActive: zod_1.z.boolean().optional()
    })
});
exports.deleteTemplateSchema = zod_1.z.object({
    params: zod_1.z.object({ templateId: objectIdSchema })
});
exports.cloneTemplateSchema = zod_1.z.object({
    params: zod_1.z.object({ templateId: objectIdSchema }),
    body: zod_1.z.object({ name: zod_1.z.string().min(1).max(200).optional() })
});
