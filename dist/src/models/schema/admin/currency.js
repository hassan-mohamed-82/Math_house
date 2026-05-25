"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Currency = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.Currency = (0, mysql_core_1.mysqlTable)("currency", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    symbol: (0, mysql_core_1.varchar)("symbol", { length: 255 }).notNull(),
    code: (0, mysql_core_1.varchar)("code", { length: 10 }).notNull().unique(),
    exchangeRate: (0, mysql_core_1.decimal)("exchange_rate", { precision: 18, scale: 6 }).notNull().default("1.000000"),
    isBase: (0, mysql_core_1.boolean)("is_base").notNull().default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
