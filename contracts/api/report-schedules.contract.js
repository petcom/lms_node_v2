"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeScheduleSchema = exports.pauseScheduleSchema = exports.updateScheduleSchema = exports.getScheduleSchema = exports.listSchedulesSchema = exports.createScheduleSchema = void 0;
const zod_1 = require("zod");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
exports.createScheduleSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(200),
        description: zod_1.z.string().max(1000).optional(),
        templateId: objectIdSchema,
        schedule: zod_1.z.object({
            frequency: zod_1.z.enum(['once', 'daily', 'weekly', 'monthly', 'quarterly']),
            timezone: zod_1.z.string().default('UTC'),
            timeOfDay: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional()
        }),
        output: zod_1.z.object({
            format: zod_1.z.string()
        }),
        delivery: zod_1.z.object({
            method: zod_1.z.enum(['email', 'storage', 'both'])
        })
    })
});
exports.listSchedulesSchema = zod_1.z.object({
    query: zod_1.z.object({
        templateId: objectIdSchema.optional(),
        isActive: zod_1.z.coerce.boolean().optional(),
        page: zod_1.z.coerce.number().int().positive().default(1),
        limit: zod_1.z.coerce.number().int().positive().max(100).default(20)
    })
});
exports.getScheduleSchema = zod_1.z.object({
    params: zod_1.z.object({ scheduleId: objectIdSchema })
});
exports.updateScheduleSchema = zod_1.z.object({
    params: zod_1.z.object({ scheduleId: objectIdSchema }),
    body: zod_1.z.record(zod_1.z.any())
});
exports.pauseScheduleSchema = zod_1.z.object({
    params: zod_1.z.object({ scheduleId: objectIdSchema }),
    body: zod_1.z.object({ reason: zod_1.z.string().optional() })
});
exports.resumeScheduleSchema = zod_1.z.object({
    params: zod_1.z.object({ scheduleId: objectIdSchema })
});
