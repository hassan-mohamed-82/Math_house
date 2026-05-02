import { Request, Response } from "express";
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { db } from "../../models/connection";
import { eq, and, or, inArray, sql, ne, aliasedTable } from "drizzle-orm";
import { grade, category } from "../../models/schema";
import { v4 as uuidv4 } from "uuid";

// 1. Create Grades (Bulk Insert)
export const createGrade = async (req: Request, res: Response) => {
    const { parentCategoryId, categoryId, gradesList } = req.body;

    if (!parentCategoryId) throw new BadRequest("Parent Category ID is required");
    if (!categoryId) throw new BadRequest("Category ID is required");
    if (!gradesList || !Array.isArray(gradesList) || gradesList.length === 0) {
        throw new BadRequest("Grades list must be a non-empty array");
    }

    // 1. Validate parent category is top-level
    const [parentCategory] = await db.select().from(category).where(eq(category.id, parentCategoryId));
    if (!parentCategory) throw new BadRequest("Parent category not found");
    if (parentCategory.parentCategoryId !== null) {
        throw new BadRequest("The selected parent category must be a top-level category (no parent)");
    }

    // 2. Validate sub-category belongs to the parent category
    const [existingCategory] = await db.select().from(category).where(eq(category.id, categoryId));
    if (!existingCategory) throw new BadRequest("Category not found");
    if (existingCategory.parentCategoryId !== parentCategoryId) {
        throw new BadRequest("The selected category must be a child of the selected parent category");
    }

    const names = new Set<string>();
    const namesAr = new Set<string>();

    for (const item of gradesList) {
        const trimmedName = item.name?.trim();
        const trimmedNameAr = item.nameAr?.trim();

        if (!trimmedName || !trimmedNameAr) {
            throw new BadRequest("Each grade must have a valid name and nameAr");
        }

        if (names.has(trimmedName) || namesAr.has(trimmedNameAr)) {
            throw new BadRequest(`Duplicate names found in your request: ${trimmedName}`);
        }
        names.add(trimmedName);
        namesAr.add(trimmedNameAr);
    }

    const duplicateInDb = await db.select()
        .from(grade)
        .where(
            and(
                eq(grade.categoryId, categoryId),
                or(
                    inArray(grade.name, Array.from(names)),
                    inArray(grade.nameAr, Array.from(namesAr))
                )
            )
        );

    if (duplicateInDb.length > 0) {
        throw new BadRequest(`One or more grades already exist in this category: ${duplicateInDb[0].name}`);
    }

    const dataToInsert = gradesList.map(item => ({
        id: uuidv4(),
        name: item.name.trim(),
        nameAr: item.nameAr.trim(),
        categoryId,
        parentCategoryId
    }));

    await db.insert(grade).values(dataToInsert);

    return SuccessResponse(res, {
        message: `${dataToInsert.length} Grades Created Successfully`
    }, 201);
};

// 2. Get All Grades (With Category Info)
export const getAllGrades = async (req: Request, res: Response) => {
    const parentCategory = aliasedTable(category, "parentCategory");
    const grades = await db.select({
        id: grade.id,
        name: grade.name,
        nameAr: grade.nameAr,
        categoryId: grade.categoryId,
        categoryName: category.name,
        parentCategoryId: grade.parentCategoryId,
        parentCategoryName: parentCategory.name,
        createdAt: grade.createdAt
    })
        .from(grade)
        .leftJoin(category, eq(grade.categoryId, category.id))
        .leftJoin(parentCategory, eq(grade.parentCategoryId, parentCategory.id));

    return SuccessResponse(res, { message: "Grades Fetched Successfully", grades }, 200);
};

// 3. Get Grade By ID
export const getGradeById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [foundGrade] = await db.select().from(grade).where(eq(grade.id, id));

    if (!foundGrade) throw new BadRequest("Grade not found");

    return SuccessResponse(res, { message: "Grade Fetched Successfully", grade: foundGrade }, 200);
};

// 4. Get Grades By Category ID
export const getGradesByCategoryId = async (req: Request, res: Response) => {
    const { categoryId } = req.params;

    const filteredGrades = await db.select({
        id: grade.id,
        name: grade.name,
        nameAr: grade.nameAr
    })
        .from(grade)
        .where(eq(grade.categoryId, categoryId));

    return SuccessResponse(res, {
        message: "Grades for this category fetched successfully",
        grades: filteredGrades
    }, 200);
};

// 5. Update Grade
export const updateGrade = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, nameAr, parentCategoryId, categoryId } = req.body;

    const [currentGrade] = await db.select().from(grade).where(eq(grade.id, id));
    if (!currentGrade) throw new BadRequest("Grade not found");

    const targetName = name !== undefined ? name.trim() : currentGrade.name;
    const targetNameAr = nameAr !== undefined ? nameAr.trim() : currentGrade.nameAr;
    const targetCategoryId = categoryId || currentGrade.categoryId;

    if (name !== undefined && targetName === "") throw new BadRequest("Name cannot be empty");
    if (nameAr !== undefined && targetNameAr === "") throw new BadRequest("Arabic name cannot be empty");

    if (name || nameAr || categoryId || parentCategoryId) {
        if (categoryId || parentCategoryId) {
            const finalCategoryId = categoryId || currentGrade.categoryId;
            const [checkCat] = await db.select().from(category).where(eq(category.id, finalCategoryId));
            if (!checkCat) throw new BadRequest("Category not found");

            const finalParentId = parentCategoryId || checkCat.parentCategoryId;
            if (!finalParentId) throw new BadRequest("Parent Category ID is required for validation");

            const [checkParent] = await db.select().from(category).where(eq(category.id, finalParentId));
            if (!checkParent) throw new BadRequest("Parent category not found");
            if (checkParent.parentCategoryId !== null) {
                throw new BadRequest("The parent category must be a top-level category");
            }

            if (checkCat.parentCategoryId !== finalParentId) {
                throw new BadRequest("The category must be a child of the selected parent category");
            }
        }
        const [conflict] = await db.select()
            .from(grade)
            .where(
                and(
                    eq(grade.categoryId, targetCategoryId),
                    or(
                        eq(grade.name, targetName),
                        eq(grade.nameAr, targetNameAr)
                    ),
                    ne(grade.id, id)
                )
            );

        if (conflict) {
            const field = conflict.name === targetName ? "English name" : "Arabic name";
            throw new BadRequest(`Conflict: This ${field} already exists in the selected category`);
        }
    }
    const finalParentId = (categoryId || parentCategoryId) ? (async () => {
        const finalCatId = categoryId || currentGrade.categoryId;
        const [catData] = await db.select({ parentId: category.parentCategoryId }).from(category).where(eq(category.id, finalCatId));
        return parentCategoryId || catData?.parentId;
    })() : Promise.resolve(currentGrade.parentCategoryId);

    await db.update(grade)
        .set({
            name: targetName,
            nameAr: targetNameAr,
            categoryId: targetCategoryId,
            parentCategoryId: await finalParentId,
            updatedAt: new Date()
        })
        .where(eq(grade.id, id));

    return SuccessResponse(res, { message: "Grade Updated Successfully" }, 200);
};

// 6. Delete Grade
export const deleteGrade = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [existingGrade] = await db.select().from(grade).where(eq(grade.id, id));
    if (!existingGrade) throw new BadRequest("Grade not found");

    await db.delete(grade).where(eq(grade.id, id));

    return SuccessResponse(res, { message: "Grade Deleted Successfully" }, 200);
};