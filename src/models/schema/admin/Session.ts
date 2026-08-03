// schema/sessions.ts
import { mysqlTable, varchar, char, timestamp, mysqlEnum, date, time, int, text, uniqueIndex, index } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { teachers } from "./teacher";
import { Student } from "./Student";
import { groups } from "./Groups";
import { lessons } from "./lessons";

export const sessions = mysqlTable("sessions", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    name: varchar("name", { length: 255 }).notNull(),

    // Schedule type: "once" → single sessionDate, "repeat" → startDate + endDate range
    scheduleType: mysqlEnum("schedule_type", ["once", "repeat"]).notNull().default("once"),
    sessionDate: date("session_date"),            // used when scheduleType = "once"
    startDate:   date("start_date"),             // used when scheduleType = "repeat"
    endDate:     date("end_date"),               // used when scheduleType = "repeat"

    timeFrom: time("time_from").notNull(),
    timeTo:   time("time_to").notNull(),

    teacherId: char("teacher_id", { length: 255 }).notNull().references(() => teachers.id, { onDelete: "cascade" }),

    session_link:          varchar("session_link",          { length: 500 }),
    material_link:         varchar("material_link",         { length: 500 }),
    teacher_material_link: varchar("teacher_material_link", { length: 500 }),

    sessionRelationalType: mysqlEnum("session_relational_type", ["Explanation", "Re-Explanation", "Mistakes", "Exam"]).default("Explanation"),

    // How many days after attending can a student access the session's lesson content.
    // NULL = permanent access (no expiry).
    contentAccessDays: int("content_access_days"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/** Junction table – one session can be linked to multiple groups */
export const sessionGroups = mysqlTable("session_groups", {
    id:        char("id",         { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
    groupId:   char("group_id",   { length: 36 }).notNull().references(() => groups.id, { onDelete: "cascade" }),
});

export const sessionUsers = mysqlTable("session_users", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id, { onDelete: "cascade" }),
});

export const sessionLessons = mysqlTable("session_academic_info", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
    lessonId: char("lesson_id", { length: 36 }).notNull().references(() => lessons.id, { onDelete: "cascade" }),
});

export const sessionRatings = mysqlTable("session_ratings", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id, { onDelete: "cascade" }),
    rating: int("rating").notNull(), // 1-10
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const sessionAttendance = mysqlTable("session_attendance", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["present", "absent"]).notNull().default("absent"),
    attendedAt: timestamp("attended_at"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    uniqueIndex("session_student_unique").on(table.sessionId, table.studentId),
    index("session_attendance_student_status_idx").on(table.studentId, table.status)
]);
