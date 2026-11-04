// schema/admin/Notes.ts
import { mysqlTable, varchar, char, timestamp, text } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "./Student";

export const notes = mysqlTable("notes", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    content: text("content"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
