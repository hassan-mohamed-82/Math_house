"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPrices = seedPrices;
const connection_1 = require("../models/connection");
const prices_1 = require("../models/schema/admin/prices");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedPrices() {
    console.log("\n💰 Seeding Prices...");
    // 1. Seed Courses Prices
    const allCourses = await connection_1.db.select().from(schema_1.courses);
    for (const c of allCourses) {
        const existing = await connection_1.db.select().from(prices_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.targetType, "course"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, c.id)));
        if (existing.length === 0) {
            await connection_1.db.insert(prices_1.prices).values({
                id: (0, uuid_1.v4)(),
                targetType: "course",
                targetId: c.id,
                durationLabel: "1 Month",
                durationDays: 30,
                priceEgp: "500.00",
                priceUsd: "20.00",
                hasDiscount: false,
                isDefault: true,
            });
            console.log(`  ✅ Added default price for Course: ${c.name}`);
        }
    }
    // 2. Seed Chapters Prices
    const allChapters = await connection_1.db.select().from(schema_1.chapters);
    for (const ch of allChapters) {
        const existing = await connection_1.db.select().from(prices_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.targetType, "chapter"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, ch.id)));
        if (existing.length === 0) {
            await connection_1.db.insert(prices_1.prices).values({
                id: (0, uuid_1.v4)(),
                targetType: "chapter",
                targetId: ch.id,
                durationLabel: "1 Month",
                durationDays: 30,
                priceEgp: "100.00",
                priceUsd: "5.00",
                hasDiscount: false,
                isDefault: true,
            });
            console.log(`  ✅ Added default price for Chapter: ${ch.name}`);
        }
    }
    // 3. Seed Lessons Prices
    const allLessons = await connection_1.db.select().from(schema_1.lessons);
    for (const l of allLessons) {
        const existing = await connection_1.db.select().from(prices_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.targetType, "lesson"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, l.id)));
        if (existing.length === 0) {
            await connection_1.db.insert(prices_1.prices).values({
                id: (0, uuid_1.v4)(),
                targetType: "lesson",
                targetId: l.id,
                durationLabel: "1 Week",
                durationDays: 7,
                priceEgp: "30.00",
                priceUsd: "2.00",
                hasDiscount: false,
                isDefault: true,
            });
            console.log(`  ✅ Added default price for Lesson: ${l.name}`);
        }
    }
}
