"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPurchasedLessons = exports.getLessonsByChapterId = exports.getLessonById = void 0;
const connection_1 = require("../../models/connection");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const schema_1 = require("../../models/schema");
const accessControl_1 = require("../../utils/accessControl");
const lessonDetailedQuery = () => connection_1.db.select({
    lesson: {
        id: schema_1.lessons.id,
        name: schema_1.lessons.name,
        description: schema_1.lessons.description,
        image: schema_1.lessons.image,
        preRequisition: schema_1.lessons.preRequisition,
        whatYouGain: schema_1.lessons.whatYouGain,
        order: schema_1.lessons.order,
    },
    chapter: {
        id: schema_1.chapters.id,
        name: schema_1.chapters.name,
    },
    course: {
        id: schema_1.courses.id,
        name: schema_1.courses.name,
    },
    semester: {
        id: schema_1.semesters.id,
        name: schema_1.semesters.name,
    },
    teacher: {
        id: schema_1.teachers.id,
        name: schema_1.teachers.name,
        avatar: schema_1.teachers.avatar,
    }
})
    .from(schema_1.lessons)
    .leftJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
    .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.lessons.courseId, schema_1.courses.id))
    .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.lessons.teacherId, schema_1.teachers.id))
    .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.chapters.semesterId, schema_1.semesters.id));
