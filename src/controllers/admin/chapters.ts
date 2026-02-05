import { Request, Response } from "express";
import { db } from "../../models/connection";
import { chapters, courses, category } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";

export const createChapter = async (req: Request, res: Response) => {
    const { name, categoryId, courseId, description, image, teacherId, preRequisition, whatYouGain, duration, price, discount } = req.body;
    if (!name || !courseId || !categoryId || !teacherId || !duration || !price) {
        throw new BadRequest("Name, Course ID, Category ID, Teacher ID, Duration and Price are required");
    }
    const existingChapter = await db.select().from(chapters).where(eq(chapters.name, name));
    if (existingChapter.length > 0) {
        throw new BadRequest("Chapter already exists");
    }
    const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest("Course not found");
    }
    const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }
    const imageURL = await validateAndSaveLogo(req, image, "chapters");
    await db.insert(chapters).values({
        name,
        courseId,
        categoryId,
        teacherId,
        preRequisition,
        whatYouGain,
        duration,
        price,
        discount,
        description,
        image: imageURL,
    });
    return SuccessResponse(res, { message: "Chapter created successfully" }, 200);
}

// TODO: Add Number of Lessons
export const getChapterById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const chapter = await db.select().from(chapters).where(eq(chapters.id, id));
    if (chapter.length === 0) {
        throw new BadRequest("Chapter not found");
    }
    return SuccessResponse(res, {message: "Chapter fetched successfully", chapter: chapter[0]}, 200);
}

export const getAllChapters = async (req: Request, res: Response) =>{

}

