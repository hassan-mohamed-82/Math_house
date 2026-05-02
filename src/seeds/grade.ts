import { db } from "../models/connection";
import { grade } from "../models/schema";
import { eq, and, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedGrades(categoryMap: Record<string, string>) {
    const gradeMap: Record<string, string> = {};

    const gradesData = [
        { name: "1", nameAr: "الصف الأول", categoryName: "Primary", parentCategoryName: "National Learning" },
        { name: "2", nameAr: "الصف الثاني", categoryName: "Primary", parentCategoryName: "National Learning" },
        { name: "7", nameAr: "الصف السابع", categoryName: "Middle", parentCategoryName: "National Learning" },
        { name: "10", nameAr: "الصف العاشر", categoryName: "Secondary", parentCategoryName: "National Learning" },
        { name: "10", nameAr: "Grade 10", categoryName: "IGCSE", parentCategoryName: "International Learning" },
    ];

    for (const g of gradesData) {
        const categoryId = categoryMap[g.categoryName];
        const parentCategoryId = categoryMap[g.parentCategoryName];

        if (!categoryId || !parentCategoryId) {
            console.warn(`  ⚠️ Category "${g.categoryName}" or Parent "${g.parentCategoryName}" not found for grade "${g.name}"`);
            continue;
        }

        const existing = await db
            .select()
            .from(grade)
            .where(and(
                eq(grade.categoryId, categoryId),
                or(eq(grade.name, g.name), eq(grade.nameAr, g.nameAr))
            ));

        if (existing.length > 0) {
            gradeMap[`${g.categoryName}-${g.name}`] = existing[0].id;
            console.log(`  Grade "${g.name}" or "${g.nameAr}" already exists for "${g.categoryName}"`);
            continue;
        }

        const id = uuidv4();
        await db.insert(grade).values({
            id,
            name: g.name,
            nameAr: g.nameAr,
            categoryId,
            parentCategoryId,
        });

        gradeMap[`${g.categoryName}-${g.name}`] = id;
        console.log(`  ✅ Grade "${g.name}" created for "${g.categoryName}"`);
    }

    return gradeMap;
}
