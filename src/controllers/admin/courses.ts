import { Request, Response } from "express";
import { db } from "../../models/connection";
import { courses } from "../../models/schema/admin/courses";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";

export const createCourse = async (req: Request, res: Response) => {
    const { name, mainThumbnail, description, price } = req.body;

    await db.insert(courses).values({
        name,
        mainThumbnail,
        description,
        price,
    });
    return SuccessResponse(res, { message: "Course created successfully" }, 200);
};