import { z } from "zod";

export const studentSchema = z.object({
    firstname: z.string().min(2, "firstname must be at least 2 characters").max(255),
    lastname: z.string().min(2, "lastname must be at least 2 characters").max(255),
    nickname: z.string().min(2, "nickname must be at least 2 characters").max(255),
    email: z.string().email("email is not valid"),
    password: z.string().min(8, "password must be at least 8 characters"),
    //TODO: add validation for most countries numbers
    phone: z.string(),
    category: z.string().uuid("category id is not valid"),
    grade: z.string().uuid("grade id is not valid"),
    //TODO: add validation for most countries numbers
    parentphone: z.string().optional()
});

export const updateStudentSchema = z.object({
    firstname: z.string().min(2, "firstname must be at least 2 characters").max(255).optional(),
    lastname: z.string().min(2, "lastname must be at least 2 characters").max(255).optional(),
    nickname: z.string().min(2, "nickname must be at least 2 characters").max(255).optional(),
    email: z.string().email("email is not valid").optional(),
    phone: z.string().optional(),
    category: z.string().uuid("category id is not valid").optional(),
    grade: z.string().uuid("grade id is not valid").optional(),
    parentphone: z.string().optional(),
    oldPassword: z.string().optional(),
    newPassword: z.string().min(8, "password must be at least 8 characters").optional()
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

export const idParamsSchema = z.object({
    id: z.string().uuid("معرف الطالب غير صالح"),
});

export const gradeSchema = z.string().uuid("grade id is not valid");

export const categoryIdSchema = z.string().uuid("معرف الفئة غير صالح");

export const increaseLessonsDurationSchema = z.object({
    lessonIds: z.array(z.string().uuid("معرف الدرس غير صالح")),
    days: z.number().int().positive("عدد الأيام يجب أن يكون رقماً موجباً"),
});
