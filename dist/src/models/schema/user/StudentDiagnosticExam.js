"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosticExamAttempt = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const mysql_core_1 = require("drizzle-orm/mysql-core");
const mysql_core_2 = require("drizzle-orm/mysql-core");
const Student_1 = require("../admin/Student");
const diagnosticExam_1 = require("../admin/diagnosticExam");
exports.diagnosticExamAttempt = (0, mysql_core_1.mysqlTable)("diagnostic_exam_attempt", {
    id: (0, mysql_core_2.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    studentId: (0, mysql_core_2.char)("studentId", { length: 255 }).references(() => Student_1.Student.id).notNull(),
    diagnosticExamId: (0, mysql_core_2.char)("diagnosticExamId", { length: 255 }).references(() => diagnosticExam_1.diagnosticExam.id).notNull(),
    score: (0, mysql_core_1.int)("score").notNull().default(0),
    isCompleted: (0, mysql_core_1.boolean)("is_completed").notNull().default(false),
    startedAt: (0, mysql_core_1.timestamp)("startedAt").defaultNow().notNull(),
    endedAt: (0, mysql_core_1.timestamp)("endedAt").notNull(),
});
