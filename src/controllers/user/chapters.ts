import { Request, Response } from "express";
import { db } from "../../models/connection";
import { chapters, courses, category, teachers, lessons, semesters, enrolledItems } from "../../models/schema";
import { prices } from "../../models/schema/admin/prices";
import { eq, asc, and, sql, inArray, isNotNull, desc, or, isNull } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { checkAccess } from "../../utils/accessControl";

// Query for fetching chapters with their course, semester, and teacher details
const chapterDetailedQuery = () =>
    db.select({
        chapter: {
            id: chapters.id,
            name: chapters.name,
            description: chapters.description,
            image: chapters.image,
            order: chapters.order,
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
        .from(chapters)
        .leftJoin(courses, eq(chapters.courseId, courses.id))
        .leftJoin(semesters, eq(chapters.semesterId, semesters.id))
        .leftJoin(teachers, eq(chapters.teacherId, teachers.id));

// 1. Get all chapters with dynamic filtering
export const getAllChapters = async (req: Request, res: Response) => {
    const { courseId, semesterId } = req.query;

    let query = chapterDetailedQuery().where(sql`1=1`);

    // If courseId is sent, add it to the filter
    if (courseId) {
        query = chapterDetailedQuery().where(eq(chapters.courseId, courseId as string));
    }

    // If semesterId is sent, add it to the filter (or with courseId)
    if (semesterId) {
        query = chapterDetailedQuery().where(
            courseId
                ? and(eq(chapters.courseId, courseId as string), eq(chapters.semesterId, semesterId as string))
                : eq(chapters.semesterId, semesterId as string)
        );
    }

    const results = await query.orderBy(asc(chapters.order));

    if (results.length === 0) {
        return SuccessResponse(res, { message: "Chapters fetched successfully", chapters: [] }, 200);
    }

    const chapterIds = results.map(r => r.chapter.id);
    const chapterPrices = await db
        .select()
        .from(prices)
        .where(
            and(
                eq(prices.targetType, "chapter"),
                inArray(prices.targetId, chapterIds)
            )
        );

    const chaptersWithPrices = results.map(r => ({
        ...r,
        chapter: {
            ...r.chapter,
            pricePlans: chapterPrices.filter(p => p.targetId === r.chapter.id)
        }
    }));

    return SuccessResponse(res, {
        message: "Chapters fetched successfully",
        chapters: chaptersWithPrices
    }, 200);
}

// 2. Get all chapters by course id
export const getAllChaptersByCourseId = async (req: Request, res: Response) => {
    const { courseId } = req.params;

    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course) throw new BadRequest("Course not found");

    const chaptersList = await chapterDetailedQuery()
        .where(eq(chapters.courseId, courseId))
        .orderBy(asc(chapters.order));

    if (chaptersList.length === 0) {
        return SuccessResponse(res, { message: "Chapters fetched successfully", chapters: [] }, 200);
    }

    const chapterIds = chaptersList.map(r => r.chapter.id);
    const chapterPrices = await db
        .select()
        .from(prices)
        .where(
            and(
                eq(prices.targetType, "chapter"),
                inArray(prices.targetId, chapterIds)
            )
        );

    const chaptersWithPrices = chaptersList.map(r => ({
        ...r,
        chapter: {
            ...r.chapter,
            pricePlans: chapterPrices.filter(p => p.targetId === r.chapter.id)
        }
    }));

    return SuccessResponse(res, { message: "Chapters fetched successfully", chapters: chaptersWithPrices }, 200);
}

// 3. Get chapter by id with its lessons
export const getChapterById = async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get chapter data
    const [chapterData] = await chapterDetailedQuery().where(eq(chapters.id, id));

    if (!chapterData) throw new BadRequest("Chapter not found");

    // Get lessons of this chapter
    const chapterLessons = await db.select()
        .from(lessons)
        .where(eq(lessons.chapterId, id))
        .orderBy(asc(lessons.id));

    const chapterPricePlans = await db
        .select()
        .from(prices)
        .where(
            and(
                eq(prices.targetType, "chapter"),
                eq(prices.targetId, id)
            )
        );

    const hasAccess = await checkAccess(req.user.id, {
        chapterId: id,
        courseId: chapterData.course?.id
    });

    // Check individual lesson enrollments (in case they bought a lesson but not the chapter)
    let enrolledLessonIds = new Set<string>();
    let lessonPrices: any[] = [];
    if (chapterLessons.length > 0) {
        const lessonEnrollments = await db
            .select({ lessonId: enrolledItems.lessonId })
            .from(enrolledItems)
            .where(
                and(
                    eq(enrolledItems.studentId, req.user.id),
                    eq(enrolledItems.status, "active"),
                    inArray(enrolledItems.lessonId, chapterLessons.map(l => l.id))
                )
            );
        enrolledLessonIds = new Set(lessonEnrollments.map(e => e.lessonId).filter((id): id is string => !!id));

        lessonPrices = await db
            .select()
            .from(prices)
            .where(
                and(
                    eq(prices.targetType, "lesson"),
                    inArray(prices.targetId, chapterLessons.map(l => l.id))
                )
            );
    }

    const lessonsWithLockStatus = chapterLessons.map(lesson => ({
        ...lesson,
        isLocked: !hasAccess && !enrolledLessonIds.has(lesson.id),
        pricePlans: lessonPrices.filter(p => p.targetId === lesson.id)
    }));

    return SuccessResponse(res, {
        message: "Chapter details fetched",
        chapter: { 
            ...chapterData.chapter, 
            pricePlans: chapterPricePlans,
            isLocked: !hasAccess
        },
        course: chapterData.course,
        semester: chapterData.semester,
        teacher: chapterData.teacher,
        lessons: lessonsWithLockStatus
    }, 200);
}

// ─── 4. Get purchased chapters ──────────────────────────────────────────────
export const getPurchasedChapters = async (req: Request, res: Response) => {
    const studentId = req.user.id;

    // الاستعلام يبدأ من الـ chapters لضمان فحص علاقتها باشتراكات الكورسات أو اشتراكات الشباتر مباشرة
    const purchasedChapters = await db
        .select({
            chapter: chapters,
            course: courses,
            // نأخذ بيانات الاشتراك سواء جاءت من اشتراك الشابتر نفسه أو اشتراك الكورس الأب
            enrollmentId: enrolledItems.id,
            expiresAt: enrolledItems.expiresAt,
            status: enrolledItems.status,
            createdAt: enrolledItems.createdAt,
        })
        .from(chapters)
        // 1. نربط الكورس التابع له الشابتر لمعرفة تفاصيله والتحقق من اشتراكه
        .leftJoin(courses, eq(chapters.courseId, courses.id))
        // 2. نربط جدول الاشتراكات بشرط ذكي جداً:
        .innerJoin(
            enrolledItems,
            and(
                eq(enrolledItems.studentId, studentId),
                inArray(enrolledItems.status, ["active", "expired"]),
                or(
                    // الحالة الأولى: الطالب اشترى الشابتر ده عينه بذاته
                    eq(enrolledItems.chapterId, chapters.id),
                    // الحالة الثانية: الطالب اشترى الكورس الكامل اللي الشابتر ده جواه
                    and(
                        eq(enrolledItems.courseId, chapters.courseId),
                        isNull(enrolledItems.chapterId), // للتأكد أنه سطر الكورس الكامل وليس شيئاً آخر
                        isNull(enrolledItems.lessonId)
                    )
                )
            )
        )
        // ترتيب المشتريات من الأحدث للأقدم بناءً على تاريخ الاشتراك
        .orderBy(desc(enrolledItems.createdAt));

    // لمنع التكرار في حال كان هناك اشتراك كورس واشتراك شابتر منفصل لنفس العنصر بالخطأ
    const seenChapterIds = new Set<string>();
    const formattedChapters: any[] = [];

    for (const p of purchasedChapters) {
        if (seenChapterIds.has(p.chapter.id)) continue;
        seenChapterIds.add(p.chapter.id);

        const isExpired = p.expiresAt && p.expiresAt < new Date();
        
        formattedChapters.push({
            ...p.chapter,
            courseName: p.course?.name ?? null,
            enrollmentId: p.enrollmentId,
            expiresAt: p.expiresAt,
            status: isExpired ? "this is expired" : p.status,
            purchasedAt: p.createdAt
        });
    }

    return SuccessResponse(res, { 
        message: "Purchased chapters retrieved successfully", 
        count: formattedChapters.length,
        chapters: formattedChapters
    }, 200);
};