// schema/sessions.ts
import { mysqlTable, varchar, char, timestamp, mysqlEnum, date, time, json } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { teachers } from "./teacher";
import { category } from "./category";
import { courses } from "./courses";
import { groups } from "./Groups";

export const sessions = mysqlTable("sessions", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    name: varchar("name", { length: 255 }).notNull(),
    sessionDate: date("session_date").notNull(),
    timeFrom: time("time_from").notNull(),
    timeTo: time("time_to").notNull(),
    categoryId: char("category_id", { length: 36 }).notNull().references(() => category.id),
    courseId: char("course_id", { length: 36 }).notNull().references(() => courses.id),
    lessonId: char("lesson_id", { length: 36 }), // Optional - reference to lessons table
    lessonName: varchar("lesson_name", { length: 500 }), // أو تخزن الاسم مباشرة
    type: mysqlEnum("type", ["session", "private", "group"]).notNull(),
    groupId: char("group_id", { length: 36 }).references(() => groups.id), // Optional - لو Type = group
    teacherId: char("teacher_id", { length: 255 }).notNull().references(() => teachers.id),
   session_link: varchar("session_link", { length: 500 }).notNull(),
material_link: varchar("material_link", { length: 500 }),
teacher_material_link: varchar("teacher_material_link", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    
});

// الـ Users/Students اللي في الـ Session
export const sessionUsers = mysqlTable("session_users", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id),
    studentId: char("student_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});