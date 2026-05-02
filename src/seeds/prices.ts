import { db } from "../models/connection";
import { prices } from "../models/schema/admin/prices";
import { courses, chapters, lessons } from "../models/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedPrices() {
    console.log("\n💰 Seeding Prices...");

    // 1. Seed Courses Prices
    const allCourses = await db.select().from(courses);
    for (const c of allCourses) {
        const existing = await db.select().from(prices).where(and(eq(prices.targetType, "course"), eq(prices.targetId, c.id)));
        if (existing.length === 0) {
            await db.insert(prices).values({
                id: uuidv4(),
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
    const allChapters = await db.select().from(chapters);
    for (const ch of allChapters) {
        const existing = await db.select().from(prices).where(and(eq(prices.targetType, "chapter"), eq(prices.targetId, ch.id)));
        if (existing.length === 0) {
            await db.insert(prices).values({
                id: uuidv4(),
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
    const allLessons = await db.select().from(lessons);
    for (const l of allLessons) {
        const existing = await db.select().from(prices).where(and(eq(prices.targetType, "lesson"), eq(prices.targetId, l.id)));
        if (existing.length === 0) {
            await db.insert(prices).values({
                id: uuidv4(),
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
