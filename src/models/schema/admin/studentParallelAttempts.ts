import { mysqlTable, char, mysqlEnum, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "./Student";
import { examAttempts } from "./examAttempts";

export const studentParallelAttempts = mysqlTable("student_parallel_attempts", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id, { onDelete: "cascade" }),
    examAttemptId: char("exam_attempt_id", { length: 255 }).notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["in_progress", "completed"]).notNull().default("in_progress"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
