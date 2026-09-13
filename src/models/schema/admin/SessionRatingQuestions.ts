// schema/admin/SessionRatingQuestions.ts
import { mysqlTable, varchar, char, timestamp, text, int, double, boolean, uniqueIndex, index } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { sessions } from "./Session";
import { Student } from "./Student";
import { teachers } from "./teacher";
import { admins } from "./admin";

/**
 * Dynamic Session Rating / Evaluation Questions configured by Admin
 * E.g., "Understanding concepts", "Participation & Focus", "Homework completion", "Behavior"
 */
export const sessionRatingQuestions = mysqlTable("session_rating_questions", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }).default("general"), // academic, behavioral, general
    weight: int("weight").default(1),
    order: int("order").default(0),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/**
 * Master post-session evaluation record for a student in a session
 */
export const sessionStudentRatings = mysqlTable("session_student_ratings", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
    studentId: char("student_id", { length: 255 }).notNull().references(() => Student.id, { onDelete: "cascade" }),
    
    // Overall average score calculated from question ratings (1.00 to 10.00)
    overallRating: double("overall_rating").notNull(),
    
    generalComment: text("general_comment"),
    ratedByAdminId: char("rated_by_admin_id", { length: 36 }).references(() => admins.id, { onDelete: "set null" }),
    ratedByTeacherId: char("rated_by_teacher_id", { length: 255 }).references(() => teachers.id, { onDelete: "set null" }),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    uniqueIndex("session_student_rating_unique").on(table.sessionId, table.studentId),
    index("session_student_ratings_student_idx").on(table.studentId),
    index("session_student_ratings_session_idx").on(table.sessionId),
]);

/**
 * Breakdown scores (1 to 10) for each evaluation question
 */
export const sessionStudentQuestionRatings = mysqlTable("session_student_question_ratings", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionStudentRatingId: char("session_student_rating_id", { length: 36 }).notNull().references(() => sessionStudentRatings.id, { onDelete: "cascade" }),
    questionId: char("question_id", { length: 36 }).notNull().references(() => sessionRatingQuestions.id, { onDelete: "cascade" }),
    
    // Rating score from 1 to 10
    rating: int("rating").notNull(),
    comment: text("comment"),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    uniqueIndex("rating_question_unique").on(table.sessionStudentRatingId, table.questionId),
    index("student_q_rating_qid_idx").on(table.questionId),
]);
