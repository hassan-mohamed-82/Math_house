import { sql } from "drizzle-orm";
import { mysqlTable, timestamp, datetime, int, boolean, char } from "drizzle-orm/mysql-core";
import { Student } from "../admin/Student";
import { diagnosticExam } from "../admin/diagnosticExam";
import { v4 as uuidv4 } from "uuid";

export const diagnosticExamAttempt = mysqlTable("diagnostic_exam_attempt", {
    id: char("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => uuidv4()),
    studentId: char("studentId", { length: 255 }).references(() => Student.id, { onDelete: "cascade" }).notNull(),
    diagnosticExamId: char("diagnosticExamId", { length: 255 }).references(() => diagnosticExam.id, { onDelete: "cascade" }).notNull(),
    score: int("score").notNull().default(0),
    isCompleted: boolean("is_completed").notNull().default(false),
    startedAt: datetime("startedAt").default(sql`(now())`).notNull(),
    endedAt: datetime("endedAt"),
});