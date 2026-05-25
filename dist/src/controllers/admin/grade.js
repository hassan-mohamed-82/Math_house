"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGrade = exports.updateGrade = exports.getGradesByCategoryId = exports.getGradeById = exports.getAllGrades = exports.createGrade = void 0;
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../models/schema");
const uuid_1 = require("uuid");
// 1. Create Grades (Bulk Insert)
const createGrade = async (req, res) => {
    const { parentCategoryId, categoryId, gradesList } = req.body;
    if (!parentCategoryId)
        throw new BadRequest_1.BadRequest("Parent Category ID is required");
    if (!categoryId)
        throw new BadRequest_1.BadRequest("Category ID is required");
    if (!gradesList || !Array.isArray(gradesList) || gradesList.length === 0) {
        throw new BadRequest_1.BadRequest("Grades list must be a non-empty array");
    }
    // 1. Validate parent category is top-level
    const [parentCategory] = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, parentCategoryId));
    if (!parentCategory)
        throw new BadRequest_1.BadRequest("Parent category not found");
    if (parentCategory.parentCategoryId !== null) {
        throw new BadRequest_1.BadRequest("The selected parent category must be a top-level category (no parent)");
    }
    // 2. Validate sub-category belongs to the parent category
    const [existingCategory] = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (!existingCategory)
        throw new BadRequest_1.BadRequest("Category not found");
    if (existingCategory.parentCategoryId !== parentCategoryId) {
        throw new BadRequest_1.BadRequest("The selected category must be a child of the selected parent category");
    }
    const names = new Set();
    const namesAr = new Set();
    for (const item of gradesList) {
        const trimmedName = item.name?.trim();
        const trimmedNameAr = item.nameAr?.trim();
        if (!trimmedName || !trimmedNameAr) {
            throw new BadRequest_1.BadRequest("Each grade must have a valid name and nameAr");
        }
        if (names.has(trimmedName) || namesAr.has(trimmedNameAr)) {
            throw new BadRequest_1.BadRequest(`Duplicate names found in your request: ${trimmedName}`);
        }
        names.add(trimmedName);
        namesAr.add(trimmedNameAr);
    }
    const duplicateInDb = await connection_1.db.select()
        .from(schema_1.grade)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.grade.categoryId, categoryId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.grade.name, Array.from(names)), (0, drizzle_orm_1.inArray)(schema_1.grade.nameAr, Array.from(namesAr)))));
    if (duplicateInDb.length > 0) {
        throw new BadRequest_1.BadRequest(`One or more grades already exist in this category: ${duplicateInDb[0].name}`);
    }
    const dataToInsert = gradesList.map(item => ({
        id: (0, uuid_1.v4)(),
        name: item.name.trim(),
        nameAr: item.nameAr.trim(),
        categoryId,
        parentCategoryId
    }));
    await connection_1.db.insert(schema_1.grade).values(dataToInsert);
    return (0, response_1.SuccessResponse)(res, {
        message: `${dataToInsert.length} Grades Created Successfully`
    }, 201);
};
exports.createGrade = createGrade;
// 2. Get All Grades (With Category Info)
const getAllGrades = async (req, res) => {
    const parentCategory = (0, drizzle_orm_1.aliasedTable)(schema_1.category, "parentCategory");
    const grades = await connection_1.db.select({
        id: schema_1.grade.id,
        name: schema_1.grade.name,
        nameAr: schema_1.grade.nameAr,
        categoryId: schema_1.grade.categoryId,
        categoryName: schema_1.category.name,
        parentCategoryId: schema_1.grade.parentCategoryId,
        parentCategoryName: parentCategory.name,
        createdAt: schema_1.grade.createdAt
    })
        .from(schema_1.grade)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.grade.categoryId, schema_1.category.id))
        .leftJoin(parentCategory, (0, drizzle_orm_1.eq)(schema_1.grade.parentCategoryId, parentCategory.id));
    return (0, response_1.SuccessResponse)(res, { message: "Grades Fetched Successfully", grades }, 200);
};
exports.getAllGrades = getAllGrades;
// 3. Get Grade By ID
const getGradeById = async (req, res) => {
    const { id } = req.params;
    const [foundGrade] = await connection_1.db.select().from(schema_1.grade).where((0, drizzle_orm_1.eq)(schema_1.grade.id, id));
    if (!foundGrade)
        throw new BadRequest_1.BadRequest("Grade not found");
    return (0, response_1.SuccessResponse)(res, { message: "Grade Fetched Successfully", grade: foundGrade }, 200);
};
exports.getGradeById = getGradeById;
// 4. Get Grades By Category ID
const getGradesByCategoryId = async (req, res) => {
    const { categoryId } = req.params;
    const filteredGrades = await connection_1.db.select({
        id: schema_1.grade.id,
        name: schema_1.grade.name,
        nameAr: schema_1.grade.nameAr
    })
        .from(schema_1.grade)
        .where((0, drizzle_orm_1.eq)(schema_1.grade.categoryId, categoryId));
    return (0, response_1.SuccessResponse)(res, {
        message: "Grades for this category fetched successfully",
        grades: filteredGrades
    }, 200);
};
exports.getGradesByCategoryId = getGradesByCategoryId;
// 5. Update Grade
const updateGrade = async (req, res) => {
    const { id } = req.params;
    const { name, nameAr, parentCategoryId, categoryId } = req.body;
    const [currentGrade] = await connection_1.db.select().from(schema_1.grade).where((0, drizzle_orm_1.eq)(schema_1.grade.id, id));
    if (!currentGrade)
        throw new BadRequest_1.BadRequest("Grade not found");
    const targetName = name !== undefined ? name.trim() : currentGrade.name;
    const targetNameAr = nameAr !== undefined ? nameAr.trim() : currentGrade.nameAr;
    const targetCategoryId = categoryId || currentGrade.categoryId;
    if (name !== undefined && targetName === "")
        throw new BadRequest_1.BadRequest("Name cannot be empty");
    if (nameAr !== undefined && targetNameAr === "")
        throw new BadRequest_1.BadRequest("Arabic name cannot be empty");
    if (name || nameAr || categoryId || parentCategoryId) {
        if (categoryId || parentCategoryId) {
            const finalCategoryId = categoryId || currentGrade.categoryId;
            const [checkCat] = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, finalCategoryId));
            if (!checkCat)
                throw new BadRequest_1.BadRequest("Category not found");
            const finalParentId = parentCategoryId || checkCat.parentCategoryId;
            if (!finalParentId)
                throw new BadRequest_1.BadRequest("Parent Category ID is required for validation");
            const [checkParent] = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, finalParentId));
            if (!checkParent)
                throw new BadRequest_1.BadRequest("Parent category not found");
            if (checkParent.parentCategoryId !== null) {
                throw new BadRequest_1.BadRequest("The parent category must be a top-level category");
            }
            if (checkCat.parentCategoryId !== finalParentId) {
                throw new BadRequest_1.BadRequest("The category must be a child of the selected parent category");
            }
        }
        const [conflict] = await connection_1.db.select()
            .from(schema_1.grade)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.grade.categoryId, targetCategoryId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.grade.name, targetName), (0, drizzle_orm_1.eq)(schema_1.grade.nameAr, targetNameAr)), (0, drizzle_orm_1.ne)(schema_1.grade.id, id)));
        if (conflict) {
            const field = conflict.name === targetName ? "English name" : "Arabic name";
            throw new BadRequest_1.BadRequest(`Conflict: This ${field} already exists in the selected category`);
        }
    }
    const finalParentId = (categoryId || parentCategoryId) ? (async () => {
        const finalCatId = categoryId || currentGrade.categoryId;
        const [catData] = await connection_1.db.select({ parentId: schema_1.category.parentCategoryId }).from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, finalCatId));
        return parentCategoryId || catData?.parentId;
    })() : Promise.resolve(currentGrade.parentCategoryId);
    await connection_1.db.update(schema_1.grade)
        .set({
        name: targetName,
        nameAr: targetNameAr,
        categoryId: targetCategoryId,
        parentCategoryId: await finalParentId,
        updatedAt: new Date()
    })
        .where((0, drizzle_orm_1.eq)(schema_1.grade.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Grade Updated Successfully" }, 200);
};
exports.updateGrade = updateGrade;
// 6. Delete Grade
const deleteGrade = async (req, res) => {
    const { id } = req.params;
    const [existingGrade] = await connection_1.db.select().from(schema_1.grade).where((0, drizzle_orm_1.eq)(schema_1.grade.id, id));
    if (!existingGrade)
        throw new BadRequest_1.BadRequest("Grade not found");
    await connection_1.db.delete(schema_1.grade).where((0, drizzle_orm_1.eq)(schema_1.grade.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Grade Deleted Successfully" }, 200);
};
exports.deleteGrade = deleteGrade;
