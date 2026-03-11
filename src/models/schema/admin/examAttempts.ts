import { mysqlTable, char, timestamp, int, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "./Student";
import { Exams } from "./exams";

export const examAttempts = mysqlTable("exam_attempts", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id),
    examId: char("exam_id", { length: 255 }).notNull().references(() => Exams.id),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
    score: int("score"),
    isPassed: boolean("is_passed"),
    status: mysqlEnum("status", ["in_progress", "completed", "timed_out"]).notNull().default("in_progress"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
