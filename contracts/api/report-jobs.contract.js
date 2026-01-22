"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadReportSchema = exports.retryReportJobSchema = exports.cancelReportJobSchema = exports.getReportJobSchema = exports.listReportJobsSchema = exports.createReportJobSchema = void 0;
const zod_1 = require("zod");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
const isoDateSchema = zod_1.z.string().datetime();
const reportParametersSchema = zod_1.z.object({
    dateRange: zod_1.z
        .object({
        startDate: isoDateSchema,
        endDate: isoDateSchema
    })
        .optional(),
    filters: zod_1.z
        .object({
        departmentIds: zod_1.z.array(objectIdSchema).optional(),
        courseIds: zod_1.z.array(objectIdSchema).optional(),
        classIds: zod_1.z.array(objectIdSchema).optional(),
        learnerIds: zod_1.z.array(objectIdSchema).optional(),
        contentIds: zod_1.z.array(objectIdSchema).optional(),
        eventTypes: zod_1.z.array(zod_1.z.string()).optional(),
        statuses: zod_1.z.array(zod_1.z.string()).optional()
    })
        .optional(),
    groupBy: zod_1.z.array(zod_1.z.string()).optional(),
    measures: zod_1.z.array(zod_1.z.string()).optional(),
    includeInactive: zod_1.z.boolean().optional()
});
const outputConfigSchema = zod_1.z.object({
    format: zod_1.z.string().min(1, 'Output format is required'),
    filename: zod_1.z.string().optional()
});
exports.createReportJobSchema = zod_1.z.object({
    body: zod_1.z.object({
        reportType: zod_1.z.string().min(1, 'Report type is required'),
        name: zod_1.z.string().min(1, 'Name is required').max(200, 'Name cannot exceed 200 characters'),
        description: zod_1.z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
        parameters: reportParametersSchema,
        output: outputConfigSchema,
        priority: zod_1.z.string().optional(),
        visibility: zod_1.z.string().optional(),
        scheduledFor: isoDateSchema.optional(),
        templateId: objectIdSchema.optional(),
        departmentId: objectIdSchema.optional()
    })
});
exports.listReportJobsSchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
        reportType: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
        requestedBy: objectIdSchema.optional(),
        departmentId: objectIdSchema.optional(),
        fromDate: isoDateSchema.optional(),
        toDate: isoDateSchema.optional(),
        page: zod_1.z.coerce.number().int().positive().default(1),
        limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
        sortBy: zod_1.z.enum(['createdAt', 'status', 'priority', 'updatedAt']).optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional()
    })
});
exports.getReportJobSchema = zod_1.z.object({
    params: zod_1.z.object({
        jobId: objectIdSchema
    })
});
exports.cancelReportJobSchema = zod_1.z.object({
    params: zod_1.z.object({
        jobId: objectIdSchema
    }),
    body: zod_1.z.object({
        reason: zod_1.z.string().max(500).optional()
    })
});
exports.retryReportJobSchema = zod_1.z.object({
    params: zod_1.z.object({
        jobId: objectIdSchema
    })
});
exports.downloadReportSchema = zod_1.z.object({
    params: zod_1.z.object({
        jobId: objectIdSchema
    })
});
