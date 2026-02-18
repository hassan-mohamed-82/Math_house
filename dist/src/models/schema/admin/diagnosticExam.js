"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosticExamQuestions = exports.diagnosticExam = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const questions_1 = require("./questions");
const rawScore_1 = require("./rawScore");
exports.diagnosticExam = (0, mysql_core_1.mysqlTable)("diagnostic_exam", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.varchar)("description", { length: 255 }),
    duration: (0, mysql_core_1.int)("duration").notNull(), // Duration in minutes
    totalScore: (0, mysql_core_1.int)("total_score").notNull(),
    passScore: (0, mysql_core_1.int)("pass_score").notNull(),
    rawScoreId: (0, mysql_core_1.char)("raw_score_id", { length: 255 }).notNull().references(() => rawScore_1.rawScore.id),
    numberOfQuestions: (0, mysql_core_1.int)("number_of_questions").notNull(),
    isActive: (0, mysql_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.diagnosticExamQuestions = (0, mysql_core_1.mysqlTable)("diagnostic_exam_questions", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    diagnosticExamId: (0, mysql_core_1.char)("diagnostic_exam_id", { length: 255 }).notNull(),
    questionId: (0, mysql_core_1.char)("question_id", { length: 255 }).notNull().references(() => questions_1.questions.id),
    score: (0, mysql_core_1.int)("score").notNull().default(0),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
    diagnosticExamReference: (0, mysql_core_1.foreignKey)({
        columns: [table.diagnosticExamId],
        foreignColumns: [exports.diagnosticExam.id],
        name: "diag_exam_q_exam_id_fk"
    })
}));
