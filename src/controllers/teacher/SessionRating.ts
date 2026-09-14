import { Request, Response } from "express";
import { db } from "../../models/connection";
import {
    sessions,
    Student,
    teachers,
    sessionRatingQuestions,
    sessionStudentRatings,
    sessionStudentQuestionRatings,
    sessionUsers,
    sessionGroups,
    groups,
    sessionAttendance
} from "../../models/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import { v4 as uuidv4 } from "uuid";
import { UnauthorizedError } from "../../Errors";

const getTeacherId = (req: Request): string => {
    const id = (req as any).user?.id;
    if (!id) throw new UnauthorizedError("Not authenticated");
    return id;
};

// ── GET ALL RATINGS FOR A SPECIFIC SESSION TAUGHT BY TEACHER ─────
export const getSessionRatings = async (req: Request, res: Response) => {
    const teacherId = getTeacherId(req);
    const sessionId = req.params.sessionId || req.params.id;

    if (!sessionId) {
        throw new BadRequest("sessionId parameter is required");
    }

    // Verify session belongs to logged-in teacher
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
        .where(and(eq(sessions.id, sessionId), eq(sessions.teacherId, teacherId)));

    if (!session) {
        throw new NotFound("Session not found or not assigned to you");
    }

    // Fetch master student ratings for this session
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

    // Fetch question breakdown for these ratings
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
    const avgOverall = ratingsList.length > 0 ? Number((overallSum / ratingsList.length).toFixed(2)) : 0;

    const studentsFormatted = ratingsList.map(r => ({
        id: r.id,
        overallRating: Number(r.overallRating),
        generalComment: r.generalComment,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        student: {
            id: r.studentId,
            name: `${r.studentFirstname} ${r.studentLastname}`,
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

// ── GET A STUDENT'S RATINGS ACROSS TEACHER'S SESSIONS ────────────
export const getStudentSessionRatings = async (req: Request, res: Response) => {
    const teacherId = getTeacherId(req);
    const studentId = req.params.studentId || req.params.id;

    if (!studentId) {
        throw new BadRequest("studentId parameter is required");
    }

    // Verify student exists
    const [student] = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            email: Student.email,
            avatar: Student.avatar,
        })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) {
        throw new NotFound("Student not found");
    }

    // Fetch ratings for this student in sessions taught by this teacher
    const ratingsList = await db
        .select({
            id: sessionStudentRatings.id,
            sessionId: sessionStudentRatings.sessionId,
            sessionName: sessions.name,
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            overallRating: sessionStudentRatings.overallRating,
            generalComment: sessionStudentRatings.generalComment,
            createdAt: sessionStudentRatings.createdAt,
            updatedAt: sessionStudentRatings.updatedAt,
        })
        .from(sessionStudentRatings)
        .innerJoin(sessions, eq(sessionStudentRatings.sessionId, sessions.id))
        .where(
            and(
                eq(sessionStudentRatings.studentId, studentId),
                eq(sessions.teacherId, teacherId)
            )
        )
        .orderBy(desc(sessionStudentRatings.createdAt));

    if (ratingsList.length === 0) {
        return SuccessResponse(res, {
            message: "No session ratings found for this student with this teacher",
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
        timeFrom: r.timeFrom,
        timeTo: r.timeTo,
        overallRating: Number(r.overallRating),
        generalComment: r.generalComment,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        questionRatings: qMap.get(r.id) || [],
    }));

    SuccessResponse(res, {
        message: "Student session ratings retrieved successfully",
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

// ── GET RATING FORM DATA FOR TEACHER SESSION (IF TEACHER RATES) ──
export const getTeacherSessionRatingForm = async (req: Request, res: Response) => {
    const teacherId = getTeacherId(req);
    const sessionId = req.params.sessionId || req.params.id;

    // Verify session belongs to logged-in teacher
    const [session] = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            sessionDate: sessions.sessionDate,
            teacherId: sessions.teacherId,
        })
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.teacherId, teacherId)));

    if (!session) {
        throw new NotFound("Session not found or not assigned to you");
    }

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

    // 2. Fetch students directly assigned to this session
    const directStudents = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            email: Student.email,
            avatar: Student.avatar,
        })
        .from(sessionUsers)
        .innerJoin(Student, eq(sessionUsers.studentId, Student.id))
        .where(eq(sessionUsers.sessionId, sessionId));

    // 3. Fetch attendance records
    const attendanceRecords = await db
        .select({
            studentId: sessionAttendance.studentId,
            status: sessionAttendance.status,
            attendedAt: sessionAttendance.attendedAt,
        })
        .from(sessionAttendance)
        .where(eq(sessionAttendance.sessionId, sessionId));

    const attendanceMap = new Map<string, string>(
        attendanceRecords.map(a => [a.studentId, a.status])
    );

    // 4. Fetch existing ratings if any
    const existingRatings = await db
        .select({
            id: sessionStudentRatings.id,
            studentId: sessionStudentRatings.studentId,
            overallRating: sessionStudentRatings.overallRating,
            generalComment: sessionStudentRatings.generalComment,
        })
        .from(sessionStudentRatings)
        .where(eq(sessionStudentRatings.sessionId, sessionId));

    const ratingIds = existingRatings.map(r => r.id);
    let questionRatings: any[] = [];
    if (ratingIds.length > 0) {
        questionRatings = await db
            .select({
                sessionStudentRatingId: sessionStudentQuestionRatings.sessionStudentRatingId,
                questionId: sessionStudentQuestionRatings.questionId,
                rating: sessionStudentQuestionRatings.rating,
                comment: sessionStudentQuestionRatings.comment,
            })
            .from(sessionStudentQuestionRatings)
            .where(inArray(sessionStudentQuestionRatings.sessionStudentRatingId, ratingIds));
    }

    const qRatingMap = new Map<string, any[]>();
    for (const qr of questionRatings) {
        if (!qRatingMap.has(qr.sessionStudentRatingId)) {
            qRatingMap.set(qr.sessionStudentRatingId, []);
        }
        qRatingMap.get(qr.sessionStudentRatingId)!.push(qr);
    }

    const ratingMap = new Map<string, any>(
        existingRatings.map(r => [
            r.studentId,
            {
                ...r,
                overallRating: Number(r.overallRating),
                questionRatings: qRatingMap.get(r.id) || [],
            }
        ])
    );

    const studentsList = directStudents.map(s => ({
        id: s.id,
        name: `${s.firstname} ${s.lastname}`,
        email: s.email,
        avatar: s.avatar,
        attendanceStatus: attendanceMap.get(s.id) || "absent",
        existingRating: ratingMap.get(s.id) || null,
    }));

    SuccessResponse(res, {
        message: "Rating form data retrieved successfully",
        data: {
            session,
            questions,
            students: studentsList,
        }
    });
};

