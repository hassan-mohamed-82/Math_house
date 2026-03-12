import { sql } from "drizzle-orm";
import { mysqlTable, char, varchar, boolean, timestamp, foreignKey } from "drizzle-orm/mysql-core";
import { diagnosticExamAttempt } from "./StudentDiagnosticExam";
import { questions, questionOptions } from "../admin/questions";

export const studentDiagnosticAnswers = mysqlTable("diagnostic_exam_attempt_answers", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    attemptId: char("attempt_id", { length: 255 }).notNull(),
    questionId: char("question_id", { length: 255 }).notNull(),

    // Storing user's input: either the selected option ID (for MCQ) or text (for Grid-in)
    studentAnswerId: char("student_answer_id", { length: 255 }),
    studentGridInAnswer: varchar("student_grid_in_answer", { length: 255 }),

    // Result calculations
    isCorrect: boolean("is_correct").notNull().default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
    attemptRef: foreignKey({
        columns: [table.attemptId],
        foreignColumns: [diagnosticExamAttempt.id],
        name: "diag_attempt_ans_attempt_fk"
    }),
    questionRef: foreignKey({
        columns: [table.questionId],
        foreignColumns: [questions.id],
        name: "diag_attempt_ans_question_fk"
    }),
    answerOptionRef: foreignKey({
        columns: [table.studentAnswerId],
        foreignColumns: [questionOptions.id],
        name: "diag_attempt_ans_option_fk"
    }),
}));
