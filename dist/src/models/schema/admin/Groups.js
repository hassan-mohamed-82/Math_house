"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupStudents = exports.groups = void 0;
// schema/groups.ts
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const teacher_1 = require("./teacher");
exports.groups = (0, mysql_core_1.mysqlTable)("groups", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    teacherId: (0, mysql_core_1.char)("teacher_id", { length: 255 }).notNull().references(() => teacher_1.teachers.id),
    days: (0, mysql_core_1.json)("days").$type().notNull(), // ["Sun", "Mon", "Tue", etc.]
    timeFrom: (0, mysql_core_1.time)("time_from").notNull(),
    timeTo: (0, mysql_core_1.time)("time_to").notNull(),
    isActive: (0, mysql_core_1.boolean)("is_active").default(true),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
// Junction table للعلاقة Many-to-Many بين Groups و Students
exports.groupStudents = (0, mysql_core_1.mysqlTable)("group_students", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    groupId: (0, mysql_core_1.char)("group_id", { length: 36 }).notNull().references(() => exports.groups.id),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
