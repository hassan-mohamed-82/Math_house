import { db } from "../models/connection";
import { enrolledItems, chapters, lessons } from "../models/schema";
import { and, eq, or, isNull, gt, inArray } from "drizzle-orm";

/**
 * Checks if a student has access to an item.
 * An item can be accessed if the student has an active, non-expired enrollment in:
 * - The item itself (Course, Chapter, Lesson)
 * - Any of its parent items (including Semester).
 */
export const checkAccess = async (
    studentId: string,
    ids: { courseId?: string; chapterId?: string; lessonId?: string; semesterId?: string }
) => {
    const conditions: any[] = [];
    if (ids.courseId)   conditions.push(eq(enrolledItems.courseId,   ids.courseId));
    if (ids.chapterId)  conditions.push(eq(enrolledItems.chapterId,  ids.chapterId));
    if (ids.lessonId)   conditions.push(eq(enrolledItems.lessonId,   ids.lessonId));
    if (ids.semesterId) conditions.push(eq(enrolledItems.semesterId, ids.semesterId));

    if (conditions.length === 0) return false;

    const now = new Date();

    const enrollment = await db
        .select({ id: enrolledItems.id })
        .from(enrolledItems)
        .where(
            and(
                eq(enrolledItems.studentId, studentId),
                eq(enrolledItems.status, "active"),
                or(...conditions),
                // Allow access if expiresAt is NULL (no expiry) OR if it hasn't passed yet
                or(
                    isNull(enrolledItems.expiresAt),
                    gt(enrolledItems.expiresAt, now)
                )
            )
        )
        .limit(1);

    return enrollment.length > 0;
};

/**
 * Resolves full access identifiers (courseId, chapterId, semesterId) from a lessonId.
 * Use this before calling checkAccess when you only have a lessonId.
 */
export const resolveAccessIds = async (ids: {
    lessonId?: string;
    chapterId?: string;
    courseId?: string;
    semesterId?: string;
}): Promise<{ lessonId?: string; chapterId?: string; courseId?: string; semesterId?: string }> => {
    let result = { ...ids };

    // If we have a lessonId but are missing chapterId/courseId/semesterId, resolve them
    if (ids.lessonId && (!ids.chapterId || !ids.courseId)) {
        const [lessonData] = await db
            .select({ chapterId: lessons.chapterId, courseId: lessons.courseId })
            .from(lessons)
            .where(eq(lessons.id, ids.lessonId))
            .limit(1);

        if (lessonData) {
            result.chapterId = result.chapterId || lessonData.chapterId;
            result.courseId  = result.courseId  || lessonData.courseId;
        }
    }

    // If we have a chapterId but are missing semesterId, resolve it
    const resolvedChapterId = result.chapterId;
    if (resolvedChapterId && !result.semesterId) {
        const [chapterData] = await db
            .select({ semesterId: chapters.semesterId })
            .from(chapters)
            .where(eq(chapters.id, resolvedChapterId))
            .limit(1);

        if (chapterData?.semesterId) {
            result.semesterId = chapterData.semesterId;
        }
    }

    return result;
};
