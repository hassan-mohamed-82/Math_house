"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.increaseLessonsDurationSchema = exports.categoryIdSchema = exports.gradeSchema = exports.idParamsSchema = exports.idSchema = exports.updateStudentSchema = exports.studentSchema = void 0;
const zod_1 = require("zod");
exports.studentSchema = zod_1.z.object({
    firstname: zod_1.z.string().min(2, "firstname must be at least 2 characters").max(255),
    lastname: zod_1.z.string().min(2, "lastname must be at least 2 characters").max(255),
    nickname: zod_1.z.string().min(2, "nickname must be at least 2 characters").max(255),
    email: zod_1.z.string().email("email is not valid"),
    password: zod_1.z.string().min(8, "password must be at least 8 characters"),
    //TODO: add validation for most countries numbers
    phone: zod_1.z.string(),
    category: zod_1.z.string().uuid("category id is not valid"),
    grade: zod_1.z.string().uuid("grade id is not valid"),
    //TODO: add validation for most countries numbers
    parentphone: zod_1.z.string().optional()
});
exports.updateStudentSchema = zod_1.z.object({
    firstname: zod_1.z.string().min(2, "firstname must be at least 2 characters").max(255).optional(),
    lastname: zod_1.z.string().min(2, "lastname must be at least 2 characters").max(255).optional(),
    nickname: zod_1.z.string().min(2, "nickname must be at least 2 characters").max(255).optional(),
    email: zod_1.z.string().email("email is not valid").optional(),
    phone: zod_1.z.string().optional(),
    category: zod_1.z.string().uuid("category id is not valid").optional(),
    grade: zod_1.z.string().uuid("grade id is not valid").optional(),
    parentphone: zod_1.z.string().optional(),
    oldPassword: zod_1.z.string().optional(),
    newPassword: zod_1.z.string().min(8, "password must be at least 8 characters").optional()
}).refine((data) => {
    if (data.newPassword && !data.oldPassword) {
        return false;
    }
    return true;
}, {
    message: "كلمة المرور القديمة مطلوبة لتغيير كلمة المرور",
    path: ["oldPassword"]
});
exports.idSchema = zod_1.z.string().uuid("معرف الطالب غير صالح");
exports.idParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid("معرف الطالب غير صالح"),
});
exports.gradeSchema = zod_1.z.string().uuid("grade id is not valid");
exports.categoryIdSchema = zod_1.z.string().uuid("معرف الفئة غير صالح");
exports.increaseLessonsDurationSchema = zod_1.z.object({
    lessonIds: zod_1.z.array(zod_1.z.string().uuid("معرف الدرس غير صالح")),
    days: zod_1.z.number().int().positive("عدد الأيام يجب أن يكون رقماً موجباً"),
});
