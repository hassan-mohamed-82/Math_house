"use strict";
// validations/student.validation.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryIdSchema = exports.gradeSchema = exports.idSchema = exports.updateStudentSchema = exports.studentSchema = void 0;
const zod_1 = require("zod");
exports.studentSchema = zod_1.z.object({
    firstname: zod_1.z.string().min(2, "الاسم الأول يجب أن يكون حرفين على الأقل").max(255),
    lastname: zod_1.z.string().min(2, "الاسم الأخير يجب أن يكون حرفين على الأقل").max(255),
    nickname: zod_1.z.string().min(2, "اللقب يجب أن يكون حرفين على الأقل").max(255),
    email: zod_1.z.string().email("البريد الإلكتروني غير صالح"),
    password: zod_1.z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    phone: zod_1.z.string().regex(/^01[0125][0-9]{8}$/, "رقم الهاتف غير صالح"),
    category: zod_1.z.string().uuid("معرف الفئة غير صالح"),
    grade: zod_1.z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"], {
        errorMap: () => ({ message: "الصف غير صالح" })
    }),
    parentphone: zod_1.z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف ولي الأمر غير صالح")
});
exports.updateStudentSchema = zod_1.z.object({
    firstname: zod_1.z.string().min(2, "الاسم الأول يجب أن يكون حرفين على الأقل").max(255).optional(),
    lastname: zod_1.z.string().min(2, "الاسم الأخير يجب أن يكون حرفين على الأقل").max(255).optional(),
    nickname: zod_1.z.string().min(2, "اللقب يجب أن يكون حرفين على الأقل").max(255).optional(),
    email: zod_1.z.string().email("البريد الإلكتروني غير صالح").optional(),
    phone: zod_1.z.string().regex(/^01[0125][0-9]{8}$/, "رقم الهاتف غير صالح").optional(),
    category: zod_1.z.string().uuid("معرف الفئة غير صالح").optional(),
    grade: zod_1.z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"], {
        errorMap: () => ({ message: "الصف غير صالح" })
    }).optional(),
    parentphone: zod_1.z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف ولي الأمر غير صالح").optional(),
    oldPassword: zod_1.z.string().optional(),
    newPassword: zod_1.z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").optional()
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
exports.gradeSchema = zod_1.z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"], {
    errorMap: () => ({ message: "الصف غير صالح" })
});
exports.categoryIdSchema = zod_1.z.string().uuid("معرف الفئة غير صالح");
