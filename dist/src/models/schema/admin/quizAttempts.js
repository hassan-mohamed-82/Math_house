"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizAttempts = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Student_1 = require("./Student");
const Quiz_1 = require("./Quiz");
const uuid_1 = require("uuid");
exports.quizAttempts = (0, mysql_core_1.mysqlTable)("quiz_attempts", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => (0, uuid_1.v4)()),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id, { onDelete: "cascade" }),
    quizId: (0, mysql_core_1.char)("quiz_id", { length: 255 }).notNull().references(() => Quiz_1.quizzes.id, { onDelete: "cascade" }),
    startedAt: (0, mysql_core_1.datetime)("started_at").notNull().default((0, drizzle_orm_1.sql) `(now())`),
    endedAt: (0, mysql_core_1.datetime)("ended_at"),
    score: (0, mysql_core_1.int)("score"),
    isPassed: (0, mysql_core_1.boolean)("is_passed"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["in_progress", "completed", "timed_out"]).notNull().default("in_progress"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
