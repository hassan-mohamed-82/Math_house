import { Request, Response } from "express";
import { db } from "../../models/connection";
import { category, Student, wallet, grade as gradeTable, courses, chapters, lessons, enrolledItems, prices } from "../../models/schema";
import { eq, or, like, isNull, and, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const createStudent = async (req: Request, res: Response) => {
    const {
        firstname,
        lastname,
        nickname,
        email,
        password,
        phone,
        category: categoryId,
        grade,
        parentphone,
        avatar,
    } = req.body;

    if (!firstname || !lastname || !nickname || !email || !password || !phone || !categoryId || !grade) {
        throw new BadRequest("all fields are required");
    }

    const existingStudent = await db
        .select()
        .from(Student)
        .where(eq(Student.email, email));

    if (existingStudent.length > 0) {
        throw new BadRequest("email already exists");
    }

    const existingCategory = await db
        .select()
        .from(category)
        .where(eq(category.id, categoryId));

    if (existingCategory.length === 0) {
        throw new BadRequest("category not found");
    }

    if (existingCategory[0].parentCategoryId) {
        throw new BadRequest("student must be assigned to a main category only");
    }

    const [existingGrade] = await db
        .select()
        .from(gradeTable)
        .where(and(eq(gradeTable.id, grade), eq(gradeTable.parentCategoryId, categoryId)));

    if (!existingGrade) {
        throw new BadRequest("grade not found or does not belong to the selected category");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const imgUrl = avatar ? await validateAndSaveLogo(req, avatar, "students") : null;
    await db.transaction(async (tx) => {
        await tx.insert(Student).values({
            id,
            firstname,
            lastname,
            nickname,
            email,
            password: hashedPassword,
            phone,
            category: categoryId,
            grade,
            parentphone,
            isVerified: true,
            avatar: imgUrl
        });

        await tx.insert(wallet).values({
            studentId: id,
            balance: 0
        });
    });

    SuccessResponse(res, { message: "create student success", data: { id } });
};

export const getAllStudents = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db
        .select({
            id: Student.id,
            avatar: Student.avatar,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            categoryName: category.name,
            grade: {
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            },
            parentphone: Student.parentphone
        })
        .from(Student)
        .leftJoin(category, eq(Student.category, category.id))
        .leftJoin(gradeTable, eq(Student.grade, gradeTable.id));

    // Search
    if (search) {
        const searchTerm = `%${search}%`;
        query = query.where(
            or(
                like(Student.firstname, searchTerm),
                like(Student.lastname, searchTerm),
                like(Student.nickname, searchTerm),
                like(Student.email, searchTerm),
                like(Student.phone, searchTerm)
            )
        ) as any;
    }

    const students = await query.limit(Number(limit)).offset(offset);

    // Format response like the image
    const formattedStudents = students.map(s => ({
        id: s.id,
        name: `${s.firstname} ${s.lastname} (${s.nickname})`,
        firstname: s.firstname,
        lastname: s.lastname,
        nickname: s.nickname,
        email: s.email,
        phone: s.phone,
        parentPhone: s.parentphone,
        category: s.category,
        categoryName: s.categoryName,
        grade: s.grade,
        avatar: s.avatar,
        paymentStatus: "Free" // هتحتاج تعدلها حسب الـ Logic بتاعك
    }));

    SuccessResponse(res, { message: "get all students success", data: formattedStudents });
};

export const getStudentById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("id is required");
    }

    const [student] = await db
        .select({
            id: Student.id,
            avatar: Student.avatar,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            categoryName: category.name,
            grade: {
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            },
            parentphone: Student.parentphone
        })
        .from(Student)
        .leftJoin(category, eq(Student.category, category.id))
        .leftJoin(gradeTable, eq(Student.grade, gradeTable.id))
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("student not found");
    }

    SuccessResponse(res, { message: "get student success", data: student });
};

