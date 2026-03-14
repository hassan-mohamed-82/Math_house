"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionAttendance = exports.sessionRatings = exports.sessionLessons = exports.sessionUsers = exports.sessions = void 0;
// schema/sessions.ts
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const teacher_1 = require("./teacher");
const Student_1 = require("./Student");
const Groups_1 = require("./Groups");
const lessons_1 = require("./lessons");
exports.sessions = (0, mysql_core_1.mysqlTable)("sessions", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    sessionDate: (0, mysql_core_1.date)("session_date").notNull(),
    timeFrom: (0, mysql_core_1.time)("time_from").notNull(),
    timeTo: (0, mysql_core_1.time)("time_to").notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["private", "group"]).notNull(),
    groupId: (0, mysql_core_1.char)("group_id", { length: 36 }).references(() => Groups_1.groups.id),
    teacherId: (0, mysql_core_1.char)("teacher_id", { length: 255 }).notNull().references(() => teacher_1.teachers.id),
    session_link: (0, mysql_core_1.varchar)("session_link", { length: 500 }).notNull(),
    material_link: (0, mysql_core_1.varchar)("material_link", { length: 500 }),
    teacher_material_link: (0, mysql_core_1.varchar)("teacher_material_link", { length: 500 }),
    sessionRelationalType: (0, mysql_core_1.mysqlEnum)("session_relational_type", ["Explanation", "Re-Exeplanation", "Mistakes", "Exam"]).default("Explanation"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.sessionUsers = (0, mysql_core_1.mysqlTable)("session_users", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sessionId: (0, mysql_core_1.char)("session_id", { length: 36 }).notNull().references(() => exports.sessions.id),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id),
});
exports.sessionLessons = (0, mysql_core_1.mysqlTable)("session_academic_info", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sessionId: (0, mysql_core_1.char)("session_id", { length: 36 }).notNull().references(() => exports.sessions.id),
    lessonId: (0, mysql_core_1.char)("lesson_id", { length: 36 }).notNull().references(() => lessons_1.lessons.id),
});
exports.sessionRatings = (0, mysql_core_1.mysqlTable)("session_ratings", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sessionId: (0, mysql_core_1.char)("session_id", { length: 36 }).notNull().references(() => exports.sessions.id),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id),
    rating: (0, mysql_core_1.int)("rating").notNull(), // 1-10
    comment: (0, mysql_core_1.text)("comment"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.sessionAttendance = (0, mysql_core_1.mysqlTable)("session_attendance", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sessionId: (0, mysql_core_1.char)("session_id", { length: 36 }).notNull().references(() => exports.sessions.id),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id),
    status: (0, mysql_core_1.mysqlEnum)("status", ["present", "absent"]).notNull().default("absent"),
    attendedAt: (0, mysql_core_1.timestamp)("attended_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, mysql_core_1.uniqueIndex)("session_student_unique").on(table.sessionId, table.studentId),
]);
