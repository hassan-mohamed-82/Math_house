// models/schema/admin/sessionRatings.ts
import { mysqlTable, char, timestamp, int, text } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { sessions } from "./Session";
import { Student } from "./Student";

export const sessionRatings = mysqlTable("session_ratings", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id),
    rating: int("rating").notNull(), // 1-10
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});