import { db } from "../models/connection";
import { promoCodes, promoCodesCourses, promoCodesPackages, packages, courses, category } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedPromoCodes() {
    const courseList = await db.select().from(courses).limit(1);
    if (courseList.length === 0) {
        console.log("  ⚠️ Cannot seed Promo Codes: No courses found. Please seed courses first.");
        return;
    }
    const course = courseList[0];

    const categoryList = await db.select().from(category).limit(1);
    const cat = categoryList[0];

    let packageList = await db.select().from(packages).limit(1);
    let pkg;
    if (packageList.length === 0 && cat && course) {
        console.log("  ⚠️ No packages found. Creating a dummy package for seeding promo codes...");
        const newPackageId = uuidv4();
        await db.insert(packages).values({
            id: newPackageId,
            name: "Basic Seed Package",
            type: "live",
            categoryId: cat.id,
            courseId: course.id,
            number: 10,
            price: "100.00",
            duration: 30,
        });
        packageList = await db.select().from(packages).limit(1);
    } else if (packageList.length === 0) {
        console.log("  ⚠️ Cannot seed Promo Codes: No categories/courses found to build a package.");
        return;
    }
    pkg = packageList[0];

    const promoCodesData = [
        {
            promoName: "Welcome Bonus",
            code: "WELCOME50",
            discountAmount: 50,
            type: "generic" as const,
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
            type: "generic" as const,
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
            type: "generic" as const,
            courseIds: [course.id],
            packageIds: [pkg.id],
            startDate: new Date(new Date().setHours(0, 0, 0, 0)),
            endDate: new Date(new Date(new Date().setDate(new Date().getDate() + 7)).setHours(23, 59, 59, 999)),
            numberOfUsages: 500,
        },
    ];

    for (const promo of promoCodesData) {
        const existing = await db.select().from(promoCodes).where(eq(promoCodes.code, promo.code));

        if (existing.length > 0) {
            console.log(`  Promo Code "${promo.code}" already exists`);
            continue;
        }

        const id = uuidv4();
        const { courseIds, packageIds, ...promoBaseData } = promo;

        await db.insert(promoCodes).values({
            id,
            ...promoBaseData
        });

        const coursesToInsert = courseIds.map(cId => ({ promoCodeId: id, courseId: cId }));
        await db.insert(promoCodesCourses).values(coursesToInsert);

        const packagesToInsert = packageIds.map(pId => ({ promoCodeId: id, packageId: pId }));
        await db.insert(promoCodesPackages).values(packagesToInsert);

        console.log(`  ✅ Promo Code "${promo.code}" created`);
    }
}
