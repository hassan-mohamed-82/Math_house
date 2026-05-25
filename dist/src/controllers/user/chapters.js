"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChapterById = exports.getAllChaptersByCourseId = exports.getAllChapters = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const prices_1 = require("../../models/schema/admin/prices");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const accessControl_1 = require("../../utils/accessControl");
// Query for fetching chapters with their course, semester, and teacher details
const chapterDetailedQuery = () => connection_1.db.select({
    chapter: {
        id: schema_1.chapters.id,
        name: schema_1.chapters.name,
        description: schema_1.chapters.description,
        image: schema_1.chapters.image,
        order: schema_1.chapters.order,
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
    .from(schema_1.chapters)
    .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, schema_1.courses.id))
    .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.chapters.semesterId, schema_1.semesters.id))
    .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.chapters.teacherId, schema_1.teachers.id));
// 1. Get all chapters with dynamic filtering
const getAllChapters = async (req, res) => {
    const { courseId, semesterId } = req.query;
    let query = chapterDetailedQuery().where((0, drizzle_orm_1.sql) `1=1`);
    // If courseId is sent, add it to the filter
    if (courseId) {
        query = chapterDetailedQuery().where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courseId));
    }
    // If semesterId is sent, add it to the filter (or with courseId)
    if (semesterId) {
        query = chapterDetailedQuery().where(courseId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courseId), (0, drizzle_orm_1.eq)(schema_1.chapters.semesterId, semesterId))
            : (0, drizzle_orm_1.eq)(schema_1.chapters.semesterId, semesterId));
    }
    const results = await query.orderBy((0, drizzle_orm_1.asc)(schema_1.chapters.order));
    if (results.length === 0) {
        return (0, response_1.SuccessResponse)(res, { message: "Chapters fetched successfully", chapters: [] }, 200);
    }
    const chapterIds = results.map(r => r.chapter.id);
    const chapterPrices = await connection_1.db
        .select()
        .from(prices_1.prices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.targetType, "chapter"), (0, drizzle_orm_1.inArray)(prices_1.prices.targetId, chapterIds)));
    const chaptersWithPrices = results.map(r => ({
        ...r,
        chapter: {
            ...r.chapter,
            pricePlans: chapterPrices.filter(p => p.targetId === r.chapter.id)
        }
    }));
    return (0, response_1.SuccessResponse)(res, {
        message: "Chapters fetched successfully",
        chapters: chaptersWithPrices
    }, 200);
};
exports.getAllChapters = getAllChapters;
// 2. Get all chapters by course id
const getAllChaptersByCourseId = async (req, res) => {
    const { courseId } = req.params;
    const [course] = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
    if (!course)
        throw new BadRequest_1.BadRequest("Course not found");
    const chaptersList = await chapterDetailedQuery()
        .where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courseId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.chapters.order));
    if (chaptersList.length === 0) {
        return (0, response_1.SuccessResponse)(res, { message: "Chapters fetched successfully", chapters: [] }, 200);
    }
    const chapterIds = chaptersList.map(r => r.chapter.id);
    const chapterPrices = await connection_1.db
        .select()
        .from(prices_1.prices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.targetType, "chapter"), (0, drizzle_orm_1.inArray)(prices_1.prices.targetId, chapterIds)));
    const chaptersWithPrices = chaptersList.map(r => ({
        ...r,
        chapter: {
            ...r.chapter,
            pricePlans: chapterPrices.filter(p => p.targetId === r.chapter.id)
        }
    }));
    return (0, response_1.SuccessResponse)(res, { message: "Chapters fetched successfully", chapters: chaptersWithPrices }, 200);
};
exports.getAllChaptersByCourseId = getAllChaptersByCourseId;
// 3. Get chapter by id with its lessons
const getChapterById = async (req, res) => {
    const { id } = req.params;
    // Get chapter data
    const [chapterData] = await chapterDetailedQuery().where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
    if (!chapterData)
        throw new BadRequest_1.BadRequest("Chapter not found");
    // Get lessons of this chapter
    const chapterLessons = await connection_1.db.select()
        .from(schema_1.lessons)
        .where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, id))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.lessons.id));
    const chapterPricePlans = await connection_1.db
        .select()
        .from(prices_1.prices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.targetType, "chapter"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, id)));
    const hasAccess = await (0, accessControl_1.checkAccess)(req.user.id, {
        chapterId: id,
        courseId: chapterData.course?.id
    });
    // Check individual lesson enrollments (in case they bought a lesson but not the chapter)
    let enrolledLessonIds = new Set();
    if (chapterLessons.length > 0) {
        const lessonEnrollments = await connection_1.db
            .select({ lessonId: schema_1.enrolledItems.lessonId })
            .from(schema_1.enrolledItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, req.user.id), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "active"), (0, drizzle_orm_1.inArray)(schema_1.enrolledItems.lessonId, chapterLessons.map(l => l.id))));
        enrolledLessonIds = new Set(lessonEnrollments.map(e => e.lessonId).filter((id) => !!id));
    }
    const lessonsWithLockStatus = chapterLessons.map(lesson => ({
        ...lesson,
        isLocked: !hasAccess && !enrolledLessonIds.has(lesson.id)
    }));
    return (0, response_1.SuccessResponse)(res, {
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
};
exports.getChapterById = getChapterById;
