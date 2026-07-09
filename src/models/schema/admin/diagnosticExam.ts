import { mysqlTable, char, varchar, timestamp, int, boolean, foreignKey, json } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { questions } from "./questions";
import { rawScore } from "./rawScore";
import { courses } from "./courses";
export const diagnosticExam = mysqlTable("diagnostic_exam", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    title: varchar("title", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }),
    duration: int("duration").notNull(), // Duration in minutes
    totalScore: int("total_score").notNull(),
    passScore: int("pass_score").notNull(),
    rawScoreId: char("raw_score_id", { length: 255 }).notNull().references(() => rawScore.id, { onDelete: "cascade" }),
    numberOfQuestions: int("number_of_questions").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    courseId: char("course_id", { length: 255 }).notNull().references(() => courses.id, { onDelete: "cascade" }),

    // Calculators allowed for this exam (subset of CALCULATOR_TYPES)
    calculators: json("calculators").$type<string[]>().default([]),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const diagnosticExamQuestions = mysqlTable("diagnostic_exam_questions", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    diagnosticExamId: char("diagnostic_exam_id", { length: 255 }).notNull(),
    questionId: char("question_id", { length: 255 }).notNull().references(() => questions.id, { onDelete: "cascade" }),
    score: int("score").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
    diagnosticExamReference: foreignKey({
        columns: [table.diagnosticExamId],
        foreignColumns: [diagnosticExam.id],
        name: "diag_exam_q_exam_id_fk"
    })
}));