export const updateStudent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        firstname,
        lastname,
        nickname,
        email,
        phone,
        category: categoryId,
        grade,
        parentphone,
        oldPassword,
        newPassword,
        avatar
    } = req.body;

    if (!id) {
        throw new BadRequest("id is required");
    }

    const existingStudent = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (existingStudent.length === 0) {
        throw new NotFound("student not found");
    }

    if (email && email !== existingStudent[0].email) {
        const emailExists = await db
            .select()
            .from(Student)
            .where(eq(Student.email, email));

        if (emailExists.length > 0) {
            throw new BadRequest("email already exists");
        }
    }

    if (categoryId) {
        const existingCategory = await db
            .select({ id: category.id, parentCategoryId: category.parentCategoryId })
            .from(category)
            .where(eq(category.id, categoryId));

        if (existingCategory.length === 0) {
            throw new BadRequest("category not found");
        }

        if (existingCategory[0].parentCategoryId) {
            throw new BadRequest("student must be assigned to a main category only");
        }
    }

    if (grade) {
        const catId = categoryId || existingStudent[0].category;
        const [existingGrade] = await db
            .select()
            .from(gradeTable)
            .where(and(eq(gradeTable.id, grade), eq(gradeTable.parentCategoryId, catId)));

        if (!existingGrade) {
            throw new BadRequest("grade not found or does not belong to the selected category");
        }
    }
    let ImgUrl;
    if (avatar) {
        ImgUrl = await handleImageUpdate(req, existingStudent[0].avatar, avatar, "students");
    }
    const updateData: any = {};

    if (firstname) updateData.firstname = firstname;
    if (lastname) updateData.lastname = lastname;
    if (nickname) updateData.nickname = nickname;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (categoryId) updateData.category = categoryId;
    if (avatar) updateData.avatar = ImgUrl;
    if (grade) updateData.grade = grade;
    if (parentphone) updateData.parentphone = parentphone;

    if (newPassword) {
        if (!oldPassword) {
            throw new BadRequest("old password is required to change password");
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, existingStudent[0].password);

        if (!isPasswordValid) {
            throw new BadRequest("old password is not valid");
        }

        updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
        throw new BadRequest("no data to update");
    }

    await db
        .update(Student)
        .set(updateData)
        .where(eq(Student.id, id));

    SuccessResponse(res, { message: "update student success", data: updateData });
};

export const deleteStudent = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("id is required");
    }
    const student = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (student.length === 0) {
        throw new NotFound("student not found");
    }

    if (student[0].avatar) {
        await deleteImage(student[0].avatar);
    }
    await db.delete(wallet).where(eq(wallet.studentId, id));
    await db.delete(Student).where(eq(Student.id, id));

    SuccessResponse(res, { message: "delete student success" });
};

export const getStudentsByCategory = async (req: Request, res: Response) => {
    const { categoryId } = req.params;

    if (!categoryId) {
        throw new BadRequest("category id is required");
    }

    const students = await db
        .select({
            id: Student.id,
            avatar: Student.avatar,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            grade: {
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            },
            parentphone: Student.parentphone
        })
        .from(Student)
        .leftJoin(gradeTable, eq(Student.grade, gradeTable.id))
        .where(eq(Student.category, categoryId));

    SuccessResponse(res, { message: "get students by category success", data: students });
};

export const getStudentsByGrade = async (req: Request, res: Response) => {
    const { grade } = req.params;

    if (!grade) {
        throw new BadRequest("grade is required");
    }

    const students = await db
        .select({
            id: Student.id,
            avatar: Student.avatar,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            grade: {
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            },
            parentphone: Student.parentphone
        })
        .from(Student)
        .leftJoin(gradeTable, eq(Student.grade, gradeTable.id))
        .where(eq(Student.grade, grade));

    SuccessResponse(res, { message: "get students by grade success", data: students });
};

export const selection = async (req: Request, res: Response) => {
    const { categoryId } = req.query;

    const categories = await db
        .select({
            id: category.id,
            name: category.name,
            description: category.description,
            image: category.image,
        })
        .from(category)
        .where(isNull(category.parentCategoryId));

    let grades: any[] = [];
    if (categoryId) {
        grades = await db
            .select({
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            })
            .from(gradeTable)
            .where(eq(gradeTable.parentCategoryId, String(categoryId)));
    }

    SuccessResponse(res, { message: "get all categories and grades success", data: { categories, grades } });
};


// ===================== NEW APIs =====================

// 🔥 Open Account (Impersonation) - الدخول كـ Student
export const openStudentAccount = async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req as any).user?.id;

    const [student] = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            email: Student.email,
            nickname: Student.nickname,
        })
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("student not found");
    }

    // إنشاء Token للـ Student
    const impersonationToken = jwt.sign(
        {
            id: student.id,
            email: student.email,
            name: `${student.firstname} ${student.lastname}`,
            nickname: student.nickname,
            role: "student",
            isImpersonation: true,
            impersonatedBy: adminId,
        },
        JWT_SECRET,
        { expiresIn: "2h" }
    );

    SuccessResponse(res, {
        message: "Account opened successfully",
        data: {
            token: impersonationToken,
            redirectUrl: `/student/dashboard`,
            student: {
                id: student.id,
                name: `${student.firstname} ${student.lastname}`,
                email: student.email
            }
        }
    });
};

// 🔥 Top Up Wallet - شحن المحفظة
export const topUpWallet = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, description } = req.body;
    const adminId = (req as any).user?.id;

    if (!amount || Number(amount) <= 0) {
        throw new BadRequest("Invalid amount");
    }

    const [student] = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("student not found");
    }

    // لو عندك جدول wallet أو walletBalance في الـ Student
    // هنا هتضيف الـ Logic بتاع الشحن

    // مثال: لو عندك جدول transactions
    /*
    await db.insert(walletTransactions).values({
        studentId: id,
        amount: amount,
        type: "topup",
        description: description || "Wallet Top Up",
        createdBy: adminId
    });
    */

    SuccessResponse(res, {
        message: "Wallet topped up successfully",
        data: {
            studentId: id,
            amount: Number(amount),
            description: description || "Wallet Top Up"
        }
    });
};

