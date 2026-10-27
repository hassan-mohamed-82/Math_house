"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAccessIds = exports.checkAccess = void 0;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Checks if a student has access to an item.
 * An item can be accessed if the student has an active, non-expired enrollment in:
 * - The item itself (Course, Chapter, Lesson)
 * - Any of its parent items (including Semester).
 */
const checkAccess = async (studentId, ids) => {
    const conditions = [];
    if (ids.courseId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.enrolledItems.courseId, ids.courseId));
    if (ids.chapterId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.enrolledItems.chapterId, ids.chapterId));
    if (ids.lessonId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.enrolledItems.lessonId, ids.lessonId));
    if (ids.semesterId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.enrolledItems.semesterId, ids.semesterId));
    if (conditions.length === 0)
        return false;
    const now = new Date();
    const enrollment = await connection_1.db
        .select({ id: schema_1.enrolledItems.id })
        .from(schema_1.enrolledItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "active"), (0, drizzle_orm_1.or)(...conditions), 
    // Allow access if expiresAt is NULL (no expiry) OR if it hasn't passed yet
    (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.enrolledItems.expiresAt), (0, drizzle_orm_1.gt)(schema_1.enrolledItems.expiresAt, now))))
        .limit(1);
    return enrollment.length > 0;
};
exports.checkAccess = checkAccess;
/**
 * Resolves full access identifiers (courseId, chapterId, semesterId) from a lessonId.
 * Use this before calling checkAccess when you only have a lessonId.
 */
const resolveAccessIds = async (ids) => {
    let result = { ...ids };
    // If we have a lessonId but are missing chapterId/courseId/semesterId, resolve them
    if (ids.lessonId && (!ids.chapterId || !ids.courseId)) {
        const [lessonData] = await connection_1.db
            .select({ chapterId: schema_1.lessons.chapterId, courseId: schema_1.lessons.courseId })
            .from(schema_1.lessons)
            .where((0, drizzle_orm_1.eq)(schema_1.lessons.id, ids.lessonId))
            .limit(1);
        if (lessonData) {
            result.chapterId = result.chapterId || lessonData.chapterId;
            result.courseId = result.courseId || lessonData.courseId;
        }
    }
    // If we have a chapterId but are missing semesterId, resolve it
    const resolvedChapterId = result.chapterId;
    if (resolvedChapterId && !result.semesterId) {
        const [chapterData] = await connection_1.db
            .select({ semesterId: schema_1.chapters.semesterId })
            .from(schema_1.chapters)
            .where((0, drizzle_orm_1.eq)(schema_1.chapters.id, resolvedChapterId))
            .limit(1);
        if (chapterData?.semesterId) {
            result.semesterId = chapterData.semesterId;
        }
    }
    return result;
};
exports.resolveAccessIds = resolveAccessIds;
