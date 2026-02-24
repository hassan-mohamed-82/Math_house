import { mysqlTable, char, int, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "../admin/Student";

export const wallet = mysqlTable("wallet", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    studentId: char("studentId", { length: 255 }).references(() => Student.id).notNull(),
    balance: int("balance").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});