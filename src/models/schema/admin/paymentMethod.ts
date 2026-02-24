import { mysqlTable, varchar, char, timestamp, mysqlEnum, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Currency } from "./currency";


export const paymentMethod = mysqlTable("paymentMethod", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["Manual", "Automatic"]).notNull(),
    logo: varchar("logo", { length: 255 }).notNull(),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const paymentMethodCurrency = mysqlTable("paymentMethodCurrency", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    paymentMethodId: char("paymentMethodId", { length: 36 }).references(() => paymentMethod.id).notNull(),
    currencyId: char("currencyId", { length: 36 }).references(() => Currency.id).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});