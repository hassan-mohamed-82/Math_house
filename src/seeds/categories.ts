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
        { name: "Preparatory", parentName: "National Learning", description: "Preparatory school grades" },
        { name: "Secondary", parentName: "National Learning", description: "Secondary school grades" },

        // Primary children (leaf categories)
        { name: "Primary 1", parentName: "Primary", description: "First grade primary" },
        { name: "Primary 2", parentName: "Primary", description: "Second grade primary" },
        { name: "Primary 3", parentName: "Primary", description: "Third grade primary" },

        // Preparatory children (leaf categories)
        { name: "Prep 1", parentName: "Preparatory", description: "First year preparatory" },
        { name: "Prep 2", parentName: "Preparatory", description: "Second year preparatory" },
        { name: "Prep 3", parentName: "Preparatory", description: "Third year preparatory" },

        // Secondary children (leaf categories)
        { name: "Secondary 1", parentName: "Secondary", description: "First year secondary" },
        { name: "Secondary 2", parentName: "Secondary", description: "Second year secondary" },
        { name: "Secondary 3", parentName: "Secondary", description: "Third year secondary" },

        // International Learning children (leaf categories)
        { name: "IG Year 1", parentName: "International Learning", description: "IGCSE Year 1" },
        { name: "IG Year 2", parentName: "International Learning", description: "IGCSE Year 2" },
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
