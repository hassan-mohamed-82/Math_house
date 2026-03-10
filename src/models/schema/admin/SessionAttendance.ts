import { mysqlTable, char, timestamp, mysqlEnum, uniqueIndex } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { sessions } from "./Session";
import { Student } from "./Student";

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