// ── TEACHER SUBMITS POST-SESSION RATINGS FOR STUDENTS ────────────
// export const submitTeacherSessionRatings = async (req: Request, res: Response) => {
//     const teacherId = getTeacherId(req);
//     const sessionId = req.params.sessionId || req.params.id;

//     const studentsPayload: Array<{
//         studentId: string;
//         ratings: Array<{ questionId: string; rating: number; comment?: string }>;
//         generalComment?: string;
//     }> = req.body.students || (req.body.studentId ? [req.body] : []);

//     if (studentsPayload.length === 0) {
//         throw new BadRequest("No student ratings provided");
//     }

//     // Verify session belongs to teacher
//     const [session] = await db
//         .select({ id: sessions.id, name: sessions.name })
//         .from(sessions)
//         .where(and(eq(sessions.id, sessionId), eq(sessions.teacherId, teacherId)));

//     if (!session) {
//         throw new NotFound("Session not found or not assigned to you");
//     }

//     // Fetch active rating questions
//     const allQuestions = await db
//         .select({ id: sessionRatingQuestions.id, weight: sessionRatingQuestions.weight })
//         .from(sessionRatingQuestions);

//     const questionMap = new Map<string, number>(
//         allQuestions.map(q => [q.id, q.weight || 1])
//     );