const getLessonById = async (req, res) => {
    const { id } = req.params;
    const studentId = req.user.id;
    const [result] = await lessonDetailedQuery().where((0, drizzle_orm_1.eq)(schema_1.lessons.id, id));
    if (!result) {
        throw new Errors_1.NotFound("Lesson not found");
    }
    // Check access
    const hasAccess = await (0, accessControl_1.checkAccess)(studentId, {
        lessonId: id,
        chapterId: result.chapter?.id,
        courseId: result.course?.id
    });
    const lessonPrices = await connection_1.db.select()
        .from(schema_1.prices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetId, id), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "lesson")));
    if (!hasAccess) {
        return (0, response_1.SuccessResponse)(res, {
            message: "Lesson details fetched (Locked)",
            ...result,
            ideas: [], // Hide ideas if locked
            prices: lessonPrices,
            isLocked: true
        }, 200);
    }
    // Fetch ideas for this lesson
    const ideas = await connection_1.db.select().from(schema_1.lessonIdeas)
        .where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, id))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.lessonIdeas.ideaOrder));
    return (0, response_1.SuccessResponse)(res, {
        message: "Lesson fetched successfully",
        ...result,
        ideas,
        prices: lessonPrices,
        isLocked: false
    }, 200);
};
exports.getLessonById = getLessonById;
const getLessonsByChapterId = async (req, res) => {
    const { chapterId } = req.params;
    const studentId = req.user.id;
    // 1. Get chapter info to find courseId
    const [chapterData] = await connection_1.db
        .select({ courseId: schema_1.chapters.courseId })
        .from(schema_1.chapters)
        .where((0, drizzle_orm_1.eq)(schema_1.chapters.id, chapterId));
    if (!chapterData) {
        throw new Errors_1.NotFound("Chapter not found");
    }
    // 2. Fetch all lessons in this chapter
    const allLessons = await lessonDetailedQuery()
        .where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, chapterId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.lessons.order));
    if (allLessons.length === 0) {
        return (0, response_1.SuccessResponse)(res, { message: "Lessons fetched successfully", lessons: [] }, 200);
    }
    // 3. Check access for the entire chapter/course
    const hasParentAccess = await (0, accessControl_1.checkAccess)(studentId, {
        chapterId: chapterId,
        courseId: chapterData.courseId
    });
    // 4. Check individual lesson enrollments
    const lessonIds = allLessons.map(l => l.lesson.id);
    const lessonEnrollments = await connection_1.db
        .select({ lessonId: schema_1.enrolledItems.lessonId })
        .from(schema_1.enrolledItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "active"), (0, drizzle_orm_1.inArray)(schema_1.enrolledItems.lessonId, lessonIds)));
    const enrolledLessonIds = new Set(lessonEnrollments.map(e => e.lessonId).filter((id) => !!id));
    // Fetch prices for all lessons
    const lessonsPrices = await connection_1.db
        .select()
        .from(schema_1.prices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetType, "lesson"), (0, drizzle_orm_1.inArray)(schema_1.prices.targetId, lessonIds)));
    // 5. Format results with isLocked status and prices
    const lessonsWithLockStatus = allLessons.map(row => ({
        ...row,
        isLocked: !hasParentAccess && !enrolledLessonIds.has(row.lesson.id),
        prices: lessonsPrices.filter(p => p.targetId === row.lesson.id)
    }));
    return (0, response_1.SuccessResponse)(res, {
        message: "Lessons fetched successfully",
        lessons: lessonsWithLockStatus
    }, 200);
};
exports.getLessonsByChapterId = getLessonsByChapterId;
// 3. Get purchased lessons
const getPurchasedLessons = async (req, res) => {
    const studentId = req.user.id;
    const purchasedLessons = await connection_1.db
        .select({
        lesson: schema_1.lessons,
        chapter: schema_1.chapters,
        course: schema_1.courses,
        enrollmentId: schema_1.enrolledItems.id,
        expiresAt: schema_1.enrolledItems.expiresAt,
        status: schema_1.enrolledItems.status,
        createdAt: schema_1.enrolledItems.createdAt,
    })
        .from(schema_1.lessons)
        // نربط الشابتر والكورس لجلب أسمائهم وفحص شروط الوراثة
        .leftJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.lessons.courseId, schema_1.courses.id))
        // 2. الـ innerJoin الذكي مع جدول الاشتراكات بـ 3 شروط (OR)
        .innerJoin(schema_1.enrolledItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, studentId), (0, drizzle_orm_1.inArray)(schema_1.enrolledItems.status, ["active", "expired"]), (0, drizzle_orm_1.or)(
    // الحالة الأولى: شراء الدرس عينه بذاته
    (0, drizzle_orm_1.eq)(schema_1.enrolledItems.lessonId, schema_1.lessons.id), 
    // الحالة الثانية: شراء الشابتر كامل (الدرس ينتمي لهذا الشابتر، وحقل الدرس في الفاتورة فارغ)
    (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.chapterId, schema_1.lessons.chapterId), (0, drizzle_orm_1.isNull)(schema_1.enrolledItems.lessonId)), 
    // الحالة الثالثة: شراء الكورس كامل (الدرس ينتمي لهذا الكورس، وحقول الشابتر والدرس في الفاتورة فارغة)
    (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.courseId, schema_1.lessons.courseId), (0, drizzle_orm_1.isNull)(schema_1.enrolledItems.chapterId), (0, drizzle_orm_1.isNull)(schema_1.enrolledItems.lessonId)))))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.enrolledItems.createdAt));
    const now = new Date();
    // 3. حماية لمنع تكرار الدروس في حال وجود اشتراك كورس واشتراك درس منفصل في نفس الوقت
    const seenLessonIds = new Set();
    const formattedLessons = [];
    for (const p of purchasedLessons) {
        if (seenLessonIds.has(p.lesson.id))
            continue;
        seenLessonIds.add(p.lesson.id);
        const isExpired = p.expiresAt && p.expiresAt < now;
        formattedLessons.push({
            ...p.lesson,
            chapterName: p.chapter?.name ?? null,
            courseName: p.course?.name ?? null,
            enrollmentId: p.enrollmentId,
            expiresAt: p.expiresAt,
            status: isExpired ? "expired" : p.status,
            purchasedAt: p.createdAt
        });
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Purchased lessons retrieved successfully",
        count: formattedLessons.length,
        lessons: formattedLessons
    }, 200);
};
exports.getPurchasedLessons = getPurchasedLessons;
