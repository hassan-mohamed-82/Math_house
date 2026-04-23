import { Request, Response } from "express";
import { db } from "../../models/connection";
import { chapters, courses, category, teachers, lessons, semesters } from "../../models/schema";
import { eq, asc, and, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";

// Query for fetching chapters with their course, semester, and teacher details
const chapterDetailedQuery = () =>
    db.select({
        chapter: {
            id: chapters.id,
            name: chapters.name,
            description: chapters.description,
            image: chapters.image,
            price: chapters.price,
            totalPrice: chapters.totalPrice,
            order: chapters.order,
        },
        course: {
            id: courses.id,
            name: courses.name,
        },
        semester: {
            id: semesters.id,
            name: semesters.name,
        },
        teacher: {
            id: teachers.id,
            name: teachers.name,
            avatar: teachers.avatar,
        }
    })
        .from(chapters)
        .leftJoin(courses, eq(chapters.courseId, courses.id))
        .leftJoin(semesters, eq(chapters.semesterId, semesters.id))
        .leftJoin(teachers, eq(chapters.teacherId, teachers.id));

// 1. Get all chapters with dynamic filtering
export const getAllChapters = async (req: Request, res: Response) => {
    const { courseId, semesterId } = req.query;

    let query = chapterDetailedQuery().where(sql`1=1`);

    // If courseId is sent, add it to the filter
    if (courseId) {
        query = chapterDetailedQuery().where(eq(chapters.courseId, courseId as string));
    }

    // If semesterId is sent, add it to the filter (or with courseId)
    if (semesterId) {
        query = chapterDetailedQuery().where(
            courseId
                ? and(eq(chapters.courseId, courseId as string), eq(chapters.semesterId, semesterId as string))
                : eq(chapters.semesterId, semesterId as string)
        );
    }

    const results = await query.orderBy(asc(chapters.order));

    return SuccessResponse(res, {
        message: "Chapters fetched successfully",
        chapters: results
    }, 200);
}

// 2. Get all chapters by course id
export const getAllChaptersByCourseId = async (req: Request, res: Response) => {
    const { courseId } = req.params;

    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course) throw new BadRequest("Course not found");

    const chaptersList = await chapterDetailedQuery()
        .where(eq(chapters.courseId, courseId))
        .orderBy(asc(chapters.order));

    return SuccessResponse(res, { message: "Chapters fetched successfully", chapters: chaptersList }, 200);
}

// 3. Get chapter by id with its lessons
export const getChapterById = async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get chapter data
    const [chapterData] = await chapterDetailedQuery().where(eq(chapters.id, id));

    if (!chapterData) throw new BadRequest("Chapter not found");

    // Get lessons of this chapter
    const chapterLessons = await db.select()
        .from(lessons)
        .where(eq(lessons.chapterId, id))
        .orderBy(asc(lessons.id));

    return SuccessResponse(res, {
        message: "Chapter details fetched",
        chapter: { ...chapterData, lessons: chapterLessons }
    }, 200);
}