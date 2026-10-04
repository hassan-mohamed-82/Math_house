"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sectionAttempts = exports.examAttempts = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Student_1 = require("./Student");
const exams_1 = require("./exams");
const uuid_1 = require("uuid");
exports.examAttempts = (0, mysql_core_1.mysqlTable)("exam_attempts", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => (0, uuid_1.v4)()),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id, { onDelete: "cascade" }),
    examId: (0, mysql_core_1.char)("exam_id", { length: 255 }).notNull().references(() => exams_1.Exams.id, { onDelete: "cascade" }),
    startedAt: (0, mysql_core_1.datetime)("started_at").notNull().default((0, drizzle_orm_1.sql) `(now())`),
    endedAt: (0, mysql_core_1.datetime)("ended_at"),
    score: (0, mysql_core_1.int)("score"),
    isPassed: (0, mysql_core_1.boolean)("is_passed"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["in_progress", "completed", "timed_out"]).notNull().default("in_progress"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
/**
 * Tracks a student's attempt at a single section within an exam.
 * Students can solve sections independently and take breaks between them.
 *
 * Status flow:
 *   not_started → in_progress → on_break → completed | timed_out
 *
 * Re-entry is only allowed when status = 'in_progress' or 'on_break'.
 */
exports.sectionAttempts = (0, mysql_core_1.mysqlTable)("section_attempts", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => (0, uuid_1.v4)()),
    attemptId: (0, mysql_core_1.char)("attempt_id", { length: 255 }).notNull().references(() => exports.examAttempts.id, { onDelete: "cascade" }),
    examSectionId: (0, mysql_core_1.char)("exam_section_id", { length: 255 }).notNull().references(() => exams_1.ExamSections.id, { onDelete: "cascade" }),
    startedAt: (0, mysql_core_1.datetime)("started_at"), // Set when student enters the section
    endedAt: (0, mysql_core_1.datetime)("ended_at"), // Set when student submits or times out
    breakStartedAt: (0, mysql_core_1.datetime)("break_started_at"), // Set when student starts a break
    score: (0, mysql_core_1.int)("score"), // Achieved score for this section (set on submit)
    status: (0, mysql_core_1.mysqlEnum)("status", ["not_started", "in_progress", "on_break", "completed", "timed_out"]).notNull().default("not_started"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
    // Prevent duplicate section-attempt rows for the same section within the same exam attempt
    attemptSectionUnique: (0, mysql_core_1.uniqueIndex)("section_attempts_attempt_section_unique").on(table.attemptId, table.examSectionId),
}));
