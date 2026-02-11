"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSemesters = seedSemesters;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedSemesters(categoryMap) {
    const semesterMap = {};
    // Leaf categories that should have semesters
    const leafCategories = [
        "Primary 1", "Primary 2", "Primary 3",
        "Prep 1", "Prep 2", "Prep 3",
        "Secondary 1", "Secondary 2", "Secondary 3",
        "IG Year 1", "IG Year 2",
    ];
    for (const catName of leafCategories) {
        const categoryId = categoryMap[catName];
        if (!categoryId)
            continue;
        for (const semName of ["Semester 1", "Semester 2"]) {
            const key = `${catName} - ${semName}`;
            const existing = await connection_1.db.select().from(schema_1.semesters)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.semesters.name, semName), (0, drizzle_orm_1.eq)(schema_1.semesters.categoryId, categoryId)));
            if (existing.length > 0) {
                semesterMap[key] = existing[0].id;
                console.log(`  Semester "${key}" already exists`);
                continue;
            }
            const id = (0, uuid_1.v4)();
            await connection_1.db.insert(schema_1.semesters).values({
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
