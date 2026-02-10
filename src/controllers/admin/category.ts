import { Request, Response } from "express";
import { category } from "../../models/schema";
import { db } from "../../models/connection";
import { eq, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { handleImageUpdate, validateAndSaveLogo } from "../../utils/handleImages";
import { deleteImage } from "../../utils/handleImages";

export const createCategory = async (req: Request, res: Response) => {
    const { name, description, image, parentCategoryId } = req.body;

    if (!name) {
        throw new BadRequest("Name is required");
    }

    if (parentCategoryId) {
        const existingCategory = await db.select().from(category).where(eq(category.id, parentCategoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest("Parent category not found");
        }
    }

    const existingCategory = await db.select().from(category).where(eq(category.name, name));

    if (existingCategory.length > 0) {
        throw new BadRequest("Category already exists");
    }

    const imageUrl = await validateAndSaveLogo(req, image, "category");

    await db.insert(category).values({ name, description, image: imageUrl, parentCategoryId });

    return SuccessResponse(res, { message: "Category created successfully" }, 200);
}

export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Category id is required");
    }
    const { name, description, image, parentCategoryId } = req.body;

    const existingCategory = await db.select().from(category).where(eq(category.id, id));

    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    if (parentCategoryId) {
        const existingCategory = await db.select().from(category).where(eq(category.id, parentCategoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest("Parent category not found");
        }
    }

    const imageUrl = await handleImageUpdate(req, existingCategory[0].image, image, "category");

    await db.update(category).set({
        name: name || existingCategory[0].name,
        description: description || existingCategory[0].description,
        image: imageUrl || existingCategory[0].image,
        parentCategoryId: parentCategoryId || existingCategory[0].parentCategoryId
    }).where(eq(category.id, id));

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

    if (existingCategory[0].image) {
        await deleteImage(existingCategory[0].image);
    }

    return SuccessResponse(res, { message: "Category deleted successfully" }, 200);
}

export const getAllCategory = async (req: Request, res: Response) => {
    const categories = await db.select().from(category);

    const categoryMap = new Map<string, typeof categories[0]>();
    categories.forEach(cat => categoryMap.set(cat.id, cat));

    const data = categories.map(cat => {
        const ancestors: { id: string, name: string, level: number }[] = [];
        let current = cat;
        let level = 1;

        while (current.parentCategoryId) {
            const parent = categoryMap.get(current.parentCategoryId);
            if (parent) {
                ancestors.push({ id: parent.id, name: parent.name, level: level++ });
                current = parent;
            } else {
                break;
            }
        }
        return {
            ...cat,
            ancestors
        };
    });

    return SuccessResponse(res, { message: "Categories fetched successfully", data }, 200);
}

export const getCategoryById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Category id is required");
    }

    const categories = await db.select().from(category);
    const existingCategory = categories.find((c) => c.id === id);

    if (!existingCategory) {
        throw new BadRequest("Category not found");
    }

    const categoryMap = new Map<string, typeof categories[0]>();
    categories.forEach((cat) => categoryMap.set(cat.id, cat));

    const ancestors: { id: string; name: string; level: number }[] = [];
    let current = existingCategory;
    let level = 1;

    while (current.parentCategoryId) {
        const parent = categoryMap.get(current.parentCategoryId);
        if (parent) {
            ancestors.push({ id: parent.id, name: parent.name, level: level++ });
            current = parent;
        } else {
            break;
        }
    }

    const data = {
        ...existingCategory,
        ancestors,
    };

    return SuccessResponse(res, { message: "Category fetched successfully", data }, 200);
}

export const getCategoryLineage = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Category id is required");
    }

    // Verify category exists first
    const existingCategory = await db.select().from(category).where(eq(category.id, id));
    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    const query = sql`
        WITH RECURSIVE category_path AS (
            SELECT id, name, description, image, parent_category_id, created_at, updated_at, 0 as level
            FROM category
            WHERE id = ${id}
            UNION ALL
            SELECT c.id, c.name, c.description, c.image, c.parent_category_id, c.created_at, c.updated_at, cp.level + 1
            FROM category c
            JOIN category_path cp ON c.id = cp.parent_category_id
        )
        SELECT * FROM category_path ORDER BY level;
    `;

    const lineage = await db.execute(query);

    return SuccessResponse(res, { message: "Category lineage fetched successfully", data: lineage[0] }, 200);
}
