"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionStudentQuestionRatings = exports.sessionStudentRatings = exports.sessionRatingQuestions = void 0;
// schema/admin/SessionRatingQuestions.ts
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Session_1 = require("./Session");
const Student_1 = require("./Student");
const teacher_1 = require("./teacher");
const admin_1 = require("./admin");
/**
 * Dynamic Session Rating / Evaluation Questions configured by Admin
 * E.g., "Understanding concepts", "Participation & Focus", "Homework completion", "Behavior"
 */
exports.sessionRatingQuestions = (0, mysql_core_1.mysqlTable)("session_rating_questions", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    category: (0, mysql_core_1.varchar)("category", { length: 100 }).default("general"), // academic, behavioral, general
    weight: (0, mysql_core_1.int)("weight").default(1),
    order: (0, mysql_core_1.int)("order").default(0),
    isActive: (0, mysql_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
/**
 * Master post-session evaluation record for a student in a session
 */
exports.sessionStudentRatings = (0, mysql_core_1.mysqlTable)("session_student_ratings", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sessionId: (0, mysql_core_1.char)("session_id", { length: 36 }).notNull().references(() => Session_1.sessions.id, { onDelete: "cascade" }),
    studentId: (0, mysql_core_1.char)("student_id", { length: 255 }).notNull().references(() => Student_1.Student.id, { onDelete: "cascade" }),
    // Overall average score calculated from question ratings (1.00 to 10.00)
    overallRating: (0, mysql_core_1.double)("overall_rating").notNull(),
    generalComment: (0, mysql_core_1.text)("general_comment"),
    ratedByAdminId: (0, mysql_core_1.char)("rated_by_admin_id", { length: 36 }).references(() => admin_1.admins.id, { onDelete: "set null" }),
    ratedByTeacherId: (0, mysql_core_1.char)("rated_by_teacher_id", { length: 255 }).references(() => teacher_1.teachers.id, { onDelete: "set null" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    (0, mysql_core_1.uniqueIndex)("session_student_rating_unique").on(table.sessionId, table.studentId),
    (0, mysql_core_1.index)("session_student_ratings_student_idx").on(table.studentId),
    (0, mysql_core_1.index)("session_student_ratings_session_idx").on(table.sessionId),
]);
/**
 * Breakdown scores (1 to 10) for each evaluation question
 */
exports.sessionStudentQuestionRatings = (0, mysql_core_1.mysqlTable)("session_student_question_ratings", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sessionStudentRatingId: (0, mysql_core_1.char)("session_student_rating_id", { length: 36 }).notNull().references(() => exports.sessionStudentRatings.id, { onDelete: "cascade" }),
    questionId: (0, mysql_core_1.char)("question_id", { length: 36 }).notNull().references(() => exports.sessionRatingQuestions.id, { onDelete: "cascade" }),
    // Rating score from 1 to 10
    rating: (0, mysql_core_1.int)("rating").notNull(),
    comment: (0, mysql_core_1.text)("comment"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    (0, mysql_core_1.uniqueIndex)("rating_question_unique").on(table.sessionStudentRatingId, table.questionId),
    (0, mysql_core_1.index)("student_q_rating_qid_idx").on(table.questionId),
]);
