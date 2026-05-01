import { mysqlTable, char, varchar, int, decimal, mysqlEnum, timestamp, boolean } from "drizzle-orm/mysql-core";
import { v4 as uuidv4 } from "uuid";

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

    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});