import { mysqlTable, char, varchar, timestamp, int, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { quizAttempts } from "./quizAttempts";
import { questions, questionOptions } from "./questions";

export const studentQuizAnswers = mysqlTable("student_quiz_answers", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    attemptId: char("attempt_id", { length: 255 }).notNull().references(() => quizAttempts.id),
    questionId: char("question_id", { length: 255 }).notNull().references(() => questions.id),
    selectedOptionId: char("selected_option_id", { length: 255 }).references(() => questionOptions.id, { onDelete: "set null" }),
    gridInAnswer: varchar("grid_in_answer", { length: 255 }),
    isCorrect: boolean("is_correct").notNull().default(false),
    score: int("score").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
