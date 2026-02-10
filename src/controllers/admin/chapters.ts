import { Request, Response } from "express";
import { db } from "../../models/connection";
import { chapters, courses, category, teachers } from "../../models/schema";
import { eq, max, asc, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";

// Shared detailed select with joins for chapters
const chapterDetailedQuery = () =>
    db.select({
        chapter: {
            id: chapters.id,
            name: chapters.name,
            description: chapters.description,
            image: chapters.image,
            preRequisition: chapters.preRequisition,
            whatYouGain: chapters.whatYouGain,
            duration: chapters.duration,
            price: chapters.price,
            discount: chapters.discount,
            totalPrice: chapters.totalPrice,
            order: chapters.order,
            createdAt: chapters.createdAt,
            updatedAt: chapters.updatedAt,
        },
        course: {
            id: courses.id,
            name: courses.name,
            description: courses.description,
            image: courses.image,
        },
        category: {
            id: category.id,
            name: category.name,
            description: category.description,
            image: category.image,
        },
        teacher: {
            id: teachers.id,
            name: teachers.name,
            email: teachers.email,
            avatar: teachers.avatar,
        },
    })
        .from(chapters)
        .leftJoin(courses, eq(chapters.courseId, courses.id))
        .leftJoin(category, eq(chapters.categoryId, category.id))
        .leftJoin(teachers, eq(chapters.teacherId, teachers.id));

export const createChapter = async (req: Request, res: Response) => {
    const { name, courseId, description, image, teacherId, preRequisition, whatYouGain, duration, price, discount } = req.body;
    if (!name || !courseId || !teacherId || !duration || !price) {
        throw new BadRequest("Name, Course ID, Teacher ID, Duration and Price are required");
    }
    const existingChapter = await db.select().from(chapters).where(eq(chapters.name, name));
    if (existingChapter.length > 0) {
        throw new BadRequest("Chapter already exists");
    }
    const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest("Course not found");
    }

    // Derive categoryId from the course
    const categoryId = existingCourse[0].categoryId;

    const existingTeacher = await db.select().from(teachers).where(eq(teachers.id, teacherId));
    if (existingTeacher.length === 0) {
        throw new BadRequest("Teacher not found");
    }

    // Auto-compute order: MAX(order) + 1 for this course
    const [maxOrderResult] = await db.select({ maxOrder: max(chapters.order) }).from(chapters).where(eq(chapters.courseId, courseId));
    const nextOrder = (maxOrderResult?.maxOrder ?? 0) + 1;

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
        order: nextOrder,
    });
    return SuccessResponse(res, { message: "Chapter created successfully", order: nextOrder }, 200);
}

export const getChapterById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await chapterDetailedQuery().where(eq(chapters.id, id));
    if (result.length === 0) {
        throw new BadRequest("Chapter not found");
    }
    return SuccessResponse(res, { message: "Chapter fetched successfully", ...result[0] }, 200);
}

export const getAllChapters = async (req: Request, res: Response) => {
    const allChapters = await chapterDetailedQuery().orderBy(asc(chapters.order));
    return SuccessResponse(res, { message: "Chapters fetched successfully", chapters: allChapters }, 200);
}

export const getAllChaptersByCourseId = async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const allChapters = await chapterDetailedQuery()
        .where(eq(chapters.courseId, courseId))
        .orderBy(asc(chapters.order));
    return SuccessResponse(res, { message: "Chapters fetched successfully", chapters: allChapters }, 200);
}

export const swapChapterOrder = async (req: Request, res: Response) => {
    const { chapterIdA, chapterIdB } = req.body;
    if (!chapterIdA || !chapterIdB) {
        throw new BadRequest("chapterIdA and chapterIdB are required");
    }

    const [chapterA] = await db.select().from(chapters).where(eq(chapters.id, chapterIdA));
    const [chapterB] = await db.select().from(chapters).where(eq(chapters.id, chapterIdB));

    if (!chapterA || !chapterB) {
        throw new BadRequest("One or both chapters not found");
    }

    if (chapterA.courseId !== chapterB.courseId) {
        throw new BadRequest("Both chapters must belong to the same course");
    }

    // Swap orders
    await db.update(chapters).set({ order: chapterB.order }).where(eq(chapters.id, chapterIdA));
    await db.update(chapters).set({ order: chapterA.order }).where(eq(chapters.id, chapterIdB));

    return SuccessResponse(res, { message: "Chapter order swapped successfully" }, 200);
}

export const updateChapter = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, courseId, description, image, teacherId, preRequisition, whatYouGain, duration, price, discount } = req.body;

    const [existingChapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    if (!existingChapter) {
        throw new BadRequest("Chapter not found");
    }

    // If name is being changed, check for duplicates
    if (name && name !== existingChapter.name) {
        const duplicate = await db.select().from(chapters).where(eq(chapters.name, name));
        if (duplicate.length > 0) {
            throw new BadRequest("A chapter with this name already exists");
        }
    }

    // If courseId is changing, validate and derive new categoryId
    let categoryId = existingChapter.categoryId;
    if (courseId && courseId !== existingChapter.courseId) {
        const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
        if (!course) {
            throw new BadRequest("Course not found");
        }
        categoryId = course.categoryId;
    }

    // If teacherId is changing, validate
    if (teacherId && teacherId !== existingChapter.teacherId) {
        const [teacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId));
        if (!teacher) {
            throw new BadRequest("Teacher not found");
        }
    }

    // Handle image update
    const updatedImage = await handleImageUpdate(req, existingChapter.image, image, "chapters");

    await db.update(chapters).set({
        name: name ?? existingChapter.name,
        courseId: courseId ?? existingChapter.courseId,
        categoryId,
        teacherId: teacherId ?? existingChapter.teacherId,
        description: description !== undefined ? description : existingChapter.description,
        image: updatedImage ?? existingChapter.image,
        preRequisition: preRequisition !== undefined ? preRequisition : existingChapter.preRequisition,
        whatYouGain: whatYouGain !== undefined ? whatYouGain : existingChapter.whatYouGain,
        duration: duration ?? existingChapter.duration,
        price: price ?? existingChapter.price,
        discount: discount !== undefined ? discount : existingChapter.discount,
    }).where(eq(chapters.id, id));

    return SuccessResponse(res, { message: "Chapter updated successfully" }, 200);
}

export const deleteChapter = async (req: Request, res: Response) => {
    const { id } = req.params;
    const existingChapter = await db.select().from(chapters).where(eq(chapters.id, id));
    if (existingChapter.length === 0) {
        throw new BadRequest("Chapter not found");
    }
    await db.delete(chapters).where(eq(chapters.id, id));
    return SuccessResponse(res, { message: "Chapter deleted successfully" }, 200);
}