"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAccess = void 0;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Checks if a student has access to an item.
 * An item can be accessed if the student has an active enrollment in:
 * - The item itself (Course, Chapter, or Lesson)
 * - Any of its parent items.
 */
const checkAccess = async (studentId, ids) => {
    const conditions = [];
    if (ids.courseId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.enrolledItems.courseId, ids.courseId));
    if (ids.chapterId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.enrolledItems.chapterId, ids.chapterId));
    if (ids.lessonId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.enrolledItems.lessonId, ids.lessonId));
    if (conditions.length === 0)
        return false;
    const enrollment = await connection_1.db
        .select()
        .from(schema_1.enrolledItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "active"), (0, drizzle_orm_1.or)(...conditions)))
        .limit(1);
    return enrollment.length > 0;
};
exports.checkAccess = checkAccess;
