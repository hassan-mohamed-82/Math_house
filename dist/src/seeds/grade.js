"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedGrades = seedGrades;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedGrades(categoryMap) {
    const gradeMap = {};
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
        const existing = await connection_1.db
            .select()
            .from(schema_1.grade)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.grade.categoryId, categoryId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.grade.name, g.name), (0, drizzle_orm_1.eq)(schema_1.grade.nameAr, g.nameAr))));
        if (existing.length > 0) {
            gradeMap[`${g.categoryName}-${g.name}`] = existing[0].id;
            console.log(`  Grade "${g.name}" or "${g.nameAr}" already exists for "${g.categoryName}"`);
            continue;
        }
        const id = (0, uuid_1.v4)();
        await connection_1.db.insert(schema_1.grade).values({
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
