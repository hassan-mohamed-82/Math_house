import { mysqlTable, char, varchar, timestamp, boolean, decimal } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const Currency = mysqlTable("currency", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    symbol: varchar("symbol", { length: 255 }).notNull(),
    code: varchar("code", { length: 10 }).notNull().unique(),
    exchangeRate: decimal("exchange_rate", { precision: 18, scale: 6 }).notNull().default("1.000000"),
    isBase: boolean("is_base").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});