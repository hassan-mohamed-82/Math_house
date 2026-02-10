import { mysqlTable, varchar, char, timestamp, double } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { category } from "./category";


export const semesters = mysqlTable("semesters", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    categoryId: char("category_id", { length: 255 }).notNull().references(() => category.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});