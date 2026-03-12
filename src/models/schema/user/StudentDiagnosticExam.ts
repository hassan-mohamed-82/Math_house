import { sql } from "drizzle-orm";
import { mysqlTable, timestamp, int, boolean } from "drizzle-orm/mysql-core";
import { char } from "drizzle-orm/mysql-core";
import { Student } from "../admin/Student";
import { diagnosticExam } from "../admin/diagnosticExam";
export const diagnosticExamAttempt = mysqlTable("diagnostic_exam_attempt", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    studentId: char("studentId", { length: 255 }).references(() => Student.id).notNull(),
    diagnosticExamId: char("diagnosticExamId", { length: 255 }).references(() => diagnosticExam.id).notNull(),
    score: int("score").notNull().default(0),
    isCompleted: boolean("is_completed").notNull().default(false),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    endedAt: timestamp("endedAt").notNull(),
});