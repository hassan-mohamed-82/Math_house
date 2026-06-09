import { Request, Response } from "express";
import { db } from "../../models/connection";
import { eq, asc, and, inArray, desc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { lessons, lessonIdeas, chapters, courses, teachers, semesters, prices, enrolledItems } from "../../models/schema";
import { checkAccess } from "../../utils/accessControl";

const lessonDetailedQuery = () =>
    db.select({
        lesson: {
            id: lessons.id,
            name: lessons.name,
            description: lessons.description,
            image: lessons.image,
            preRequisition: lessons.preRequisition,
            whatYouGain: lessons.whatYouGain,
            order: lessons.order,
        },
        chapter: {
            id: chapters.id,
            name: chapters.name,
        },
        course: {
            id: courses.id,
            name: courses.name,
        },
        semester: {
            id: semesters.id,
            name: semesters.name,
        },
        teacher: {
            id: teachers.id,
            name: teachers.name,
            avatar: teachers.avatar,
        }
    })
        .from(lessons)
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(courses, eq(lessons.courseId, courses.id))
        .leftJoin(teachers, eq(lessons.teacherId, teachers.id))
        .leftJoin(semesters, eq(chapters.semesterId, semesters.id));

export const getLessonById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const studentId = req.user.id;

    const [result] = await lessonDetailedQuery().where(eq(lessons.id, id));
    if (!result) {
        throw new NotFound("Lesson not found");
    }

    // Check access
    const hasAccess = await checkAccess(studentId, {
        lessonId: id,
        chapterId: result.chapter?.id,
        courseId: result.course?.id
    });

    const lessonPrices = await db.select()
        .from(prices)
        .where(and(eq(prices.targetId, id), eq(prices.targetType, "lesson")));

    if (!hasAccess) {
        return SuccessResponse(res, {
            message: "Lesson details fetched (Locked)",
            ...result,
            ideas: [], // Hide ideas if locked
            prices: lessonPrices,
            isLocked: true
        }, 200);
    }

    // Fetch ideas for this lesson
    const ideas = await db.select().from(lessonIdeas)
        .where(eq(lessonIdeas.lessonId, id))
        .orderBy(asc(lessonIdeas.ideaOrder));

    return SuccessResponse(res, {
        message: "Lesson fetched successfully",
        ...result,
        ideas,
        prices: lessonPrices,
        isLocked: false
    }, 200);
};

export const getLessonsByChapterId = async (req: Request, res: Response) => {
    const { chapterId } = req.params;
    const studentId = req.user.id;

    // 1. Get chapter info to find courseId
    const [chapterData] = await db
        .select({ courseId: chapters.courseId })
        .from(chapters)
        .where(eq(chapters.id, chapterId));

    if (!chapterData) {
        throw new NotFound("Chapter not found");
    }

    // 2. Fetch all lessons in this chapter
    const allLessons = await lessonDetailedQuery()
        .where(eq(lessons.chapterId, chapterId))
        .orderBy(asc(lessons.order));

    if (allLessons.length === 0) {
        return SuccessResponse(res, { message: "Lessons fetched successfully", lessons: [] }, 200);
    }

    // 3. Check access for the entire chapter/course
    const hasParentAccess = await checkAccess(studentId, {
        chapterId: chapterId,
        courseId: chapterData.courseId
    });

    // 4. Check individual lesson enrollments
    const lessonIds = allLessons.map(l => l.lesson.id);
    const lessonEnrollments = await db
        .select({ lessonId: enrolledItems.lessonId })
        .from(enrolledItems)
        .where(
            and(
                eq(enrolledItems.studentId, studentId),
                eq(enrolledItems.status, "active"),
                inArray(enrolledItems.lessonId, lessonIds)
            )
        );
    
    const enrolledLessonIds = new Set(lessonEnrollments.map(e => e.lessonId).filter((id): id is string => !!id));

    // Fetch prices for all lessons
    const lessonsPrices = await db
        .select()
        .from(prices)
        .where(
            and(
                eq(prices.targetType, "lesson"),
                inArray(prices.targetId, lessonIds)
            )
        );

    // 5. Format results with isLocked status and prices
    const lessonsWithLockStatus = allLessons.map(row => ({
        ...row,
        isLocked: !hasParentAccess && !enrolledLessonIds.has(row.lesson.id),
        prices: lessonsPrices.filter(p => p.targetId === row.lesson.id)
    }));

    return SuccessResponse(res, {
        message: "Lessons fetched successfully",
        lessons: lessonsWithLockStatus
    }, 200);
};

// 3. Get purchased lessons
export const getPurchasedLessons = async (req: Request, res: Response) => {
    const studentId = req.user.id;

    const purchasedLessons = await db
        .select({
            lesson: lessons,
            chapter: chapters,
            course: courses,
            enrollmentId: enrolledItems.id,
            expiresAt: enrolledItems.expiresAt,
            status: enrolledItems.status,
            createdAt: enrolledItems.createdAt,
        })
        .from(enrolledItems)
        .innerJoin(lessons, eq(enrolledItems.lessonId, lessons.id))
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(courses, eq(lessons.courseId, courses.id))
        .where(
            and(
                eq(enrolledItems.studentId, studentId),
                inArray(enrolledItems.status, ["active", "expired"])
            )
        )
        .orderBy(desc(enrolledItems.createdAt));

    return SuccessResponse(res, { 
        message: "Purchased lessons retrieved successfully", 
        lessons: purchasedLessons.map(p => {
            const isExpired = p.expiresAt && p.expiresAt < new Date();
            return {
                ...p.lesson,
                chapterName: p.chapter?.name,
                courseName: p.course?.name,
                enrollmentId: p.enrollmentId,
                expiresAt: p.expiresAt,
                status: isExpired ? "this is expired" : p.status,
                purchasedAt: p.createdAt
            };
        })
    }, 200);
}
