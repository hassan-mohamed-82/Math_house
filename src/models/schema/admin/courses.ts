import { mysqlTable, varchar, char, timestamp, mysqlEnum, double } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
export const courses = mysqlTable("courses", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    mainThumbnail: varchar("main_thumbnail", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    price: double("price").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});