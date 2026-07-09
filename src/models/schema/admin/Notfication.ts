import { mysqlTable, varchar, char, timestamp, text, datetime, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const notifications = mysqlTable("notifications", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    materialLink: varchar("material_link", { length: 500 }),
    materialFile: varchar("material_file", { length: 500 }),
    dateTime: datetime("date_time").notNull(),
    notification: text("notification").notNull(),
    sendToAll: boolean("send_to_all").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// جدول لربط الـ Notifications بالـ Parents
export const notificationParents = mysqlTable("notification_parents", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    notificationId: char("notification_id", { length: 36 }).notNull().references(() => notifications.id, { onDelete: "cascade" }),
    parentId: char("parent_id", { length: 36 }).notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

// جدول لربط الـ Notifications بالـ Students
export const notificationStudents = mysqlTable("notification_students", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    notificationId: char("notification_id", { length: 36 }).notNull().references(() => notifications.id, { onDelete: "cascade" }),
    studentId: char("student_id", { length: 36 }).notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

// جدول لربط الـ Notifications بالـ Teachers
export const notificationTeachers = mysqlTable("notification_teachers", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    notificationId: char("notification_id", { length: 36 }).notNull().references(() => notifications.id, { onDelete: "cascade" }),
    teacherId: char("teacher_id", { length: 36 }).notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});
