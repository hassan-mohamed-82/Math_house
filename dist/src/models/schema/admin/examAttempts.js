"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.examAttempts = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Student_1 = require("./Student");
const exams_1 = require("./exams");
exports.examAttempts = (0, mysql_core_1.mysqlTable)("exam_attempts", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id),
    examId: (0, mysql_core_1.char)("exam_id", { length: 255 }).notNull().references(() => exams_1.Exams.id),
    startedAt: (0, mysql_core_1.timestamp)("started_at").notNull().defaultNow(),
    endedAt: (0, mysql_core_1.timestamp)("ended_at"),
    score: (0, mysql_core_1.int)("score"),
    isPassed: (0, mysql_core_1.boolean)("is_passed"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["in_progress", "completed", "timed_out"]).notNull().default("in_progress"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
