"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionUsers = exports.sessions = void 0;
// schema/sessions.ts
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const teacher_1 = require("./teacher");
const category_1 = require("./category");
const courses_1 = require("./courses");
const Groups_1 = require("./Groups");
exports.sessions = (0, mysql_core_1.mysqlTable)("sessions", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    sessionDate: (0, mysql_core_1.date)("session_date").notNull(),
    timeFrom: (0, mysql_core_1.time)("time_from").notNull(),
    timeTo: (0, mysql_core_1.time)("time_to").notNull(),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 36 }).notNull().references(() => category_1.category.id),
    courseId: (0, mysql_core_1.char)("course_id", { length: 36 }).notNull().references(() => courses_1.courses.id),
    lessonId: (0, mysql_core_1.char)("lesson_id", { length: 36 }), // Optional - reference to lessons table
    lessonName: (0, mysql_core_1.varchar)("lesson_name", { length: 500 }), // أو تخزن الاسم مباشرة
    type: (0, mysql_core_1.mysqlEnum)("type", ["session", "private", "group"]).notNull(),
    groupId: (0, mysql_core_1.char)("group_id", { length: 36 }).references(() => Groups_1.groups.id), // Optional - لو Type = group
    teacherId: (0, mysql_core_1.char)("teacher_id", { length: 255 }).notNull().references(() => teacher_1.teachers.id),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
// الـ Users/Students اللي في الـ Session
exports.sessionUsers = (0, mysql_core_1.mysqlTable)("session_users", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sessionId: (0, mysql_core_1.char)("session_id", { length: 36 }).notNull().references(() => exports.sessions.id),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
