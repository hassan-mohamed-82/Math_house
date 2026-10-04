"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentParallelAttempts = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Student_1 = require("./Student");
const examAttempts_1 = require("./examAttempts");
exports.studentParallelAttempts = (0, mysql_core_1.mysqlTable)("student_parallel_attempts", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id, { onDelete: "cascade" }),
    examAttemptId: (0, mysql_core_1.char)("exam_attempt_id", { length: 255 }).notNull().references(() => examAttempts_1.examAttempts.id, { onDelete: "cascade" }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["in_progress", "completed"]).notNull().default("in_progress"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
