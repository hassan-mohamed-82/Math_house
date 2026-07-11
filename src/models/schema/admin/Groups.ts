// schema/groups.ts
import { mysqlTable, varchar, char, timestamp, boolean, time, json } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { teachers } from "./teacher";

export const groups = mysqlTable("groups", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Junction table للعلاقة Many-to-Many بين Groups و Students
export const groupStudents = mysqlTable("group_students", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    groupId: char("group_id", { length: 36 }).notNull().references(() => groups.id, { onDelete: "cascade" }),
    studentId: char("student_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});