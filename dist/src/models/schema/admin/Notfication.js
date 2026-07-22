"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationTeachers = exports.notificationStudents = exports.notificationParents = exports.notifications = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.notifications = (0, mysql_core_1.mysqlTable)("notifications", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    materialLink: (0, mysql_core_1.varchar)("material_link", { length: 500 }),
    materialFile: (0, mysql_core_1.varchar)("material_file", { length: 500 }),
    dateTime: (0, mysql_core_1.datetime)("date_time").notNull(),
    notification: (0, mysql_core_1.text)("notification").notNull(),
    sendToAll: (0, mysql_core_1.boolean)("send_to_all").default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
// جدول لربط الـ Notifications بالـ Parents
exports.notificationParents = (0, mysql_core_1.mysqlTable)("notification_parents", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    notificationId: (0, mysql_core_1.char)("notification_id", { length: 36 }).notNull().references(() => exports.notifications.id, { onDelete: "cascade" }),
    parentId: (0, mysql_core_1.char)("parent_id", { length: 36 }).notNull(),
    isRead: (0, mysql_core_1.boolean)("is_read").default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
// جدول لربط الـ Notifications بالـ Students
exports.notificationStudents = (0, mysql_core_1.mysqlTable)("notification_students", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    notificationId: (0, mysql_core_1.char)("notification_id", { length: 36 }).notNull().references(() => exports.notifications.id, { onDelete: "cascade" }),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull(),
    isRead: (0, mysql_core_1.boolean)("is_read").default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
// جدول لربط الـ Notifications بالـ Teachers
exports.notificationTeachers = (0, mysql_core_1.mysqlTable)("notification_teachers", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    notificationId: (0, mysql_core_1.char)("notification_id", { length: 36 }).notNull().references(() => exports.notifications.id, { onDelete: "cascade" }),
    teacherId: (0, mysql_core_1.char)("teacher_id", { length: 36 }).notNull(),
    isRead: (0, mysql_core_1.boolean)("is_read").default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
