import { Request, Response } from "express";
import { db } from "../../models/connection";
import {
    sessions,
    teachers,
    Student,
    sessionUsers,
    sessionGroups,
    groupStudents,
    sessionRatingQuestions,
    sessionStudentRatings,
    sessionStudentQuestionRatings
} from "../../models/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import { v4 as uuidv4 } from "uuid";
import { UnauthorizedError } from "../../Errors";

const getStudentId = (req: Request): string => {
    const id = (req as any).user?.id;
    if (!id) throw new UnauthorizedError("Not authenticated");
    return id;
};

/**
 * Check if the student is enrolled in the given session (directly or via group).
 */
async function verifyStudentSessionAccess(sessionId: string, studentId: string) {
    const [session] = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            teacherId: sessions.teacherId,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId));

    if (!session) {
        throw new NotFound("Session not found");
    }

    const [directMembership] = await db
        .select({ id: sessionUsers.id })
        .from(sessionUsers)
        .where(and(
            eq(sessionUsers.sessionId, sessionId),
            eq(sessionUsers.studentId, studentId)
        ));

    let hasAccess = !!directMembership;

    if (!hasAccess) {
        const [groupMembership] = await db
            .select({ id: sessionGroups.id })
            .from(sessionGroups)
            .innerJoin(groupStudents, eq(sessionGroups.groupId, groupStudents.groupId))
            .where(and(
                eq(sessionGroups.sessionId, sessionId),
                eq(groupStudents.studentId, studentId)
            ));
        hasAccess = !!groupMembership;
    }

    if (!hasAccess) {
        throw new NotFound("You are not enrolled in this session");
    }

    return session;
}

// ── GET RATING FORM DATA FOR STUDENT'S SESSION ────────────────────
export const getSessionRatingForm = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const sessionId = req.params.sessionId || req.params.id;

    if (!sessionId) {
        throw new BadRequest("sessionId parameter is required");
    }

    const session = await verifyStudentSessionAccess(sessionId, studentId);

    // 1. Fetch active rating questions
    const questions = await db
        .select({
            id: sessionRatingQuestions.id,
            title: sessionRatingQuestions.title,
            description: sessionRatingQuestions.description,
            category: sessionRatingQuestions.category,
            weight: sessionRatingQuestions.weight,
            order: sessionRatingQuestions.order,
        })
        .from(sessionRatingQuestions)
        .where(eq(sessionRatingQuestions.isActive, true))
        .orderBy(sessionRatingQuestions.order);

    // 2. Fetch existing rating if already rated
    const [existingRating] = await db
        .select({
            id: sessionStudentRatings.id,
            overallRating: sessionStudentRatings.overallRating,
            generalComment: sessionStudentRatings.generalComment,
            createdAt: sessionStudentRatings.createdAt,
            updatedAt: sessionStudentRatings.updatedAt,
        })
        .from(sessionStudentRatings)
        .where(and(
            eq(sessionStudentRatings.sessionId, sessionId),
            eq(sessionStudentRatings.studentId, studentId)
        ));

    let questionRatings: any[] = [];
    if (existingRating) {
        questionRatings = await db
            .select({
                id: sessionStudentQuestionRatings.id,
                questionId: sessionStudentQuestionRatings.questionId,
                rating: sessionStudentQuestionRatings.rating,
                comment: sessionStudentQuestionRatings.comment,
            })
            .from(sessionStudentQuestionRatings)
            .where(eq(sessionStudentQuestionRatings.sessionStudentRatingId, existingRating.id));
    }

    SuccessResponse(res, {
        message: "Rating form data retrieved successfully",
        data: {
            session,
            questions,
            existingRating: existingRating
                ? {
                    ...existingRating,
                    overallRating: Number(existingRating.overallRating),
                    questionRatings,
                }
                : null,
        }
    });
};

