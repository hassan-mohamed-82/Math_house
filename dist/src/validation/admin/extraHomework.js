"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewSubmissionSchema = exports.assignStudentsSchema = exports.updateExtraHomeworkSchema = exports.createExtraHomeworkSchema = void 0;
const zod_1 = require("zod");
exports.createExtraHomeworkSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, "العنوان يجب أن يحتوي على حرفين على الأقل").max(255),
    description: zod_1.z.string().optional(),
    pdf: zod_1.z.string().optional(), // Base64 encoded PDF or URL
    link: zod_1.z.string().url("رابط غير صالح").optional().or(zod_1.z.literal("")),
    dueDate: zod_1.z.string().datetime().optional().or(zod_1.z.string().optional()),
    targetType: zod_1.z.enum(["all", "category", "grade", "group", "individual"]).default("individual"),
    targetGroupId: zod_1.z.string().uuid().optional(),
    studentIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
exports.updateExtraHomeworkSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(255).optional(),
    description: zod_1.z.string().optional().nullable(),
    pdf: zod_1.z.string().optional().nullable(),
    link: zod_1.z.string().url().optional().or(zod_1.z.literal("")).nullable(),
    dueDate: zod_1.z.string().optional().nullable(),
    targetType: zod_1.z.enum(["all", "category", "grade", "group", "individual"]).optional(),
    targetGroupId: zod_1.z.string().optional().nullable().or(zod_1.z.literal("")),
    studentIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.assignStudentsSchema = zod_1.z.object({
    studentIds: zod_1.z.array(zod_1.z.string().uuid("معرف الطالب غير صالح")).min(1, "يجب تحديد طالب واحد على الأقل"),
});
exports.reviewSubmissionSchema = zod_1.z.object({
    score: zod_1.z.number().min(0, "الدرجة يجب أن تكون 0 أو أكثر").max(100, "الدرجة يجب ألا تتجاوز 100").optional(),
    feedback: zod_1.z.string().optional(),
    status: zod_1.z.enum(["reviewed", "graded"]).default("graded").optional(),
});
