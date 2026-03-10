"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionAttendance = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Session_1 = require("./Session");
const Student_1 = require("./Student");
exports.sessionAttendance = (0, mysql_core_1.mysqlTable)("session_attendance", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sessionId: (0, mysql_core_1.char)("session_id", { length: 36 }).notNull().references(() => Session_1.sessions.id),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id),
    status: (0, mysql_core_1.mysqlEnum)("status", ["present", "absent"]).notNull().default("absent"),
    attendedAt: (0, mysql_core_1.timestamp)("attended_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, mysql_core_1.uniqueIndex)("session_student_unique").on(table.sessionId, table.studentId),
]);