// 🔥 Payment History - سجل المدفوعات
export const getPaymentHistory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const [student] = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("student not found");
    }

    // لو عندك جدول transactions
    /*
    const transactions = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.studentId, id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit));
    */

    // مؤقتاً نرجع array فاضي
    const transactions: any[] = [];

    SuccessResponse(res, {
        message: "Payment history retrieved successfully",
        data: {
            studentId: id,
            studentName: `${student.firstname} ${student.lastname}`,
            transactions: transactions
        }
    });
};

// ===================== CONTENT & ENROLLMENT APIs =====================

export const getStudentContent = async (req: Request, res: Response) => {
    const { id } = req.params; // studentId

    // 1. جلب بيانات الطالب والـ CategoryId الخاص به لفلترة المحتوى
    const [student] = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            categoryId: Student.category,
            gradeId: Student.grade
        })
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("Student not found");
    }

    // إذا كان الطالب غير مسجل في أي كاتيغوري، نرجع مصفوفة فارغة
    if (!student.categoryId || !student.gradeId) {
        return SuccessResponse(res, {
            message: "Student has no category assigned",
            data: { student, content: [] }
        });
    }

    // 2. جلب الكورسات التابعة لـ الـ Category الخاصة بالطالب فقط
    const filteredCourses = await db
        .select({
            id: courses.id,
            name: courses.name,
            description: courses.description,
            image: courses.image,
            isHaveSemester: courses.isHaveSemester,
            categoryId: courses.categoryId,
            categoryName: category.name,
        })
        .from(courses)
        .leftJoin(category, eq(courses.categoryId, category.id))
        .where(eq(courses.categoryId, student.categoryId));

    if (filteredCourses.length === 0) {
        return SuccessResponse(res, {
            message: "No courses found for this student's category",
            data: { student, content: [] }
        });
    }

    // 3. تجميع الـ IDs للكورسات المفلترة لاستخدامها في جلب الشباتر والدروس
    const courseIds = filteredCourses.map(c => c.id);

    // 4. جلب الشباتر التابعة لهذه الكورسات فقط
    const filteredChapters = await db
        .select({
            id: chapters.id,
            name: chapters.name,
            description: chapters.description,
            image: chapters.image,
            courseId: chapters.courseId,
            order: chapters.order,
        })
        .from(chapters)
        .where(inArray(chapters.courseId, courseIds));

    // 5. جلب الدروس التابعة لهذه الكورسات فقط
    const filteredLessons = await db
        .select({
            id: lessons.id,
            name: lessons.name,
            description: lessons.description,
            image: lessons.image,
            courseId: lessons.courseId,
            chapterId: lessons.chapterId,
            order: lessons.order,
        })
        .from(lessons)
        .where(inArray(lessons.courseId, courseIds));

    // 6. جلب اشتراكات الطالب الحالية لمعرفة حالة الـ isEnrolled
    const existingEnrollments = await db
        .select({
            courseId: enrolledItems.courseId,
            chapterId: enrolledItems.chapterId,
            lessonId: enrolledItems.lessonId,
        })
        .from(enrolledItems)
        .where(eq(enrolledItems.studentId, id));

    const enrolledCourseIds = new Set(existingEnrollments.filter(e => e.courseId && !e.chapterId && !e.lessonId).map(e => e.courseId));
    const enrolledChapterIds = new Set(existingEnrollments.filter(e => e.chapterId && !e.lessonId).map(e => e.chapterId));
    const enrolledLessonIds = new Set(existingEnrollments.map(e => e.lessonId).filter(Boolean));

    // 7. بناء هيكل الشجرة النظيف (Courses -> Chapters -> Lessons)
    const contentTree = filteredCourses.map(course => ({
        ...course,
        isEnrolled: enrolledCourseIds.has(course.id),
        chapters: filteredChapters
            .filter(ch => ch.courseId === course.id)
            .sort((a, b) => a.order - b.order)
            .map(chapter => ({
                ...chapter,
                isEnrolled: enrolledChapterIds.has(chapter.id),
                lessons: filteredLessons
                    .filter(ls => ls.chapterId === chapter.id)
                    .sort((a, b) => a.order - b.order)
                    .map(lesson => ({
                        ...lesson,
                        isEnrolled: enrolledLessonIds.has(lesson.id),
                    }))
            }))
    }));

    return SuccessResponse(res, {
        message: "Student content filtered successfully",
        data: {
            student: {
                id: student.id,
                name: `${student.firstname} ${student.lastname}`,
            },
            content: contentTree,
        }
    });
};