//     const savedRatings: Array<{
//         ratingId: string;
//         studentId: string;
//         studentName: string;
//         overallRating: number;
//         ratedQuestionsCount: number;
//     }> = [];

//     for (const item of studentsPayload) {
//         const { studentId, ratings, generalComment } = item;

//         if (!studentId) {
//             throw new BadRequest("studentId is required for each rating");
//         }

//         if (!Array.isArray(ratings) || ratings.length === 0) {
//             throw new BadRequest(`At least one question rating is required for student ${studentId}`);
//         }

//         const [student] = await db
//             .select({ id: Student.id, firstname: Student.firstname, lastname: Student.lastname })
//             .from(Student)
//             .where(eq(Student.id, studentId));

//         if (!student) {
//             throw new NotFound(`Student with ID ${studentId} not found`);
//         }

//         let totalWeight = 0;
//         let weightedSum = 0;

//         for (const r of ratings) {
//             const num = Number(r.rating);
//             if (isNaN(num) || num < 1 || num > 10) {
//                 throw new BadRequest(`Rating must be between 1 and 10 for question ${r.questionId}`);
//             }
//             const weight = questionMap.get(r.questionId);
//             if (weight === undefined) {
//                 throw new BadRequest(`Rating question ${r.questionId} does not exist`);
//             }
//             totalWeight += weight;
//             weightedSum += num * weight;
//         }

//         const overallRating = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : 0;

//         await db.transaction(async (tx) => {
//             const [existing] = await tx
//                 .select({ id: sessionStudentRatings.id })
//                 .from(sessionStudentRatings)
//                 .where(
//                     and(
//                         eq(sessionStudentRatings.sessionId, sessionId),
//                         eq(sessionStudentRatings.studentId, studentId)
//                     )
//                 );

//             let ratingId: string;

//             if (existing) {
//                 ratingId = existing.id;
//                 await tx
//                     .update(sessionStudentRatings)
//                     .set({
//                         overallRating,
//                         generalComment: generalComment || null,
//                         ratedByTeacherId: teacherId,
//                         updatedAt: new Date(),
//                     })
//                     .where(eq(sessionStudentRatings.id, ratingId));

//                 await tx
//                     .delete(sessionStudentQuestionRatings)
//                     .where(eq(sessionStudentQuestionRatings.sessionStudentRatingId, ratingId));
//             } else {
//                 ratingId = uuidv4();
//                 await tx.insert(sessionStudentRatings).values({
//                     id: ratingId,
//                     sessionId,
//                     studentId,
//                     overallRating,
//                     generalComment: generalComment || null,
//                     ratedByTeacherId: teacherId,
//                 });
//             }

//             const questionValues = ratings.map(r => ({
//                 id: uuidv4(),
//                 sessionStudentRatingId: ratingId,
//                 questionId: r.questionId,
//                 rating: Number(r.rating),
//                 comment: r.comment?.trim() || null,
//             }));

//             await tx.insert(sessionStudentQuestionRatings).values(questionValues);

//             savedRatings.push({
//                 ratingId,
//                 studentId,
//                 studentName: `${student.firstname} ${student.lastname}`,
//                 overallRating,
//                 ratedQuestionsCount: ratings.length,
//             });
//         });
//     }

//     SuccessResponse(res, {
//         message: "Session ratings submitted successfully by Teacher",
//         data: {
//             sessionId,
//             sessionName: session.name,
//             totalStudentsRated: savedRatings.length,
//             ratings: savedRatings,
//         }
//     });
// };
