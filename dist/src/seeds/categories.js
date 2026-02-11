"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCategories = seedCategories;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
// Returns a map of category names -> IDs for use by other seeders
async function seedCategories() {
    const categoryMap = {};
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
        const existing = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.name, cat.name));
        if (existing.length > 0) {
            categoryMap[cat.name] = existing[0].id;
            console.log(`  Category "${cat.name}" already exists`);
            continue;
        }
        const id = (0, uuid_1.v4)();
        const parentCategoryId = cat.parentName ? categoryMap[cat.parentName] : null;
        await connection_1.db.insert(schema_1.category).values({
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
