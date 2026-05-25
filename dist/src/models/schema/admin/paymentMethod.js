"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentMethodCurrency = exports.paymentMethod = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const currency_1 = require("./currency");
exports.paymentMethod = (0, mysql_core_1.mysqlTable)("paymentMethod", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, mysql_core_1.varchar)("description", { length: 255 }).notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["Manual", "Automatic"]).notNull(),
    logo: (0, mysql_core_1.varchar)("logo", { length: 255 }).notNull(),
    isActive: (0, mysql_core_1.boolean)("isActive").notNull().default(true),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow(),
});
exports.paymentMethodCurrency = (0, mysql_core_1.mysqlTable)("paymentMethodCurrency", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    paymentMethodId: (0, mysql_core_1.char)("paymentMethodId", { length: 36 }).references(() => exports.paymentMethod.id).notNull(),
    currencyId: (0, mysql_core_1.char)("currencyId", { length: 36 }).references(() => currency_1.Currency.id).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow(),
});
