// schema/admin/ExtraHomework.ts
import { mysqlTable, varchar, char, timestamp, text, mysqlEnum, double, uniqueIndex, index } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "./Student";
import { category } from "./category";
import { grade } from "./grade";
import { groups } from "./Groups";
import { admins } from "./admin";

/**
 * Standalone Extra Homework assigned by Admin (Not tied to any course/lesson)
 */
export const extraHomework = mysqlTable("extra_homework", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    
    // Assignment attachments
    pdfUrl: varchar("pdf_url", { length: 500 }), // Uploaded homework PDF
    link: varchar("link", { length: 500 }),       // External URL link / reference
    
    dueDate: timestamp("due_date"),
    
    // Target audience type
    targetType: mysqlEnum("target_type", ["all", "category", "grade", "group", "individual"]).default("individual").notNull(),
    targetCategoryId: char("target_category_id", { length: 255 }).references(() => category.id, { onDelete: "set null" }),
    targetGradeId: char("target_grade_id", { length: 36 }).references(() => grade.id, { onDelete: "set null" }),
    targetGroupId: char("target_group_id", { length: 36 }).references(() => groups.id, { onDelete: "set null" }),
    
    createdBy: char("created_by", { length: 255 }).references(() => admins.id, { onDelete: "set null" }),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/**
 * Assignment mapping & submission per student
 */
export const extraHomeworkStudents = mysqlTable("extra_homework_students", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    homeworkId: char("homework_id", { length: 36 }).notNull().references(() => extraHomework.id, { onDelete: "cascade" }),
    studentId: char("student_id", { length: 255 }).notNull().references(() => Student.id, { onDelete: "cascade" }),
    
    // Submission status
    status: mysqlEnum("status", ["assigned", "submitted", "reviewed", "graded"]).default("assigned").notNull(),
    
    // Student uploaded solution
    submittedPdf: varchar("submitted_pdf", { length: 500 }),
    submittedAt: timestamp("submitted_at"),
    studentNotes: text("student_notes"),
    
    // Admin / Teacher evaluation
    score: double("score"), // e.g. 0 to 100 or points
    feedback: text("feedback"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: char("reviewed_by", { length: 36 }).references(() => admins.id, { onDelete: "set null" }),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    uniqueIndex("extra_homework_student_unique").on(table.homeworkId, table.studentId),
    index("extra_homework_students_student_idx").on(table.studentId),
    index("extra_homework_students_hw_idx").on(table.homeworkId),
    index("extra_homework_students_status_idx").on(table.status),
]);
