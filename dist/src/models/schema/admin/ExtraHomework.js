"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extraHomeworkStudents = exports.extraHomework = void 0;
// schema/admin/ExtraHomework.ts
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Student_1 = require("./Student");
const category_1 = require("./category");
const grade_1 = require("./grade");
const Groups_1 = require("./Groups");
const admin_1 = require("./admin");
/**
 * Standalone Extra Homework assigned by Admin (Not tied to any course/lesson)
 */
exports.extraHomework = (0, mysql_core_1.mysqlTable)("extra_homework", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    // Assignment attachments
    pdfUrl: (0, mysql_core_1.varchar)("pdf_url", { length: 500 }), // Uploaded homework PDF
    link: (0, mysql_core_1.varchar)("link", { length: 500 }), // External URL link / reference
    dueDate: (0, mysql_core_1.timestamp)("due_date"),
    // Target audience type
    targetType: (0, mysql_core_1.mysqlEnum)("target_type", ["all", "category", "grade", "group", "individual"]).default("individual").notNull(),
    targetCategoryId: (0, mysql_core_1.char)("target_category_id", { length: 255 }).references(() => category_1.category.id, { onDelete: "set null" }),
    targetGradeId: (0, mysql_core_1.char)("target_grade_id", { length: 36 }).references(() => grade_1.grade.id, { onDelete: "set null" }),
    targetGroupId: (0, mysql_core_1.char)("target_group_id", { length: 36 }).references(() => Groups_1.groups.id, { onDelete: "set null" }),
    createdBy: (0, mysql_core_1.char)("created_by", { length: 255 }).references(() => admin_1.admins.id, { onDelete: "set null" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
/**
 * Assignment mapping & submission per student
 */
exports.extraHomeworkStudents = (0, mysql_core_1.mysqlTable)("extra_homework_students", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    homeworkId: (0, mysql_core_1.char)("homework_id", { length: 36 }).notNull().references(() => exports.extraHomework.id, { onDelete: "cascade" }),
    studentId: (0, mysql_core_1.char)("student_id", { length: 255 }).notNull().references(() => Student_1.Student.id, { onDelete: "cascade" }),
    // Submission status
    status: (0, mysql_core_1.mysqlEnum)("status", ["assigned", "submitted", "reviewed", "graded"]).default("assigned").notNull(),
    // Student uploaded solution
    submittedPdf: (0, mysql_core_1.varchar)("submitted_pdf", { length: 500 }),
    submittedAt: (0, mysql_core_1.timestamp)("submitted_at"),
    studentNotes: (0, mysql_core_1.text)("student_notes"),
    // Admin / Teacher evaluation
    score: (0, mysql_core_1.double)("score"), // e.g. 0 to 100 or points
    feedback: (0, mysql_core_1.text)("feedback"),
    reviewedAt: (0, mysql_core_1.timestamp)("reviewed_at"),
    reviewedBy: (0, mysql_core_1.char)("reviewed_by", { length: 36 }).references(() => admin_1.admins.id, { onDelete: "set null" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    (0, mysql_core_1.uniqueIndex)("extra_homework_student_unique").on(table.homeworkId, table.studentId),
    (0, mysql_core_1.index)("extra_homework_students_student_idx").on(table.studentId),
    (0, mysql_core_1.index)("extra_homework_students_hw_idx").on(table.homeworkId),
    (0, mysql_core_1.index)("extra_homework_students_status_idx").on(table.status),
]);
