import { mysqlTable, char, varchar, boolean, int, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { studentParallelAttempts } from "./studentParallelAttempts";
import { ParallelQuestion, ParallelQuestionOptions } from "./questions";

export const studentParallelAnswers = mysqlTable("student_parallel_answers", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    parallelAttemptId: char("parallel_attempt_id", { length: 255 }).notNull().references(() => studentParallelAttempts.id, { onDelete: "cascade" }),
    parallelQuestionId: char("parallel_question_id", { length: 255 }).notNull().references(() => ParallelQuestion.id, { onDelete: "cascade" }),
    selectedOptionId: char("selected_option_id", { length: 255 }).references(() => ParallelQuestionOptions.id, { onDelete: "set null" }),
    gridInAnswer: varchar("grid_in_answer", { length: 255 }),
    isCorrect: boolean("is_correct").notNull().default(false),
    score: int("score").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
