import { db } from "../models/connection";
import { semesters } from "../models/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedSemesters(categoryMap: Record<string, string>) {
    const semesterMap: Record<string, string> = {};

    // Leaf categories that should have semesters
    const leafCategories = [
        "Primary 1", "Primary 2", "Primary 3",
        "Prep 1", "Prep 2", "Prep 3",
        "Secondary 1", "Secondary 2", "Secondary 3",
        "IG Year 1", "IG Year 2",
    ];

    for (const catName of leafCategories) {
        const categoryId = categoryMap[catName];
        if (!categoryId) continue;

        for (const semName of ["Semester 1", "Semester 2"]) {
            const key = `${catName} - ${semName}`;

            const existing = await db.select().from(semesters)
                .where(and(eq(semesters.name, semName), eq(semesters.categoryId, categoryId)));

            if (existing.length > 0) {
                semesterMap[key] = existing[0].id;
                console.log(`  Semester "${key}" already exists`);
                continue;
            }

            const id = uuidv4();

            await db.insert(semesters).values({
                id,
                name: semName,
                categoryId,
            });

            semesterMap[key] = id;
            console.log(`  ✅ Semester "${key}" created`);
        }
    }

    return semesterMap;
}
