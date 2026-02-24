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
        { name: "Middle", parentName: "National Learning", description: "Middle school grades" },
        { name: "Secondary", parentName: "National Learning", description: "Secondary school grades" },
        // International Learning children
        { name: "IGCSE", parentName: "International Learning", description: "IGCSE Programs" },
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
