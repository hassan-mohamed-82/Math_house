import { mysqlTable, char, timestamp, datetime, int, boolean, mysqlEnum, uniqueIndex } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "./Student";
import { Exams, ExamSections } from "./exams";
import { v4 as uuidv4 } from "uuid";

export const examAttempts = mysqlTable("exam_attempts", {
    id: char("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => uuidv4()),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id, { onDelete: "cascade" }),
    examId: char("exam_id", { length: 255 }).notNull().references(() => Exams.id, { onDelete: "cascade" }),
    startedAt: datetime("started_at").notNull().default(sql`(now())`),
    endedAt: datetime("ended_at"),
    score: int("score"),
    isPassed: boolean("is_passed"),
    status: mysqlEnum("status", ["in_progress", "completed", "timed_out"]).notNull().default("in_progress"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
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
export const sectionAttempts = mysqlTable("section_attempts", {
    id: char("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => uuidv4()),
    attemptId: char("attempt_id", { length: 255 }).notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
    examSectionId: char("exam_section_id", { length: 255 }).notNull().references(() => ExamSections.id, { onDelete: "cascade" }),
    startedAt: datetime("started_at"),                    // Set when student enters the section
    endedAt: datetime("ended_at"),                        // Set when student submits or times out
    breakStartedAt: datetime("break_started_at"),         // Set when student starts a break
    score: int("score"),                                  // Achieved score for this section (set on submit)
    status: mysqlEnum("status", ["not_started", "in_progress", "on_break", "completed", "timed_out"]).notNull().default("not_started"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
    // Prevent duplicate section-attempt rows for the same section within the same exam attempt
    attemptSectionUnique: uniqueIndex("section_attempts_attempt_section_unique").on(table.attemptId, table.examSectionId),
}));