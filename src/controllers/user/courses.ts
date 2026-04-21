import { Request, Response } from "express";
import { courses } from "../../models/schema/admin/courses";
import { db } from "../../models/connection";
import {
    category, teachers, chapters, courseTeachers,
    semesters, lessons, paymentMethod, wallet,
    walletTransaction, enrolledItems, payment
} from "../../models/schema";
import { eq, count, and, aliasedTable, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { validateAndSaveLogo } from "../../utils/handleImages";

// 1. Get all courses 
export const getAllCourses = async (req: Request, res: Response) => {
    const allCourses = await db.select({
        id: courses.id,
        name: courses.name,
        price: courses.totalPrice,
        category: category.name,
        numberOfChapters: count(chapters.id),
    })
        .from(courses)
        .leftJoin(category, eq(courses.categoryId, category.id))
        .leftJoin(chapters, eq(courses.id, chapters.courseId))
        .groupBy(courses.id, courses.name, category.name);

    return SuccessResponse(res, { message: "All Courses Retrieved Successfully", courses: allCourses }, 200);
}

// 2. Get course by id 
export const getCourseById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) throw new BadRequest("Course not found");

    const teachersList = await db.select({
        name: teachers.name,
        role: courseTeachers.role,
    })
        .from(courseTeachers)
        .leftJoin(teachers, eq(courseTeachers.teacherId, teachers.id))
        .where(eq(courseTeachers.courseId, id));

    const courseSemestersList = await db.select({
        id: semesters.id,
        name: semesters.name,
        // price: semesters.price
    })
        .from(semesters)
        .where(eq(semesters.courseId, id));

    return SuccessResponse(res, { ...course, teachers: teachersList, semesters: courseSemestersList }, 200);
}

// 3. Enroll / Purchase Item (The Core Logic)
export const enrollInCourse = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const {
        courseId,
        semesterId,
        chapterIds,
        lessonIds,
        paymentType,
        paymentMethodId,
        image
    } = req.body;

    const existingEnrollment = await db.select()
        .from(enrolledItems)
        .where(
            and(
                eq(enrolledItems.studentId, studentId),
                chapterIds ? eq(enrolledItems.chapterId, chapterIds) :
                    courseId ? eq(enrolledItems.courseId, courseId) :
                        semesterId ? eq(enrolledItems.semesterId, semesterId) :
                            eq(enrolledItems.lessonId, lessonIds)
            )
        );

    if (existingEnrollment.length > 0) {
        throw new BadRequest("You have already purchased this item");
    }

    await db.transaction(async (tx) => {
        let totalPrice = 0;
        let itemsToEnroll: any[] = [];

        // 1. calculate course price
        if (courseId) {
            const [item] = await tx.select().from(courses).where(eq(courses.id, courseId));
            if (!item) throw new BadRequest("Course not found");
            totalPrice += item.totalPrice || 0;
            itemsToEnroll.push({ courseId });
        }

        // 2. calculate semester price
        // if (semesterId) {
        //     const [item] = await tx.select().from(semesters).where(eq(semesters.id, semesterId));
        //     if (!item) throw new BadRequest("Semester not found");
        //     totalPrice += item.price || 0;
        //     itemsToEnroll.push({ semesterId });
        // }

        // 3. calculate chapters price (Bulk)
        if (chapterIds && Array.isArray(chapterIds)) {
            for (const id of chapterIds) {
                const [item] = await tx.select().from(chapters).where(eq(chapters.id, id));
                if (!item) throw new BadRequest(`Chapter ${id} not found`);
                totalPrice += item.price || 0;
                itemsToEnroll.push({ chapterId: id });
            }
        }

        // 4. calculate lessons price (Bulk)
        if (lessonIds && Array.isArray(lessonIds)) {
            for (const id of lessonIds) {
                const [item] = await tx.select().from(lessons).where(eq(lessons.id, id));
                if (!item) throw new BadRequest(`Lesson ${id} not found`);
                totalPrice += item.price || 0;
                itemsToEnroll.push({ lessonId: id });
            }
        }

        if (itemsToEnroll.length === 0) throw new BadRequest("No items selected for enrollment");

        let paymentRecordId: string | null = null;
        let enrollmentStatus: "active" | "pending" = "pending";
        let paymentStatus: "pending" | "completed" | "rejected" = "pending";

        // --- payment processing ---

        // a. payment by wallet
        if (paymentType === "wallet") {
            const [sw] = await tx.select().from(wallet).where(eq(wallet.studentId, studentId));
            if (!sw) {
                throw new BadRequest("No wallet found for this student. Please contact support.");
            }
            if (sw.balance < totalPrice) {
                throw new BadRequest(`Insufficient balance. Your balance is ${sw.balance}, but total is ${totalPrice}`);
            }

            await tx.update(wallet).set({ balance: sw.balance - totalPrice }).where(eq(wallet.id, sw.id));

            await tx.insert(walletTransaction).values({
                walletId: sw.id,
                amount: totalPrice,
                type: "withdrawal",
                source: "Student",
            });

            enrollmentStatus = "active";
            paymentStatus = "completed";
        }
        // b. payment by payment method (Manual/Automatic)
        else {
            if (!paymentMethodId) throw new BadRequest("Payment method ID is required");

            const [method] = await tx.select().from(paymentMethod).where(eq(paymentMethod.id, paymentMethodId));
            if (!method) throw new BadRequest("Invalid payment method");

            let savedImageUrl = null;

            if (method.type === "Manual") {
                if (!image) throw new BadRequest("Receipt image is required for manual payment");
                savedImageUrl = await validateAndSaveLogo(req, image, "payments");
                paymentStatus = "pending";
                enrollmentStatus = "pending";
            } else {
                // automatic payment (Visa / Stripe)
                paymentStatus = "completed";
                enrollmentStatus = "active";
            }

            const [p] = await tx.insert(payment).values({
                studentId: studentId,
                paymentMethodId,
                amount: totalPrice,
                status: paymentStatus,
                receiptImg: savedImageUrl,
                source: "student",
                purpose: "purchase"
            });

            // @ts-ignore
            paymentRecordId = p.insertId || p[0]?.id;
        }

        // record all purchased items in enrolledItems table
        for (const item of itemsToEnroll) {
            await tx.insert(enrolledItems).values({
                studentId,
                ...item,
                ...(paymentRecordId ? { paymentId: paymentRecordId } : {}),
                status: enrollmentStatus
            });
        }
    });

    return SuccessResponse(res, { message: "Purchase request processed successfully" }, 201);
};

