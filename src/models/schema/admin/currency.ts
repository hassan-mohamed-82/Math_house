import { mysqlTable, char, varchar, timestamp, int, boolean, foreignKey, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const Currency = mysqlTable("currency", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    symbol: varchar("symbol", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});