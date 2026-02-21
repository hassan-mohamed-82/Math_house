import { Request, Response } from "express";
import { BadRequest } from "../../Errors/BadRequest";
import { courses, rawScore, diagnosticExam } from "../../models/schema";
import { db } from "../../models/connection";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";

export const createRawScore = async (req: Request, res: Response) => {
    const { name, courseId, score, is_giftingScore, giftingScore } = req.body;
    if (!name || !courseId || !score || is_giftingScore === undefined || giftingScore === undefined) {
        throw new BadRequest("Name, Course ID, Score, Is Gifting Score, Gifting Score are required");
    }

    const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest("Course not found");
    }

    const existingRawScore = await db.select().from(rawScore).where(eq(rawScore.name, name));
    if (existingRawScore.length > 0) {
        throw new BadRequest("Raw Score already exists");
    }

    await db.insert(rawScore).values({
        name,
        courseId,
        score,
        is_giftingScore,
        giftingScore,
    });

    return SuccessResponse(res, { message: "Raw Score created successfully" }, 200);
}

export const getAllRawScores = async (req: Request, res: Response) => {
    const rawScores = await db.select({
        id: rawScore.id,
        name: rawScore.name,
        score: rawScore.score,
        is_giftingScore: rawScore.is_giftingScore,
        giftingScore: rawScore.giftingScore,
        courses: {
            id: courses.id,
            name: courses.name,
        }
    }).from(rawScore).innerJoin(courses, eq(rawScore.courseId, courses.id));
    return SuccessResponse(res, { message: "Raw Score fetched successfully", rawScores }, 200);
}

export const updateRawScore = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, courseId, score, is_giftingScore, giftingScore } = req.body;

    const existingRawScore = await db.select().from(rawScore).where(eq(rawScore.id, id));
    if (existingRawScore.length === 0) {
        throw new BadRequest("Raw Score not found");
    }

    if (courseId) {
        const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
        if (existingCourse.length === 0) {
            throw new BadRequest("Course not found");
        }
    }

    await db.update(rawScore).set({
        name: name !== undefined ? name : existingRawScore[0].name,
        courseId: courseId !== undefined ? courseId : existingRawScore[0].courseId,
        score: score !== undefined ? score : existingRawScore[0].score,
        is_giftingScore: is_giftingScore !== undefined ? is_giftingScore : existingRawScore[0].is_giftingScore,
        giftingScore: giftingScore !== undefined ? giftingScore : existingRawScore[0].giftingScore,
    }).where(eq(rawScore.id, id));

    return SuccessResponse(res, { message: "Raw Score updated successfully" }, 200);
}

export const deleteRawScore = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Raw Score ID is required");
    }
    const existingRawScore = await db.select().from(rawScore).where(eq(rawScore.id, id));
    if (existingRawScore.length === 0) {
        throw new BadRequest("Raw Score not found");
    }
    const diagnosticExams = await db.select().from(diagnosticExam).where(eq(diagnosticExam.rawScoreId, id));
    if (diagnosticExams.length > 0) {
        throw new BadRequest("Cannot Delete Raw Score as it is used in Diagnostic Exam");
    }
    await db.delete(rawScore).where(eq(rawScore.id, id));
    return SuccessResponse(res, { message: "Raw Score deleted successfully" }, 200);
}

export const getRawScorebyId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Raw Score ID is required");
    }
    const existingRawScore = await db.select().from(rawScore).where(eq(rawScore.id, id));
    if (existingRawScore.length === 0) {
        throw new BadRequest("Raw Score not found");
    }
    return SuccessResponse(res, { message: "Raw Score fetched successfully", rawScore: existingRawScore[0] }, 200);
}