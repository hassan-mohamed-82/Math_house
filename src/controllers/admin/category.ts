import { Request, Response } from "express";
import { category } from "../../models/schema";
import { db } from "../../models/connection";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { saveBase64Image } from "../../utils/handleImages";

export const createCategory = async (req: Request, res: Response) => {
    const { name, description, image } = req.body;

    if (!name || !description || !image) {
        throw new BadRequest("All fields are required");
    }

    const existingCategory = await db.select().from(category).where(eq(category.name, name));

    if (existingCategory.length > 0) {
        throw new BadRequest("Category already exists");
    }

    const logoUrl = await validateAndSaveLogo(req, logo);

    await db.insert(category).values({ name, description, image });

    return SuccessResponse(res, { message: "Category created successfully" }, 200);
}

export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Category id is required");
    }
    const { name, description, image } = req.body;

    const existingCategory = await db.select().from(category).where(eq(category.id, id));

    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    await db.update(category).set({ name: name || existingCategory[0].name, description: description || existingCategory[0].description, image: image || existingCategory[0].image }).where(eq(category.id, id));

    return SuccessResponse(res, { message: "Category updated successfully" }, 200);
}

export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Category id is required");
    }
    const existingCategory = await db.select().from(category).where(eq(category.id, id));

    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    await db.delete(category).where(eq(category.id, id));

    return SuccessResponse(res, { message: "Category deleted successfully" }, 200);
}

export const getAllCategory = async (req: Request, res: Response) => {
    const categories = await db.select().from(category);
    return SuccessResponse(res, { message: "Categories fetched successfully", data: categories }, 200);
}

export const getCategoryById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Category id is required");
    }
    const existingCategory = await db.select().from(category).where(eq(category.id, id));

    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    return SuccessResponse(res, { message: "Category fetched successfully", data: existingCategory[0] }, 200);
}
