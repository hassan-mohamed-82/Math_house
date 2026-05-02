import { Request, Response } from "express";
import { db } from "../../models/connection";
import { category } from "../../models/schema";
import { eq, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { UnauthorizedError } from "../../Errors";
import { Student } from "../../models/schema/admin/Student";

export const getAllCategory = async (req: Request, res: Response) => {
    const studentId = req.user?.id;
    if (!studentId) throw new UnauthorizedError("Not authenticated");

    const [student] = await db.select({ categoryId: Student.category }).from(Student).where(eq(Student.id, studentId));
    if (!student) throw new BadRequest("Student not found");

    const categories = await db.select().from(category);

    const categoryMap = new Map<string, typeof categories[0]>();
    const parentIds = new Set<string>();

    categories.forEach(cat => {
        categoryMap.set(cat.id, cat);
        if (cat.parentCategoryId) {
            parentIds.add(cat.parentCategoryId);
        }
    });

    const isDescendant = (catId: string, targetAncestorId: string): boolean => {
        let current = categoryMap.get(catId);
        while (current?.parentCategoryId) {
            if (current.parentCategoryId === targetAncestorId) return true;
            current = categoryMap.get(current.parentCategoryId);
        }
        return false;
    };

    const filteredCategories = categories.filter(cat => isDescendant(cat.id, student.categoryId));

    const data = filteredCategories.map(cat => {
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

        const isLeaf = !parentIds.has(cat.id);

        return {
            ...cat,
            ancestors,
            isLeaf
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

