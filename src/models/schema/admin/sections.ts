import { char, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const Sections = mysqlTable("sections", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    sectionName: varchar("section_name", { length: 255 }).notNull(),
    sectionDescription: varchar("section_description", { length: 255 }),
    sectionTime: int("section_time").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});