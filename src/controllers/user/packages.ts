import { Request, Response } from "express";
import { BadRequest, NotFound, UnauthorizedError } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { db } from '../../models/connection';
import { packages } from "../../models/schema";

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
            name: packages.categoryId,
        },
        course: {
            id: packages.courseId,
            name: packages.courseId,
        },
    }).from(packages);

    return SuccessResponse(res, { message: "Packages retrieved successfully", data: AllPackages });
};