// 4. My Purchases
export const getMyPurchases = async (req: Request, res: Response) => {
    const studentId = req.user.id;

    // تعريف الأسماء المستعارة عشان الـ Joins المتكررة
    const courseOfSemester = aliasedTable(courses, "course_of_semester");
    const courseOfChapter = aliasedTable(courses, "course_of_chapter");
    const chapterOfLesson = aliasedTable(chapters, "chapter_of_lesson");

    const purchases = await db.select({
        enrollmentId: enrolledItems.id,
        status: enrolledItems.status,
        createdAt: enrolledItems.createdAt,
        course: {
            id: courses.id,
            name: courses.name,
            image: courses.image,
        },
        semester: {
            id: semesters.id,
            name: semesters.name,
            courseName: courseOfSemester.name,
        },
        chapter: {
            id: chapters.id,
            name: chapters.name,
            courseName: courseOfChapter.name,
        },
        lesson: {
            id: lessons.id,
            name: lessons.name,
            chapterName: chapterOfLesson.name,
        }
    })
        .from(enrolledItems)
        .leftJoin(courses, eq(enrolledItems.courseId, courses.id))
        .leftJoin(semesters, eq(enrolledItems.semesterId, semesters.id))
        .leftJoin(courseOfSemester, eq(semesters.courseId, courseOfSemester.id))
        .leftJoin(chapters, eq(enrolledItems.chapterId, chapters.id))
        .leftJoin(courseOfChapter, eq(chapters.courseId, courseOfChapter.id))
        .leftJoin(lessons, eq(enrolledItems.lessonId, lessons.id))
        .leftJoin(chapterOfLesson, eq(lessons.chapterId, chapterOfLesson.id))
        .where(eq(enrolledItems.studentId, studentId));

    const formattedPurchases = purchases.map(item => ({
        id: item.enrollmentId,
        status: item.status,
        date: item.createdAt,
        type: item.course?.id ? 'course' :
            item.semester?.id ? 'semester' :
                item.chapter?.id ? 'chapter' : 'lesson',
        details: item.course?.id ? item.course :
            item.semester?.id ? item.semester :
                item.chapter?.id ? item.chapter : item.lesson
    }));

    return SuccessResponse(res, {
        message: "My Library retrieved successfully",
        purchases: formattedPurchases
    }, 200);
};

// 5. course content for enrolled student
export const getEnrolledCourseById = async (req: Request, res: Response) => {
    const { id: courseId } = req.params;
    const studentId = req.user.id;

    const [enrollment] = await db.select().from(enrolledItems).where(
        and(
            eq(enrolledItems.studentId, studentId),
            eq(enrolledItems.courseId, courseId),
            eq(enrolledItems.status, "active")
        )
    );

    if (!enrollment) {
        throw new BadRequest("Access denied. You are not enrolled in this course.");
    }

    // جلب الهيكل الدراسي: ترم -> شابتر -> درس
    const courseContent = await db.select()
        .from(semesters)
        .leftJoin(chapters, eq(semesters.id, chapters.semesterId))
        .leftJoin(lessons, eq(chapters.id, lessons.chapterId))
        .where(eq(semesters.courseId, courseId))
        .orderBy(semesters.id, chapters.id, lessons.id);

    return SuccessResponse(res, { message: "Course content retrieved", content: courseContent }, 200);
}