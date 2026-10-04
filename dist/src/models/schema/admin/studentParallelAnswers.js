"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentParallelAnswers = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const studentParallelAttempts_1 = require("./studentParallelAttempts");
const questions_1 = require("./questions");
exports.studentParallelAnswers = (0, mysql_core_1.mysqlTable)("student_parallel_answers", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    parallelAttemptId: (0, mysql_core_1.char)("parallel_attempt_id", { length: 255 }).notNull().references(() => studentParallelAttempts_1.studentParallelAttempts.id, { onDelete: "cascade" }),
    parallelQuestionId: (0, mysql_core_1.char)("parallel_question_id", { length: 255 }).notNull().references(() => questions_1.ParallelQuestion.id, { onDelete: "cascade" }),
    selectedOptionId: (0, mysql_core_1.char)("selected_option_id", { length: 255 }).references(() => questions_1.ParallelQuestionOptions.id, { onDelete: "set null" }),
    gridInAnswer: (0, mysql_core_1.varchar)("grid_in_answer", { length: 255 }),
    isCorrect: (0, mysql_core_1.boolean)("is_correct").notNull().default(false),
    score: (0, mysql_core_1.int)("score").notNull().default(0),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
