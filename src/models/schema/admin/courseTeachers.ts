import { mysqlTable, char, timestamp, varchar, primaryKey } from "drizzle-orm/mysql-core";
import { courses } from "./courses";
import { teachers } from "./teacher";

export const courseTeachers = mysqlTable("course_teachers", {
    courseId: char("course_id", { length: 255 }).notNull().references(() => courses.id, { onDelete: "cascade" }),
    teacherId: char("teacher_id", { length: 255 }).notNull().references(() => teachers.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 100 }).default("instructor"), // e.g., "lead", "assistant", "instructor"
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    pk: primaryKey({ columns: [table.courseId, table.teacherId] }),
}));
