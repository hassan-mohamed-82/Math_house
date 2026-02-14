import { mysqlTable, char, varchar, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const examCodes = mysqlTable("exam_codes", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    code: varchar("code", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});