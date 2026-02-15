import { mysqlTable, char, varchar, timestamp, int, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { questions } from "./questions";

export const diagnosticExam = mysqlTable("diagnostic_exam", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    title: varchar("title", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }),
    duration: int("duration").notNull(), // Duration in minutes
    totalScore: int("total_score").notNull(),
    passScore: int("pass_score").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const diagnosticExamQuestions = mysqlTable("diagnostic_exam_questions", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    diagnosticExamId: char("diagnostic_exam_id", { length: 255 }).notNull().references(() => diagnosticExam.id),
    questionId: char("question_id", { length: 255 }).notNull().references(() => questions.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});