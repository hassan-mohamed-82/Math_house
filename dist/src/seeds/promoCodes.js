"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPromoCodes = seedPromoCodes;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedPromoCodes() {
    const courseList = await connection_1.db.select().from(schema_1.courses).limit(1);
    if (courseList.length === 0) {
        console.log("  ⚠️ Cannot seed Promo Codes: No courses found. Please seed courses first.");
        return;
    }
    const course = courseList[0];
    const categoryList = await connection_1.db.select().from(schema_1.category).limit(1);
    const cat = categoryList[0];
    let packageList = await connection_1.db.select().from(schema_1.packages).limit(1);
    let pkg;
    if (packageList.length === 0 && cat && course) {
        console.log("  ⚠️ No packages found. Creating a dummy package for seeding promo codes...");
        const newPackageId = (0, uuid_1.v4)();
        await connection_1.db.insert(schema_1.packages).values({
            id: newPackageId,
            name: "Basic Seed Package",
            type: "live",
            categoryId: cat.id,
            courseId: course.id,
            number: 10,
            price: "100.00",
            duration: 30,
        });
        packageList = await connection_1.db.select().from(schema_1.packages).limit(1);
    }
    else if (packageList.length === 0) {
        console.log("  ⚠️ Cannot seed Promo Codes: No categories/courses found to build a package.");
        return;
    }
    pkg = packageList[0];
    const promoCodesData = [
        {
            promoName: "Welcome Bonus",
            code: "WELCOME50",
            discountAmount: 50,
            courseIds: [course.id],
            packageIds: [pkg.id],
            startDate: new Date(new Date().setHours(0, 0, 0, 0)),
            endDate: new Date(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).setHours(23, 59, 59, 999)),
            numberOfUsages: 100,
        },
        {
            promoName: "Summer Sale",
            code: "SUMMER20",
            discountAmount: 20,
            courseIds: [course.id],
            packageIds: [pkg.id],
            startDate: new Date(new Date().setHours(0, 0, 0, 0)),
            endDate: new Date(new Date(new Date().setMonth(new Date().getMonth() + 3)).setHours(23, 59, 59, 999)),
            numberOfUsages: 50,
        },
        {
            promoName: "Flash Deal",
            code: "FLASH10",
            discountAmount: 10,
            courseIds: [course.id],
            packageIds: [pkg.id],
            startDate: new Date(new Date().setHours(0, 0, 0, 0)),
            endDate: new Date(new Date(new Date().setDate(new Date().getDate() + 7)).setHours(23, 59, 59, 999)),
            numberOfUsages: 500,
        },
    ];
    for (const promo of promoCodesData) {
        const existing = await connection_1.db.select().from(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.code, promo.code));
        if (existing.length > 0) {
            console.log(`  Promo Code "${promo.code}" already exists`);
            continue;
        }
        const id = (0, uuid_1.v4)();
        const { courseIds, packageIds, ...promoBaseData } = promo;
        await connection_1.db.insert(schema_1.promoCodes).values({
            id,
            ...promoBaseData
        });
        const coursesToInsert = courseIds.map(cId => ({ promoCodeId: id, courseId: cId }));
        await connection_1.db.insert(schema_1.promoCodesCourses).values(coursesToInsert);
        const packagesToInsert = packageIds.map(pId => ({ promoCodeId: id, packageId: pId }));
        await connection_1.db.insert(schema_1.promoCodesPackages).values(packagesToInsert);
        console.log(`  ✅ Promo Code "${promo.code}" created`);
    }
}
