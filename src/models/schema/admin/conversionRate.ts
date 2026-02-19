import { mysqlTable, char, varchar, timestamp, decimal } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Currency } from "./currency";

export const ConversionRate = mysqlTable("conversion_rate", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    fromCurrencyId: char("from_currency_id", { length: 255 }).notNull().references(() => Currency.id, { onDelete: "cascade" }),
    toCurrencyId: char("to_currency_id", { length: 255 }).notNull().references(() => Currency.id, { onDelete: "cascade" }),
    rate: decimal("rate", { precision: 18, scale: 6 }).notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow(),
});
