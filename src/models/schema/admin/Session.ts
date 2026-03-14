// schema/sessions.ts
import { mysqlTable, varchar, char, timestamp, mysqlEnum, date, time, int, text ,uniqueIndex } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { teachers } from "./teacher";
import { Student } from "./Student";
import { groups } from "./Groups";
import { lessons } from "./lessons";

export const sessions = mysqlTable("sessions", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    name: varchar("name", { length: 255 }).notNull(),
    sessionDate: date("session_date").notNull(),
    timeFrom: time("time_from").notNull(),
    timeTo: time("time_to").notNull(),

    type: mysqlEnum("type", ["private", "group"]).notNull(),

    groupId: char("group_id", { length: 36 }).references(() => groups.id),

    teacherId: char("teacher_id", { length: 255 }).notNull().references(() => teachers.id),

    session_link: varchar("session_link", { length: 500 }).notNull(),
    material_link: varchar("material_link", { length: 500 }),
    teacher_material_link: varchar("teacher_material_link", { length: 500 }),
    
    sessionRelationalType: mysqlEnum("session_relational_type", ["Explanation", "Re-Exeplanation", "Mistakes", "Exam"]).default("Explanation"),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const sessionUsers = mysqlTable("session_users", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id),
});

export const sessionLessons = mysqlTable("session_academic_info", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id),
    lessonId: char("lesson_id", { length: 36 }).notNull().references(() => lessons.id),
});

export const sessionRatings = mysqlTable("session_ratings", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id),
    rating: int("rating").notNull(), // 1-10
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const sessionAttendance = mysqlTable("session_attendance", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id),
    status: mysqlEnum("status", ["present", "absent"]).notNull().default("absent"),
    attendedAt: timestamp("attended_at"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    uniqueIndex("session_student_unique").on(table.sessionId, table.studentId),
]);
