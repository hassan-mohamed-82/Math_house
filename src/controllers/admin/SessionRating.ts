import { Request, Response } from "express";
import { db } from "../../models/connection";
import {
    sessions,
    teachers,
    Student,
    admins,
    sessionRatingQuestions,
    sessionStudentRatings,
    sessionStudentQuestionRatings
} from "../../models/schema";
import { eq, desc, and, inArray, sql, avg, count } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import { v4 as uuidv4 } from "uuid";

// ── RATE ONE OR MULTIPLE STUDENTS FOR A SESSION ──────────────────
export const rateSessionStudents = async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const adminId = (req as any).user?.id;
    
    // Support either single student payload or array of students
    const studentsPayload: Array<{
        studentId: string;
        ratings: Array<{ questionId: string; rating: number; comment?: string }>;
        generalComment?: string;
    }> = req.body.students || (req.body.studentId ? [req.body] : []);

    if (studentsPayload.length === 0) {
        throw new BadRequest("No student rating data provided");
    }

    // 1. Verify session exists
    const [session] = await db
        .select({ id: sessions.id, name: sessions.name, teacherId: sessions.teacherId })
        .from(sessions)
        .where(eq(sessions.id, sessionId));

    if (!session) {
        throw new NotFound("Session not found");
    }

    // 2. Fetch all active rating questions to validate questions & get weights
    const allQuestions = await db
        .select({ id: sessionRatingQuestions.id, title: sessionRatingQuestions.title, weight: sessionRatingQuestions.weight })
        .from(sessionRatingQuestions);

    const questionMap = new Map<string, { id: string; title: string; weight: number }>(
        allQuestions.map(q => [q.id, { id: q.id, title: q.title, weight: q.weight || 1 }])
    );

    // 3. Process each student rating
    const savedRatings: Array<{
        ratingId: string;
        studentId: string;
        studentName: string;
        overallRating: number;
        ratedQuestionsCount: number;
    }> = [];

    for (const item of studentsPayload) {
        const { studentId, ratings, generalComment } = item;

        if (!studentId) {
            throw new BadRequest("studentId is required for each rating");
        }

        if (!Array.isArray(ratings) || ratings.length === 0) {
            throw new BadRequest(`At least one question rating is required for student ${studentId}`);
        }

        // Verify student exists
        const [student] = await db
            .select({ id: Student.id, firstname: Student.firstname, lastname: Student.lastname })
            .from(Student)
            .where(eq(Student.id, studentId));

        if (!student) {
            throw new NotFound(`Student with ID ${studentId} not found`);
        }

        // Validate ratings and calculate weighted average
        let totalWeight = 0;
        let weightedSum = 0;

        for (const r of ratings) {
            const num = Number(r.rating);
            if (isNaN(num) || num < 1 || num > 10) {
                throw new BadRequest(`Rating must be between 1 and 10 for question ${r.questionId}`);
            }
            const q = questionMap.get(r.questionId);
            if (!q) {
                throw new BadRequest(`Rating question ${r.questionId} does not exist`);
            }
            const w = q.weight;
            totalWeight += w;
            weightedSum += num * w;
        }

        const overallRating = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : 0;

        // Upsert master rating record
        await db.transaction(async (tx) => {
            // Check existing
            const [existingRating] = await tx
                .select({ id: sessionStudentRatings.id })
                .from(sessionStudentRatings)
                .where(
                    and(
                        eq(sessionStudentRatings.sessionId, sessionId),
                        eq(sessionStudentRatings.studentId, studentId)
                    )
                );

            let ratingId: string;

            if (existingRating) {
                ratingId = existingRating.id;
                await tx
                    .update(sessionStudentRatings)
                    .set({
                        overallRating,
                        generalComment: generalComment || null,
                        ratedByAdminId: adminId || null,
                        updatedAt: new Date(),
                    })
                    .where(eq(sessionStudentRatings.id, ratingId));

                // Delete old question ratings to replace with updated
                await tx
                    .delete(sessionStudentQuestionRatings)
                    .where(eq(sessionStudentQuestionRatings.sessionStudentRatingId, ratingId));
            } else {
                ratingId = uuidv4();
                await tx.insert(sessionStudentRatings).values({
                    id: ratingId,
                    sessionId,
                    studentId,
                    overallRating,
                    generalComment: generalComment || null,
                    ratedByAdminId: adminId || null,
                });
            }

            // Insert question ratings
            const questionValues = ratings.map(r => ({
                id: uuidv4(),
                sessionStudentRatingId: ratingId,
                questionId: r.questionId,
                rating: Number(r.rating),
                comment: r.comment?.trim() || null,
            }));

            await tx.insert(sessionStudentQuestionRatings).values(questionValues);

            savedRatings.push({
                ratingId,
                studentId,
                studentName: `${student.firstname} ${student.lastname}`,
                overallRating,
                ratedQuestionsCount: ratings.length,
            });
        });
    }

    SuccessResponse(res, {
        message: "Session ratings saved successfully",
        data: {
            sessionId,
            sessionName: session.name,
            totalStudentsRated: savedRatings.length,
            ratings: savedRatings,
        }
    });
};

