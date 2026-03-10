import { Request, Response } from "express";
import { BadRequest, NotFound, UnauthorizedError } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { db } from '../../models/connection';
import { category, courses, packages } from "../../models/schema";
import { eq } from "drizzle-orm";

export const getPackages = async (req: Request, res: Response) => {
    const AllPackages = await db.select({
        id: packages.id,
        name: packages.name,
        type: packages.type,
        categoryId: packages.categoryId,
        courseId: packages.courseId,
        number: packages.number,
        price: packages.price,
        duration: packages.duration,
        category: {
            id: packages.categoryId,
            name: category.name,
        },
        course: {
            id: packages.courseId,
            name: courses.name,
        },
    }).from(packages)
    .leftJoin(category, eq(packages.categoryId, category.id))
    .leftJoin(courses, eq(packages.courseId, courses.id));

    return SuccessResponse(res, { message: "Packages retrieved successfully", data: AllPackages });
};