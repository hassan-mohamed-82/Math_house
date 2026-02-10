import { mysqlTable, varchar, char, timestamp, mysqlEnum, double, AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const category = mysqlTable("category", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }),
    image: varchar("image", { length: 255 }),

    parentCategoryId: char("parent_category_id", { length: 255 }).references((): AnyMySqlColumn => category.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});