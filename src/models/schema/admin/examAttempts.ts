import { mysqlTable, char, timestamp, datetime, int, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "./Student";
import { Exams } from "./exams";
import { v4 as uuidv4 } from "uuid";

export const examAttempts = mysqlTable("exam_attempts", {
    id: char("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => uuidv4()),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id),
    examId: char("exam_id", { length: 255 }).notNull().references(() => Exams.id),
    startedAt: datetime("started_at").notNull().default(sql`(now())`),
    endedAt: datetime("ended_at"),
    score: int("score"),
    isPassed: boolean("is_passed"),
    status: mysqlEnum("status", ["in_progress", "completed", "timed_out"]).notNull().default("in_progress"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
