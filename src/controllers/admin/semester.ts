import { Request, Response } from "express";
import { db } from "../../models/connection";
import { semesters } from "../../models/schema/admin/semester";
import { eq, sql, aliasedTable, isNull } from "drizzle-orm";
import { category } from "../../models/schema/admin/category";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";

export const createSemester = async (req: Request, res: Response) => {
    const { name, categoryId } = req.body;

    if (!name || !categoryId) {
        throw new BadRequest("Name and Category are Required");
    }

    const exisitingCategory = await db.select().from(category).where(eq(category.id, categoryId));
    if (exisitingCategory.length === 0) {
        throw new NotFound("Category not found");
    }

    // Check if the category has children
    // We search for any category where the parentCategoryId is the ID we are trying to use.
    const children = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.parentCategoryId, categoryId))
        .limit(1); // Optimization: We stop looking after finding just one child

    if (children.length > 0) {
        throw new BadRequest("Invalid Category: You can only add a semester to a leaf category (one with no children).");
    }

    await db.insert(semesters).values({ name, categoryId });
    return SuccessResponse(res, { message: "Semester created successfully" }, 201);
}

export const getCategoriesSelection = async (req: Request, res: Response) => {
    const child = aliasedTable(category, "child");

    const categories = await db.selectDistinct({
        id: category.id,
        name: category.name
    })
        .from(category)
        .leftJoin(child, eq(child.parentCategoryId, category.id))
        .where(isNull(child.id));

    return SuccessResponse(res, { message: "Categories fetched successfully", data: categories }, 200);
}

export const getSemesters = async (req: Request, res: Response) => {
    const AllSemesters = await db.select({
        id: semesters.id,
        name: semesters.name,
        categoryId: semesters.categoryId,
        category: {
            id: category.id,
            name: category.name
        }
    }).from(semesters).innerJoin(category, eq(category.id, semesters.categoryId));
    return SuccessResponse(res, { message: "Semesters fetched successfully", data: AllSemesters }, 200);
}

export const getSemesterbyId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Semester ID is required");
    }
    const semester = await db.select({
        id: semesters.id,
        name: semesters.name,
        categoryId: semesters.categoryId,
        category: {
            id: category.id,
            name: category.name
        }
    }).from(semesters).innerJoin(category, eq(category.id, semesters.categoryId)).where(eq(semesters.id, id));
    if (semester.length === 0) {
        throw new NotFound("Semester not found");
    }
    return SuccessResponse(res, { message: "Semester fetched successfully", data: semester }, 200);
}

export const updateSemester = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, categoryId } = req.body;
    if (!id) {
        throw new BadRequest("Semester ID is required");
    }
    if (categoryId) {
        const exisitingCategory = await db.select().from(category).where(eq(category.id, categoryId));
        if (exisitingCategory.length === 0) {
            throw new NotFound("Category not found");
        }
    }
    const existingSemester = await db.select().from(semesters).where(eq(semesters.id, id));
    if (existingSemester.length === 0) {
        throw new NotFound("Semester not found");
    }

    const children = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.parentCategoryId, categoryId))
        .limit(1); // Optimization: We stop looking after finding just one child

    if (children.length > 0) {
        throw new BadRequest("Invalid Category: You can only add a semester to a leaf category (one with no children). ");
    }

    await db.update(semesters).set({
        name: name || semesters.name,
        categoryId: categoryId || semesters.categoryId
    }).where(eq(semesters.id, id));

    return SuccessResponse(res, { message: "Semester updated successfully" }, 200);
}

export const deleteSemester = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Semester ID is required");
    }
    const existingSemester = await db.select().from(semesters).where(eq(semesters.id, id));
    if (existingSemester.length === 0) {
        throw new NotFound("Semester not found");
    }
    await db.delete(semesters).where(eq(semesters.id, id));
    return SuccessResponse(res, { message: "Semester deleted successfully" }, 200);
}