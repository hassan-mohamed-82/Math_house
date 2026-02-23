import { db } from "../models/connection";
import { category } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Returns a map of category names -> IDs for use by other seeders
export async function seedCategories() {
    const categoryMap: Record<string, string> = {};

    const categoriesData = [
        // Top-level categories
        { name: "National Learning", parentName: null, description: "Egyptian national curriculum" },
        { name: "International Learning", parentName: null, description: "International curriculum programs" },

        // National Learning children
        { name: "Primary", parentName: "National Learning", description: "Primary school grades" },
        { name: "Middle", parentName: "National Learning", description: "Middle school grades" },
        { name: "Secondary", parentName: "National Learning", description: "Secondary school grades" },

        // International Learning children
        { name: "IGCSE", parentName: "International Learning", description: "IGCSE Programs" },
    ];

    for (const cat of categoriesData) {
        const existing = await db.select().from(category).where(eq(category.name, cat.name));

        if (existing.length > 0) {
            categoryMap[cat.name] = existing[0].id;
            console.log(`  Category "${cat.name}" already exists`);
            continue;
        }

        const id = uuidv4();
        const parentCategoryId = cat.parentName ? categoryMap[cat.parentName] : null;

        await db.insert(category).values({
            id,
            name: cat.name,
            description: cat.description,
            parentCategoryId,
        });

        categoryMap[cat.name] = id;
        console.log(`  ✅ Category "${cat.name}" created`);
    }

    return categoryMap;
}