// ── GET ALL RATINGS FOR A SPECIFIC SESSION ────────────────────────
export const getSessionRatings = async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    // Verify session
    const [session] = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            sessionDate: sessions.sessionDate,
            teacherId: sessions.teacherId,
            teacherName: teachers.name,
        })
        .from(sessions)
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .where(eq(sessions.id, sessionId));

    if (!session) {
        throw new NotFound("Session not found");
    }

    // Fetch master student ratings
    const ratingsList = await db
        .select({
            id: sessionStudentRatings.id,
            sessionId: sessionStudentRatings.sessionId,
            studentId: sessionStudentRatings.studentId,
            overallRating: sessionStudentRatings.overallRating,
            generalComment: sessionStudentRatings.generalComment,
            createdAt: sessionStudentRatings.createdAt,
            updatedAt: sessionStudentRatings.updatedAt,
            studentFirstname: Student.firstname,
            studentLastname: Student.lastname,
            studentNickname: Student.nickname,
            studentEmail: Student.email,
            studentAvatar: Student.avatar,
            studentPhone: Student.phone,
        })
        .from(sessionStudentRatings)
        .innerJoin(Student, eq(sessionStudentRatings.studentId, Student.id))
        .where(eq(sessionStudentRatings.sessionId, sessionId))
        .orderBy(desc(sessionStudentRatings.createdAt));

    if (ratingsList.length === 0) {
        return SuccessResponse(res, {
            message: "No ratings found for this session",
            data: {
                session,
                averageOverallRating: 0,
                totalRatedStudents: 0,
                students: [],
            }
        });
    }

    const ratingIds = ratingsList.map(r => r.id);

    // Fetch question ratings
    const questionRatings = await db
        .select({
            id: sessionStudentQuestionRatings.id,
            sessionStudentRatingId: sessionStudentQuestionRatings.sessionStudentRatingId,
            questionId: sessionStudentQuestionRatings.questionId,
            rating: sessionStudentQuestionRatings.rating,
            comment: sessionStudentQuestionRatings.comment,
            questionTitle: sessionRatingQuestions.title,
            questionCategory: sessionRatingQuestions.category,
            questionWeight: sessionRatingQuestions.weight,
        })
        .from(sessionStudentQuestionRatings)
        .innerJoin(sessionRatingQuestions, eq(sessionStudentQuestionRatings.questionId, sessionRatingQuestions.id))
        .where(inArray(sessionStudentQuestionRatings.sessionStudentRatingId, ratingIds));

    // Group question ratings by sessionStudentRatingId
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
            weight: qr.questionWeight,
            rating: qr.rating,
            comment: qr.comment,
        });
    }

    const overallSum = ratingsList.reduce((sum, r) => sum + (Number(r.overallRating) || 0), 0);
    const avgOverall = ratingsList.length > 0 ? Number((overallSum / ratingsList.length).toFixed(2)) : 0;

    const studentsFormatted = ratingsList.map(r => ({
        id: r.id,
        overallRating: Number(r.overallRating),
        generalComment: r.generalComment,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        student: {
            id: r.studentId,
            firstname: r.studentFirstname,
            lastname: r.studentLastname,
            nickname: r.studentNickname,
            email: r.studentEmail,
            avatar: r.studentAvatar,
            phone: r.studentPhone,
        },
        questionRatings: qMap.get(r.id) || [],
    }));

    SuccessResponse(res, {
        message: "Session ratings retrieved successfully",
        data: {
            session,
            averageOverallRating: avgOverall,
            totalRatedStudents: ratingsList.length,
            students: studentsFormatted,
        }
    });
};

