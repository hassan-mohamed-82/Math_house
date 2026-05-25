"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseTeachers = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const courses_1 = require("./courses");
const teacher_1 = require("./teacher");
exports.courseTeachers = (0, mysql_core_1.mysqlTable)("course_teachers", {
    courseId: (0, mysql_core_1.char)("course_id", { length: 255 }).notNull().references(() => courses_1.courses.id, { onDelete: "cascade" }),
    teacherId: (0, mysql_core_1.char)("teacher_id", { length: 255 }).notNull().references(() => teacher_1.teachers.id, { onDelete: "cascade" }),
    role: (0, mysql_core_1.varchar)("role", { length: 100 }).default("instructor"), // e.g., "lead", "assistant", "instructor"
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
}, (table) => ({
    pk: (0, mysql_core_1.primaryKey)({ columns: [table.courseId, table.teacherId] }),
}));
