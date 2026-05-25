"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prices = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const uuid_1 = require("uuid");
const drizzle_orm_1 = require("drizzle-orm");
exports.prices = (0, mysql_core_1.mysqlTable)("prices", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().$defaultFn(() => (0, uuid_1.v4)()),
    targetType: (0, mysql_core_1.mysqlEnum)("target_type", ["course", "chapter", "lesson"]).notNull(),
    targetId: (0, mysql_core_1.char)("target_id", { length: 36 }).notNull(),
    durationLabel: (0, mysql_core_1.varchar)("duration_label", { length: 255 }).notNull(),
    durationDays: (0, mysql_core_1.int)("duration_days").notNull(),
    priceEgp: (0, mysql_core_1.decimal)("price_egp", { precision: 10, scale: 2 }).notNull(),
    priceUsd: (0, mysql_core_1.decimal)("price_usd", { precision: 10, scale: 2 }).notNull(),
    hasDiscount: (0, mysql_core_1.boolean)("has_discount").default(false),
    discountEgp: (0, mysql_core_1.decimal)("discount_egp", { precision: 10, scale: 2 }).default("0.00"),
    discountUsd: (0, mysql_core_1.decimal)("discount_usd", { precision: 10, scale: 2 }).default("0.00"),
    totalPriceEgp: (0, mysql_core_1.decimal)("total_price_egp", { precision: 10, scale: 2 }).generatedAlwaysAs((0, drizzle_orm_1.sql) `price_egp - COALESCE(discount_egp, 0)`),
    totalPriceUsd: (0, mysql_core_1.decimal)("total_price_usd", { precision: 10, scale: 2 }).generatedAlwaysAs((0, drizzle_orm_1.sql) `price_usd - COALESCE(discount_usd, 0)`),
    isDefault: (0, mysql_core_1.boolean)("is_default").default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
