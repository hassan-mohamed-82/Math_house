import { mysqlTable, char, varchar, int, decimal, mysqlEnum, timestamp, boolean, } from "drizzle-orm/mysql-core";
import { v4 as uuidv4 } from "uuid";
import { sql } from "drizzle-orm";

export const prices = mysqlTable("prices", {
    id: char("id", { length: 36 }).primaryKey().$defaultFn(() => uuidv4()),
    targetType: mysqlEnum("target_type", ["course", "chapter", "lesson"]).notNull(),
    targetId: char("target_id", { length: 36 }).notNull(),

    durationLabel: varchar("duration_label", { length: 255 }).notNull(),
    durationDays: int("duration_days").notNull(),

    priceEgp: decimal("price_egp", { precision: 10, scale: 2 }).notNull(),
    priceUsd: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),

    hasDiscount: boolean("has_discount").default(false),
    discountEgp: decimal("discount_egp", { precision: 10, scale: 2 }).default("0.00"),
    discountUsd: decimal("discount_usd", { precision: 10, scale: 2 }).default("0.00"),

    totalPriceEgp: decimal("total_price_egp", { precision: 10, scale: 2 }).generatedAlwaysAs(sql`price_egp - COALESCE(discount_egp, 0)`),
    totalPriceUsd: decimal("total_price_usd", { precision: 10, scale: 2 }).generatedAlwaysAs(sql`price_usd - COALESCE(discount_usd, 0)`),

    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});