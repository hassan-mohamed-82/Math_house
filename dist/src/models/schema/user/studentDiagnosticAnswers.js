"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentDiagnosticAnswers = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const mysql_core_1 = require("drizzle-orm/mysql-core");
const StudentDiagnosticExam_1 = require("./StudentDiagnosticExam");
const questions_1 = require("../admin/questions");
exports.studentDiagnosticAnswers = (0, mysql_core_1.mysqlTable)("diagnostic_exam_attempt_answers", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    attemptId: (0, mysql_core_1.char)("attempt_id", { length: 255 }).notNull(),
    questionId: (0, mysql_core_1.char)("question_id", { length: 255 }).notNull(),
    // Storing user's input: either the selected option ID (for MCQ) or text (for Grid-in)
    studentAnswerId: (0, mysql_core_1.char)("student_answer_id", { length: 255 }),
    studentGridInAnswer: (0, mysql_core_1.varchar)("student_grid_in_answer", { length: 255 }),
    // Result calculations
    isCorrect: (0, mysql_core_1.boolean)("is_correct").notNull().default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
    attemptRef: (0, mysql_core_1.foreignKey)({
        columns: [table.attemptId],
        foreignColumns: [StudentDiagnosticExam_1.diagnosticExamAttempt.id],
        name: "diag_attempt_ans_attempt_fk"
    }),
    questionRef: (0, mysql_core_1.foreignKey)({
        columns: [table.questionId],
        foreignColumns: [questions_1.questions.id],
        name: "diag_attempt_ans_question_fk"
    }),
    answerOptionRef: (0, mysql_core_1.foreignKey)({
        columns: [table.studentAnswerId],
        foreignColumns: [questions_1.questionOptions.id],
        name: "diag_attempt_ans_option_fk"
    }),
}));