export const attendItems = async (req: Request, res: Response) => {
    const { id } = req.params; // studentId
    const { courses: courseItems = [], chapters: chapterItems = [], lessons: lessonItems = [] } = req.body;

    // 1. التحقق من أن هناك على الأقل عنصر واحد للإشتراك
    if (courseItems.length === 0 && chapterItems.length === 0 && lessonItems.length === 0) {
        throw new BadRequest("At least one item (course, chapter, or lesson) must be provided");
    }

    // 2. التحقق من وجود الطالب في قاعدة البيانات
    const [student] = await db
        .select({ id: Student.id, firstname: Student.firstname, lastname: Student.lastname })
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("Student not found");
    }

    // 3. جلب كل الاشتراكات الحالية للطالب (منع التكرار والـ Over-Enrollment)
    const existingEnrollments = await db
        .select()
        .from(enrolledItems)
        .where(eq(enrolledItems.studentId, id));

    const hasCourse = (cId: string) => existingEnrollments.some(e => e.courseId === cId && !e.chapterId && !e.lessonId);
    const hasChapter = (chId: string) => existingEnrollments.some(e => e.chapterId === chId && !e.lessonId);
    const hasLesson = (lId: string) => existingEnrollments.some(e => e.lessonId === lId);

    const enrollmentValues: any[] = [];

    // 4. معالجة الكورسات (Courses)
    if (courseItems.length > 0) {
        const foundCourses = await db.select({ id: courses.id }).from(courses)
            .where(inArray(courses.id, courseItems.map((i: any) => i.id)));

        if (foundCourses.length !== courseItems.length) {
            throw new BadRequest("One or more course IDs are invalid");
        }

        for (const item of courseItems) {
            if (hasCourse(item.id)) continue; // تخطي لو مشترك بالفعل في الكورس
            enrollmentValues.push({
                id: uuidv4(),
                studentId: id,
                courseId: item.id,
                chapterId: null,
                lessonId: null,
                priceId: item.priceId || null,
                status: "active"
            });
        }
    }

    // 5. معالجة الشباتر (Chapters)
    if (chapterItems.length > 0) {
        const foundChapters = await db.select({ id: chapters.id, courseId: chapters.courseId }).from(chapters)
            .where(inArray(chapters.id, chapterItems.map((i: any) => i.id)));

        if (foundChapters.length !== chapterItems.length) {
            throw new BadRequest("One or more chapter IDs are invalid");
        }

        for (const item of chapterItems) {
            const chData = foundChapters.find(c => c.id === item.id);
            if (!chData) continue;

            // الحماية: لو الطالب مشترك في الكورس الأب بالكامل أو في الشابتر نفسه ⬅️ تخطي
            if (hasCourse(chData.courseId) || hasChapter(item.id)) continue;

            enrollmentValues.push({
                id: uuidv4(),
                studentId: id,
                courseId: null, // يترك null لتمييز أنه اشتراك شابتر مستقل
                chapterId: item.id,
                lessonId: null,
                priceId: item.priceId || null,
                status: "active"
            });
        }
    }

    // 6. معالجة الدروس (Lessons)
    if (lessonItems.length > 0) {
        const foundLessons = await db.select({ id: lessons.id, chapterId: lessons.chapterId, courseId: lessons.courseId }).from(lessons)
            .where(inArray(lessons.id, lessonItems.map((i: any) => i.id)));

        if (foundLessons.length !== lessonItems.length) {
            throw new BadRequest("One or more lesson IDs are invalid");
        }

        for (const item of lessonItems) {
            const lsData = foundLessons.find(l => l.id === item.id);
            if (!lsData) continue;

            // الحماية: لو مشترك في الكورس الأب أو الشابتر الأب أو الدرس نفسه ⬅️ تخطي
            if (hasCourse(lsData.courseId) || hasChapter(lsData.chapterId) || hasLesson(item.id)) continue;

            enrollmentValues.push({
                id: uuidv4(),
                studentId: id,
                courseId: null,
                chapterId: null,
                lessonId: item.id,
                priceId: item.priceId || null,
                status: "active"
            });
        }
    }

    // 7. تنفيذ عملية الحفظ في الداتابيز
    if (enrollmentValues.length === 0) {
        return SuccessResponse(res, {
            message: "No new items to enroll (All selected items are already inherited or enrolled)",
            data: { enrolled: 0 }
        });
    }

    await db.transaction(async (tx) => {
        await tx.insert(enrolledItems).values(enrollmentValues);
    });

    SuccessResponse(res, {
        message: "Student enrolled successfully",
        data: {
            student: { id: student.id, name: `${student.firstname} ${student.lastname}` },
            enrolledCount: enrollmentValues.length,
        }
    });
};