// ── GET A STUDENT'S SESSION EVALUATION HISTORY ────────────────────
export const getStudentSessionRatings = async (req: Request, res: Response) => {
    const { id } = req.params; // studentId

    // Verify student
    const [student] = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            email: Student.email,
            avatar: Student.avatar,
        })
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("Student not found");
    }

    const ratingsList = await db
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
            updatedAt: sessionStudentRatings.updatedAt,
        })
        .from(sessionStudentRatings)
        .innerJoin(sessions, eq(sessionStudentRatings.sessionId, sessions.id))
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .where(eq(sessionStudentRatings.studentId, id))
        .orderBy(desc(sessionStudentRatings.createdAt));

    if (ratingsList.length === 0) {
        return SuccessResponse(res, {
            message: "No session ratings found for this student",
            data: {
                student: {
                    id: student.id,
                    name: `${student.firstname} ${student.lastname}`,
                    email: student.email,
                    avatar: student.avatar,
                },
                averageScore: 0,
                totalSessionsRated: 0,
                sessions: [],
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
            questionWeight: sessionRatingQuestions.weight,
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
            weight: qr.questionWeight,
            rating: qr.rating,
            comment: qr.comment,
        });
    }

    const overallSum = ratingsList.reduce((sum, r) => sum + (Number(r.overallRating) || 0), 0);
    const avgOverall = Number((overallSum / ratingsList.length).toFixed(2));

    const sessionsFormatted = ratingsList.map(r => ({
        id: r.id,
        sessionId: r.sessionId,
        sessionName: r.sessionName,
        sessionDate: r.sessionDate,
        teacherName: r.teacherName,
        overallRating: Number(r.overallRating),
        generalComment: r.generalComment,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        questionRatings: qMap.get(r.id) || [],
    }));

    SuccessResponse(res, {
        message: "Student session evaluation history retrieved successfully",
        data: {
            student: {
                id: student.id,
                name: `${student.firstname} ${student.lastname}`,
                email: student.email,
                avatar: student.avatar,
            },
            averageScore: avgOverall,
            totalSessionsRated: ratingsList.length,
            sessions: sessionsFormatted,
        }
    });
};

// ── GET SINGLE RATING BY ID ──────────────────────────────────────
export const getRatingById = async (req: Request, res: Response) => {
    const { ratingId } = req.params;

    const [rating] = await db
        .select({
            id: sessionStudentRatings.id,
            sessionId: sessionStudentRatings.sessionId,
            sessionName: sessions.name,
            sessionDate: sessions.sessionDate,
            studentId: sessionStudentRatings.studentId,
            studentFirstname: Student.firstname,
            studentLastname: Student.lastname,
            overallRating: sessionStudentRatings.overallRating,
            generalComment: sessionStudentRatings.generalComment,
            createdAt: sessionStudentRatings.createdAt,
            updatedAt: sessionStudentRatings.updatedAt,
        })
        .from(sessionStudentRatings)
        .innerJoin(sessions, eq(sessionStudentRatings.sessionId, sessions.id))
        .innerJoin(Student, eq(sessionStudentRatings.studentId, Student.id))
        .where(eq(sessionStudentRatings.id, ratingId));

    if (!rating) {
        throw new NotFound("Session rating record not found");
    }

    const questionRatings = await db
        .select({
            id: sessionStudentQuestionRatings.id,
            questionId: sessionStudentQuestionRatings.questionId,
            rating: sessionStudentQuestionRatings.rating,
            comment: sessionStudentQuestionRatings.comment,
            questionTitle: sessionRatingQuestions.title,
            questionCategory: sessionRatingQuestions.category,
            questionWeight: sessionRatingQuestions.weight,
        })
        .from(sessionStudentQuestionRatings)
        .innerJoin(sessionRatingQuestions, eq(sessionStudentQuestionRatings.questionId, sessionRatingQuestions.id))
        .where(eq(sessionStudentQuestionRatings.sessionStudentRatingId, ratingId));

    SuccessResponse(res, {
        message: "Session rating details retrieved successfully",
        data: {
            ...rating,
            questionRatings,
        }
    });
};

// ── DELETE RATING ─────────────────────────────────────────────────
export const deleteSessionRating = async (req: Request, res: Response) => {
    const { ratingId } = req.params;

    const [existing] = await db
        .select({ id: sessionStudentRatings.id })
        .from(sessionStudentRatings)
        .where(eq(sessionStudentRatings.id, ratingId));

    if (!existing) {
        throw new NotFound("Session rating not found");
    }

    await db
        .delete(sessionStudentRatings)
        .where(eq(sessionStudentRatings.id, ratingId));

    SuccessResponse(res, {
        message: "Session rating deleted successfully",
    });
};
