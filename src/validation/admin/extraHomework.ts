import { z } from "zod";

export const createExtraHomeworkSchema = z.object({
    title: z.string().min(2, "العنوان يجب أن يحتوي على حرفين على الأقل").max(255),
    description: z.string().optional(),
    pdf: z.string().optional(),       // Base64 encoded PDF or URL
    link: z.string().url("رابط غير صالح").optional().or(z.literal("")),
    dueDate: z.string().datetime().optional().or(z.string().optional()),
    targetType: z.enum(["all", "category", "grade", "group", "individual"]).default("individual"),
    targetGroupId: z.string().uuid().optional(),
    studentIds: z.array(z.string().uuid()).optional(),
});

export const updateExtraHomeworkSchema = z.object({
    title: z.string().min(2).max(255).optional(),
    description: z.string().optional().nullable(),
    pdf: z.string().optional().nullable(),
    link: z.string().url().optional().or(z.literal("")).nullable(),
    dueDate: z.string().optional().nullable(),
    targetType: z.enum(["all", "category", "grade", "group", "individual"]).optional(),
    targetGroupId: z.string().optional().nullable().or(z.literal("")),
    studentIds: z.array(z.string()).optional(),
});

export const assignStudentsSchema = z.object({
    studentIds: z.array(z.string().uuid("معرف الطالب غير صالح")).min(1, "يجب تحديد طالب واحد على الأقل"),
});

export const reviewSubmissionSchema = z.object({
    score: z.number().min(0, "الدرجة يجب أن تكون 0 أو أكثر").max(100, "الدرجة يجب ألا تتجاوز 100").optional(),
    feedback: z.string().optional(),
    status: z.enum(["reviewed", "graded"]).default("graded").optional(),
});