// ── STUDENT SUBMITS SESSION RATINGS ──────────────────────────────
export const submitSessionRatings = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const sessionId = req.params.sessionId || req.params.id;

    if (!sessionId) {
        throw new BadRequest("sessionId parameter is required");
    }

    const session = await verifyStudentSessionAccess(sessionId, studentId);

    const { ratings, generalComment } = req.body;

    if (!Array.isArray(ratings) || ratings.length === 0) {
        throw new BadRequest("At least one question rating is required");
    }

    // Fetch active rating questions to validate IDs and weights
    const allQuestions = await db
        .select({ id: sessionRatingQuestions.id, weight: sessionRatingQuestions.weight })
        .from(sessionRatingQuestions)
        .where(eq(sessionRatingQuestions.isActive, true));

    const questionMap = new Map<string, number>(
        allQuestions.map(q => [q.id, q.weight || 1])
    );

    let totalWeight = 0;
    let weightedSum = 0;

    for (const r of ratings) {
        const num = Number(r.rating);
        if (isNaN(num) || num < 1 || num > 10) {
            throw new BadRequest(`Rating must be between 1 and 10 for question ${r.questionId}`);
        }
        const weight = questionMap.get(r.questionId);
        if (weight === undefined) {
            throw new BadRequest(`Rating question ${r.questionId} is invalid or inactive`);
        }
        totalWeight += weight;
        weightedSum += num * weight;
    }

    const overallRating = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : 0;
    let savedRatingId = "";

    await db.transaction(async (tx) => {
        const [existing] = await tx
            .select({ id: sessionStudentRatings.id })
            .from(sessionStudentRatings)
            .where(
                and(
                    eq(sessionStudentRatings.sessionId, sessionId),
                    eq(sessionStudentRatings.studentId, studentId)
                )
            );

        if (existing) {
            savedRatingId = existing.id;
            await tx
                .update(sessionStudentRatings)
                .set({
                    overallRating,
                    generalComment: generalComment || null,
                    updatedAt: new Date(),
                })
                .where(eq(sessionStudentRatings.id, savedRatingId));

            await tx
                .delete(sessionStudentQuestionRatings)
                .where(eq(sessionStudentQuestionRatings.sessionStudentRatingId, savedRatingId));
        } else {
            savedRatingId = uuidv4();
            await tx.insert(sessionStudentRatings).values({
                id: savedRatingId,
                sessionId,
                studentId,
                overallRating,
                generalComment: generalComment || null,
            });
        }

        const questionValues = ratings.map(r => ({
            id: uuidv4(),
            sessionStudentRatingId: savedRatingId,
            questionId: r.questionId,
            rating: Number(r.rating),
            comment: r.comment?.trim() || null,
        }));

        await tx.insert(sessionStudentQuestionRatings).values(questionValues);
    });

    SuccessResponse(res, {
        message: "Session rating submitted successfully",
        data: {
            ratingId: savedRatingId,
            sessionId,
            sessionName: session.name,
            overallRating,
            ratedQuestionsCount: ratings.length,
        }
    });
};

