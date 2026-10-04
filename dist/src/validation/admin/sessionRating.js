"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudentRatingSchema = exports.rateSessionStudentsSchema = exports.rateSingleStudentSchema = exports.studentQuestionRatingItemSchema = exports.updateRatingQuestionSchema = exports.createRatingQuestionSchema = void 0;
const zod_1 = require("zod");
exports.createRatingQuestionSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, "العنوان يجب أن يحتوي على حرفين على الأقل").max(255),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().max(100).optional(),
    weight: zod_1.z.number().int().min(1).default(1),
    order: zod_1.z.number().int().default(0),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.updateRatingQuestionSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, "العنوان يجب أن يحتوي على حرفين على الأقل").max(255).optional(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().max(100).optional(),
    weight: zod_1.z.number().int().min(1).optional(),
    order: zod_1.z.number().int().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.studentQuestionRatingItemSchema = zod_1.z.object({
    questionId: zod_1.z.string().uuid("معرف السؤال غير صالح"),
    rating: zod_1.z.number().int().min(1, "التقييم يجب أن يكون بين 1 و 10").max(10, "التقييم يجب أن يكون بين 1 و 10"),
    comment: zod_1.z.string().optional(),
});
exports.rateSingleStudentSchema = zod_1.z.object({
    studentId: zod_1.z.string().uuid("معرف الطالب غير صالح"),
    ratings: zod_1.z.array(exports.studentQuestionRatingItemSchema).min(1, "يجب تقديم تقييم لسؤال واحد على الأقل"),
    generalComment: zod_1.z.string().optional(),
});
exports.rateSessionStudentsSchema = zod_1.z.object({
    students: zod_1.z.array(exports.rateSingleStudentSchema).min(1, "يجب تقييم طالب واحد على الأقل"),
});
exports.updateStudentRatingSchema = zod_1.z.object({
    ratings: zod_1.z.array(exports.studentQuestionRatingItemSchema).min(1, "يجب تقديم تقييم لسؤال واحد على الأقل"),
    generalComment: zod_1.z.string().optional(),
});
