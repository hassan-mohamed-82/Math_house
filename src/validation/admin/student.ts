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

export const enrollWithExtraDaysSchema = z.object({
    courses: z.array(z.object({
        id: z.string().uuid("معرف الكورس غير صالح"),
        priceId: z.string().uuid("معرف خطة السعر غير صالح").optional().nullable(),
        extraDays: z.number().int().min(0, "الأيام الإضافية يجب أن تكون 0 أو أكثر").optional(),
    })).optional(),
    chapters: z.array(z.object({
        id: z.string().uuid("معرف الشابتر غير صالح"),
        priceId: z.string().uuid("معرف خطة السعر غير صالح").optional().nullable(),
        extraDays: z.number().int().min(0, "الأيام الإضافية يجب أن تكون 0 أو أكثر").optional(),
    })).optional(),
    lessons: z.array(z.object({
        id: z.string().uuid("معرف الدرس غير صالح"),
        priceId: z.string().uuid("معرف خطة السعر غير صالح").optional().nullable(),
        extraDays: z.number().int().min(0, "الأيام الإضافية يجب أن تكون 0 أو أكثر").optional(),
    })).optional(),
    extraDays: z.number().int().min(0).optional(),
});

