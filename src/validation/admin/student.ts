// validations/student.validation.ts

import { z } from "zod";

export const studentSchema = z.object({
    firstname: z.string().min(2, "الاسم الأول يجب أن يكون حرفين على الأقل").max(255),
    lastname: z.string().min(2, "الاسم الأخير يجب أن يكون حرفين على الأقل").max(255),
    nickname: z.string().min(2, "اللقب يجب أن يكون حرفين على الأقل").max(255),
    email: z.string().email("البريد الإلكتروني غير صالح"),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    phone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم الهاتف غير صالح"),
    category: z.string().uuid("معرف الفئة غير صالح"),
    grade: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"], {
        errorMap: () => ({ message: "الصف غير صالح" })
    }),
    parentphone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف ولي الأمر غير صالح")
});

export const updateStudentSchema = z.object({
    firstname: z.string().min(2, "الاسم الأول يجب أن يكون حرفين على الأقل").max(255).optional(),
    lastname: z.string().min(2, "الاسم الأخير يجب أن يكون حرفين على الأقل").max(255).optional(),
    nickname: z.string().min(2, "اللقب يجب أن يكون حرفين على الأقل").max(255).optional(),
    email: z.string().email("البريد الإلكتروني غير صالح").optional(),
    phone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم الهاتف غير صالح").optional(),
    category: z.string().uuid("معرف الفئة غير صالح").optional(),
    grade: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"], {
        errorMap: () => ({ message: "الصف غير صالح" })
    }).optional(),
    parentphone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف ولي الأمر غير صالح").optional(),
    oldPassword: z.string().optional(),
    newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").optional()
}).refine((data) => {
    if (data.newPassword && !data.oldPassword) {
        return false;
    }
    return true;
}, {
    message: "كلمة المرور القديمة مطلوبة لتغيير كلمة المرور",
    path: ["oldPassword"]
});

export const idSchema = z.string().uuid("معرف الطالب غير صالح");

export const gradeSchema = z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"], {
    errorMap: () => ({ message: "الصف غير صالح" })
});

export const categoryIdSchema = z.string().uuid("معرف الفئة غير صالح");
