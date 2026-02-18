import { Request, Response } from "express";
import { db } from "../../models/connection";
import { packages } from "../../models/schema/admin/Package";
import { category } from "../../models/schema/admin/category";
import { courses } from "../../models/schema/admin/courses";
import { eq, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";


// ===================== SELECT OPTIONS =====================

export const selectOptions = async (req: Request, res: Response) => {
    const categoriesList = await db.select({
        id: category.id,
        name: category.name,
    }).from(category);

    SuccessResponse(res, {
        types: [
            { value: "exam", label: "Exam" },
            { value: "question", label: "Question" },
            { value: "live", label: "Live" },
        ],
        categories: categoriesList.map(c => ({
            value: c.id,
            label: c.name
        })),
    });
};

// جلب الـ Courses بناءً على الـ Category
export const getCoursesByCategory = async (req: Request, res: Response) => {
    const { categoryId } = req.params;

    const coursesList = await db
        .select({
            id: courses.id,
            name: courses.name,
        })
        .from(courses)
        .where(eq(courses.categoryId, categoryId));

    SuccessResponse(res, coursesList.map(c => ({
        value: c.id,
        label: c.name
    })));
};


// ===================== PACKAGES CRUD =====================

export const createPackage = async (req: Request, res: Response) => {
    const {
        name,
        type,
        categoryId,
        courseId,
        number,
        price,
        duration
    } = req.body;

    if (!name || !type || !categoryId || !courseId || !number || !price || !duration) {
        throw new BadRequest("All fields are required");
    }

    const [newPackage] = await db.insert(packages).values({
        name,
        type,
        categoryId,
        courseId,
        number: Number(number),
        price: price.toString(),
        duration: Number(duration)
    }).$returningId() as { id: string }[];

    SuccessResponse(res, { id: newPackage.id }, 201);
};

export const getAllPackages = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, type, categoryId, courseId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = [];

    if (type) {
        conditions.push(eq(packages.type, type as "exam" | "question" | "live"));
    }
    if (categoryId) {
        conditions.push(eq(packages.categoryId, categoryId as string));
    }
    if (courseId) {
        conditions.push(eq(packages.courseId, courseId as string));
    }

    const packagesList = await db
        .select({
            id: packages.id,
            name: packages.name,
            type: packages.type,
            categoryId: packages.categoryId,
            categoryName: category.name,
            courseId: packages.courseId,
            courseName: courses.name,
            number: packages.number,
            price: packages.price,
            duration: packages.duration,
        })
        .from(packages)
        .leftJoin(category, eq(packages.categoryId, category.id))
        .leftJoin(courses, eq(packages.courseId, courses.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(Number(limit))
        .offset(offset);

    SuccessResponse(res, packagesList);
};

export const getPackageById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [pkg] = await db
        .select({
            id: packages.id,
            name: packages.name,
            type: packages.type,
            categoryId: packages.categoryId,
            categoryName: category.name,
            courseId: packages.courseId,
            courseName: courses.name,
            number: packages.number,
            price: packages.price,
            duration: packages.duration,
        })
        .from(packages)
        .leftJoin(category, eq(packages.categoryId, category.id))
        .leftJoin(courses, eq(packages.courseId, courses.id))
        .where(eq(packages.id, id));

    if (!pkg) {
        throw new NotFound("Package not found");
    }

    SuccessResponse(res, pkg);
};

export const updatePackage = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        name,
        type,
        categoryId,
        courseId,
        number,
        price,
        duration
    } = req.body;

    await db.update(packages)
        .set({
            name,
            type,
            categoryId,
            courseId,
            number: Number(number),
            price: price.toString(),
            duration: Number(duration),
            updatedAt: new Date()
        })
        .where(eq(packages.id, id));

    SuccessResponse(res, { message: "Package updated successfully" });
};

export const deletePackage = async (req: Request, res: Response) => {
    const { id } = req.params;

    await db.delete(packages).where(eq(packages.id, id));

    SuccessResponse(res, { message: "Package deleted successfully" });
};