import { z } from "zod";

export const createRatingQuestionSchema = z.object({
    title: z.string().min(2, "العنوان يجب أن يحتوي على حرفين على الأقل").max(255),
    description: z.string().optional(),
    category: z.string().max(100).optional(),
    weight: z.number().int().min(1).default(1),
    order: z.number().int().default(0),
    isActive: z.boolean().optional().default(true),
});

export const updateRatingQuestionSchema = z.object({
    title: z.string().min(2, "العنوان يجب أن يحتوي على حرفين على الأقل").max(255).optional(),
    description: z.string().optional(),
    category: z.string().max(100).optional(),
    weight: z.number().int().min(1).optional(),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
});

export const studentQuestionRatingItemSchema = z.object({
    questionId: z.string().uuid("معرف السؤال غير صالح"),
    rating: z.number().int().min(1, "التقييم يجب أن يكون بين 1 و 10").max(10, "التقييم يجب أن يكون بين 1 و 10"),
    comment: z.string().optional(),
});

export const rateSingleStudentSchema = z.object({
    studentId: z.string().uuid("معرف الطالب غير صالح"),
    ratings: z.array(studentQuestionRatingItemSchema).min(1, "يجب تقديم تقييم لسؤال واحد على الأقل"),
    generalComment: z.string().optional(),
});

export const rateSessionStudentsSchema = z.object({
    students: z.array(rateSingleStudentSchema).min(1, "يجب تقييم طالب واحد على الأقل"),
});

export const updateStudentRatingSchema = z.object({
    ratings: z.array(studentQuestionRatingItemSchema).min(1, "يجب تقديم تقييم لسؤال واحد على الأقل"),
    generalComment: z.string().optional(),
});
