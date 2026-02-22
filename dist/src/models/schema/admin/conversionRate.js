"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionRate = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const currency_1 = require("./currency");
exports.ConversionRate = (0, mysql_core_1.mysqlTable)("conversion_rate", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    fromCurrencyId: (0, mysql_core_1.char)("from_currency_id", { length: 255 }).notNull().references(() => currency_1.Currency.id, { onDelete: "cascade" }),
    toCurrencyId: (0, mysql_core_1.char)("to_currency_id", { length: 255 }).notNull().references(() => currency_1.Currency.id, { onDelete: "cascade" }),
    rate: (0, mysql_core_1.decimal)("rate", { precision: 18, scale: 6 }).notNull(),
    fetchedAt: (0, mysql_core_1.timestamp)("fetched_at").defaultNow(),
});
