import { mysqlTable, varchar, char, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
export const admins = mysqlTable("admins", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["admin", "teacher"]).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});