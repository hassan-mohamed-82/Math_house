import { Request, Response } from "express";
import { db } from "../../models/connection";
import { packages } from "../../models/schema/admin/Package";
import { category } from "../../models/schema/admin/category";
import { courses } from "../../models/schema/admin/courses";
import { eq, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { v4 as uuidv4 } from "uuid";

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

export const selectionPackages = async (req: Request, res: Response) => {
    const { courseId } = req.query;

    let conditions: any[] = [];

    if (courseId) {
        conditions.push(eq(packages.courseId, courseId as string));
    }

    const packagesList = await db.select({
        id: packages.id,
        name: packages.name,
        type: packages.type,
        price: packages.price,
        hasAnswers: packages.hasAnswers,
        answersPrice: packages.answersPrice,
        categoryId: packages.categoryId,
        courseId: packages.courseId,
    })
    .from(packages)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

    SuccessResponse(res, packagesList.map(p => ({
        value: p.id,
        label: `${p.name} - Base: ${p.price}$ ${p.type === 'exam' ? `(Add-on Answers: +${p.answersPrice}$)` : ''}`,
        type: p.type,
        categoryId: p.categoryId,
        courseId: p.courseId,
        price: p.price,
        ...(p.type === 'exam' ? {
            hasAnswers: p.hasAnswers,
            answersPrice: p.answersPrice
        } : {})
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
        duration,
        hasAnswers = false,      
        answersPrice = "0"       
    } = req.body;

    if (!name || !type || !categoryId || !courseId || !number || !price || !duration) {
        throw new BadRequest("All fields are required");
    }

    // الـ Business Logic للتسعير: لو النوع ليس امتحاناً، يجب تصفير حقول الإجابات تلقائياً لحماية اللوجيك
    const finalHasAnswers = type === "exam" ? Boolean(hasAnswers) : false;
    const finalAnswersPrice = type === "exam" ? String(answersPrice) : "0";

    const id = uuidv4();

    await db.insert(packages).values({
        id,
        name,
        type,
        categoryId,
        courseId,
        number: Number(number),
        price: String(price),
        duration: Number(duration),
        hasAnswers: finalHasAnswers,
        answersPrice: finalAnswersPrice
    });

    SuccessResponse(res, { id, message: "Package with custom price-flow created successfully" }, 201);
};

export const getAllPackages = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, type, categoryId, courseId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: any[] = [];

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
            hasAnswers: packages.hasAnswers,
            answersPrice: packages.answersPrice,
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
            hasAnswers: packages.hasAnswers,
            answersPrice: packages.answersPrice,
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
        duration,
        hasAnswers,
        answersPrice
    } = req.body;

    const [existing] = await db
        .select({ id: packages.id })
        .from(packages)
        .where(eq(packages.id, id));

    if (!existing) {
        throw new NotFound("Package not found");
    }

    await db.update(packages)
        .set({ 
            name,
            type,
            categoryId,
            courseId,
            number: Number(number),
            price: String(price),
            duration: Number(duration),
            hasAnswers: type === "exam" ? Boolean(hasAnswers) : false,
            answersPrice: type === "exam" ? String(answersPrice) : "0",
            updatedAt: new Date()
        })
        .where(eq(packages.id, id));

    SuccessResponse(res, { message: "Package updated successfully" });
};

export const deletePackage = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [existing] = await db
        .select({ id: packages.id })
        .from(packages)
        .where(eq(packages.id, id));

    if (!existing) {
        throw new NotFound("Package not found");
    }

    await db.delete(packages).where(eq(packages.id, id));

    SuccessResponse(res, { message: "Package deleted successfully" });
};