import { db } from "../models/connection";
import { enrolledItems } from "../models/schema";
import { and, eq, or } from "drizzle-orm";

/**
 * Checks if a student has access to an item.
 * An item can be accessed if the student has an active enrollment in:
 * - The item itself (Course, Chapter, or Lesson)
 * - Any of its parent items.
 */
export const checkAccess = async (studentId: string, ids: { courseId?: string, chapterId?: string, lessonId?: string }) => {
    const conditions = [];
    if (ids.courseId) conditions.push(eq(enrolledItems.courseId, ids.courseId));
    if (ids.chapterId) conditions.push(eq(enrolledItems.chapterId, ids.chapterId));
    if (ids.lessonId) conditions.push(eq(enrolledItems.lessonId, ids.lessonId));

    if (conditions.length === 0) return false;

    const enrollment = await db
        .select()
        .from(enrolledItems)
        .where(
            and(
                eq(enrolledItems.studentId, studentId),
                eq(enrolledItems.status, "active"),
                or(...conditions)
            )
        )
        .limit(1);

    return enrollment.length > 0;
};