// ── GET LOGGED-IN STUDENT'S SESSION RATINGS / EVALUATIONS ─────────
export const getMySessionRatings = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);

    const ratingsList = await db
        .select({
            id: sessionStudentRatings.id,
            sessionId: sessionStudentRatings.sessionId,
            sessionName: sessions.name,
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            teacherId: sessions.teacherId,
            teacherName: teachers.name,
            overallRating: sessionStudentRatings.overallRating,
            generalComment: sessionStudentRatings.generalComment,
            createdAt: sessionStudentRatings.createdAt,
        })
        .from(sessionStudentRatings)
        .innerJoin(sessions, eq(sessionStudentRatings.sessionId, sessions.id))
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .where(eq(sessionStudentRatings.studentId, studentId))
        .orderBy(desc(sessionStudentRatings.createdAt));

    if (ratingsList.length === 0) {
        return SuccessResponse(res, {
            message: "No session evaluations found",
            data: {
                averageRating: 0,
                totalSessionsEvaluated: 0,
                evaluations: [],
            }
        });
    }

    const ratingIds = ratingsList.map(r => r.id);

    const questionRatings = await db
        .select({
            id: sessionStudentQuestionRatings.id,
            sessionStudentRatingId: sessionStudentQuestionRatings.sessionStudentRatingId,
            questionId: sessionStudentQuestionRatings.questionId,
            rating: sessionStudentQuestionRatings.rating,
            comment: sessionStudentQuestionRatings.comment,
            questionTitle: sessionRatingQuestions.title,
            questionCategory: sessionRatingQuestions.category,
        })
        .from(sessionStudentQuestionRatings)
        .innerJoin(sessionRatingQuestions, eq(sessionStudentQuestionRatings.questionId, sessionRatingQuestions.id))
        .where(inArray(sessionStudentQuestionRatings.sessionStudentRatingId, ratingIds));

    const qMap = new Map<string, any[]>();
    for (const qr of questionRatings) {
        if (!qMap.has(qr.sessionStudentRatingId)) {
            qMap.set(qr.sessionStudentRatingId, []);
        }
        qMap.get(qr.sessionStudentRatingId)!.push({
            id: qr.id,
            questionId: qr.questionId,
            questionTitle: qr.questionTitle,
            category: qr.questionCategory,
            rating: qr.rating,
            comment: qr.comment,
        });
    }

    const overallSum = ratingsList.reduce((sum, r) => sum + (Number(r.overallRating) || 0), 0);
    const avgRating = Number((overallSum / ratingsList.length).toFixed(2));

    const evaluations = ratingsList.map(r => ({
        id: r.id,
        sessionId: r.sessionId,
        sessionName: r.sessionName,
        sessionDate: r.sessionDate,
        timeFrom: r.timeFrom,
        timeTo: r.timeTo,
        teacherName: r.teacherName,
        overallRating: Number(r.overallRating),
        generalComment: r.generalComment,
        createdAt: r.createdAt,
        questionRatings: qMap.get(r.id) || [],
    }));

    SuccessResponse(res, {
        message: "Session evaluations retrieved successfully",
        data: {
            averageRating: avgRating,
            totalSessionsEvaluated: ratingsList.length,
            evaluations,
        }
    });
};

// ── GET SINGLE SESSION EVALUATION FOR LOGGED-IN STUDENT ───────────
export const getMySessionRatingBySessionId = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const sessionId = req.params.sessionId || req.params.id;

    const [rating] = await db
        .select({
            id: sessionStudentRatings.id,
            sessionId: sessionStudentRatings.sessionId,
            sessionName: sessions.name,
            sessionDate: sessions.sessionDate,
            teacherId: sessions.teacherId,
            teacherName: teachers.name,
            overallRating: sessionStudentRatings.overallRating,
            generalComment: sessionStudentRatings.generalComment,
            createdAt: sessionStudentRatings.createdAt,
        })
        .from(sessionStudentRatings)
        .innerJoin(sessions, eq(sessionStudentRatings.sessionId, sessions.id))
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .where(
            and(
                eq(sessionStudentRatings.sessionId, sessionId),
                eq(sessionStudentRatings.studentId, studentId)
            )
        );

    if (!rating) {
        throw new NotFound("No evaluation found for this session");
    }

    const questionRatings = await db
        .select({
            id: sessionStudentQuestionRatings.id,
            questionId: sessionStudentQuestionRatings.questionId,
            rating: sessionStudentQuestionRatings.rating,
            comment: sessionStudentQuestionRatings.comment,
            questionTitle: sessionRatingQuestions.title,
            questionCategory: sessionRatingQuestions.category,
        })
        .from(sessionStudentQuestionRatings)
        .innerJoin(sessionRatingQuestions, eq(sessionStudentQuestionRatings.questionId, sessionRatingQuestions.id))
        .where(eq(sessionStudentQuestionRatings.sessionStudentRatingId, rating.id));

    SuccessResponse(res, {
        message: "Session evaluation retrieved successfully",
        data: {
            ...rating,
            overallRating: Number(rating.overallRating),
            questionRatings,
        }
    });
};
