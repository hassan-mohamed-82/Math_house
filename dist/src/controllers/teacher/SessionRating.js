"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherSessionRatingForm = exports.getStudentSessionRatings = exports.getSessionRatings = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const getTeacherId = (req) => {
    const id = req.user?.id;
    if (!id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return id;
};
// ── GET ALL RATINGS FOR A SPECIFIC SESSION TAUGHT BY TEACHER ─────
const getSessionRatings = async (req, res) => {
    const teacherId = getTeacherId(req);
    const sessionId = req.params.sessionId || req.params.id;
    if (!sessionId) {
        throw new BadRequest_1.BadRequest("sessionId parameter is required");
    }
    // Verify session belongs to logged-in teacher
    const [session] = await connection_1.db
        .select({
        id: schema_1.sessions.id,
        name: schema_1.sessions.name,
        sessionDate: schema_1.sessions.sessionDate,
        timeFrom: schema_1.sessions.timeFrom,
        timeTo: schema_1.sessions.timeTo,
        teacherId: schema_1.sessions.teacherId,
    })
        .from(schema_1.sessions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessions.id, sessionId), (0, drizzle_orm_1.eq)(schema_1.sessions.teacherId, teacherId)));
    if (!session) {
        throw new NotFound_1.NotFound("Session not found or not assigned to you");
    }
    // Fetch master student ratings for this session
    const ratingsList = await connection_1.db
        .select({
        id: schema_1.sessionStudentRatings.id,
        sessionId: schema_1.sessionStudentRatings.sessionId,
        studentId: schema_1.sessionStudentRatings.studentId,
        overallRating: schema_1.sessionStudentRatings.overallRating,
        generalComment: schema_1.sessionStudentRatings.generalComment,
        createdAt: schema_1.sessionStudentRatings.createdAt,
        updatedAt: schema_1.sessionStudentRatings.updatedAt,
        studentFirstname: schema_1.Student.firstname,
        studentLastname: schema_1.Student.lastname,
        studentEmail: schema_1.Student.email,
        studentAvatar: schema_1.Student.avatar,
        studentPhone: schema_1.Student.phone,
    })
        .from(schema_1.sessionStudentRatings)
        .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.studentId, schema_1.Student.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, sessionId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.sessionStudentRatings.createdAt));
    if (ratingsList.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
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
    const questionRatings = await connection_1.db
        .select({
        id: schema_1.sessionStudentQuestionRatings.id,
        sessionStudentRatingId: schema_1.sessionStudentQuestionRatings.sessionStudentRatingId,
        questionId: schema_1.sessionStudentQuestionRatings.questionId,
        rating: schema_1.sessionStudentQuestionRatings.rating,
        comment: schema_1.sessionStudentQuestionRatings.comment,
        questionTitle: schema_1.sessionRatingQuestions.title,
        questionCategory: schema_1.sessionRatingQuestions.category,
        questionWeight: schema_1.sessionRatingQuestions.weight,
    })
        .from(schema_1.sessionStudentQuestionRatings)
        .innerJoin(schema_1.sessionRatingQuestions, (0, drizzle_orm_1.eq)(schema_1.sessionStudentQuestionRatings.questionId, schema_1.sessionRatingQuestions.id))
        .where((0, drizzle_orm_1.inArray)(schema_1.sessionStudentQuestionRatings.sessionStudentRatingId, ratingIds));
    const qMap = new Map();
    for (const qr of questionRatings) {
        if (!qMap.has(qr.sessionStudentRatingId)) {
            qMap.set(qr.sessionStudentRatingId, []);
        }
        qMap.get(qr.sessionStudentRatingId).push({
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
    (0, response_1.SuccessResponse)(res, {
        message: "Session ratings retrieved successfully",
        data: {
            session,
            averageOverallRating: avgOverall,
            totalRatedStudents: ratingsList.length,
            students: studentsFormatted,
        }
    });
};
exports.getSessionRatings = getSessionRatings;
// ── GET A STUDENT'S RATINGS ACROSS TEACHER'S SESSIONS ────────────
const getStudentSessionRatings = async (req, res) => {
    const teacherId = getTeacherId(req);
    const studentId = req.params.studentId || req.params.id;
    if (!studentId) {
        throw new BadRequest_1.BadRequest("studentId parameter is required");
    }
    // Verify student exists
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        avatar: schema_1.Student.avatar,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    if (!student) {
        throw new NotFound_1.NotFound("Student not found");
    }
    // Fetch ratings for this student in sessions taught by this teacher
    const ratingsList = await connection_1.db
        .select({
        id: schema_1.sessionStudentRatings.id,
        sessionId: schema_1.sessionStudentRatings.sessionId,
        sessionName: schema_1.sessions.name,
        sessionDate: schema_1.sessions.sessionDate,
        timeFrom: schema_1.sessions.timeFrom,
        timeTo: schema_1.sessions.timeTo,
        overallRating: schema_1.sessionStudentRatings.overallRating,
        generalComment: schema_1.sessionStudentRatings.generalComment,
        createdAt: schema_1.sessionStudentRatings.createdAt,
        updatedAt: schema_1.sessionStudentRatings.updatedAt,
    })
        .from(schema_1.sessionStudentRatings)
        .innerJoin(schema_1.sessions, (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, schema_1.sessions.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.sessions.teacherId, teacherId)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.sessionStudentRatings.createdAt));
    if (ratingsList.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
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
    const questionRatings = await connection_1.db
        .select({
        id: schema_1.sessionStudentQuestionRatings.id,
        sessionStudentRatingId: schema_1.sessionStudentQuestionRatings.sessionStudentRatingId,
        questionId: schema_1.sessionStudentQuestionRatings.questionId,
        rating: schema_1.sessionStudentQuestionRatings.rating,
        comment: schema_1.sessionStudentQuestionRatings.comment,
        questionTitle: schema_1.sessionRatingQuestions.title,
        questionCategory: schema_1.sessionRatingQuestions.category,
        questionWeight: schema_1.sessionRatingQuestions.weight,
    })
        .from(schema_1.sessionStudentQuestionRatings)
        .innerJoin(schema_1.sessionRatingQuestions, (0, drizzle_orm_1.eq)(schema_1.sessionStudentQuestionRatings.questionId, schema_1.sessionRatingQuestions.id))
        .where((0, drizzle_orm_1.inArray)(schema_1.sessionStudentQuestionRatings.sessionStudentRatingId, ratingIds));
    const qMap = new Map();
    for (const qr of questionRatings) {
        if (!qMap.has(qr.sessionStudentRatingId)) {
            qMap.set(qr.sessionStudentRatingId, []);
        }
        qMap.get(qr.sessionStudentRatingId).push({
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
    (0, response_1.SuccessResponse)(res, {
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
exports.getStudentSessionRatings = getStudentSessionRatings;
// ── GET RATING FORM DATA FOR TEACHER SESSION (IF TEACHER RATES) ──
const getTeacherSessionRatingForm = async (req, res) => {
    const teacherId = getTeacherId(req);
    const sessionId = req.params.sessionId || req.params.id;
    // Verify session belongs to logged-in teacher
    const [session] = await connection_1.db
        .select({
        id: schema_1.sessions.id,
        name: schema_1.sessions.name,
        sessionDate: schema_1.sessions.sessionDate,
        teacherId: schema_1.sessions.teacherId,
    })
        .from(schema_1.sessions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessions.id, sessionId), (0, drizzle_orm_1.eq)(schema_1.sessions.teacherId, teacherId)));
    if (!session) {
        throw new NotFound_1.NotFound("Session not found or not assigned to you");
    }
    // 1. Fetch active rating questions
    const questions = await connection_1.db
        .select({
        id: schema_1.sessionRatingQuestions.id,
        title: schema_1.sessionRatingQuestions.title,
        description: schema_1.sessionRatingQuestions.description,
        category: schema_1.sessionRatingQuestions.category,
        weight: schema_1.sessionRatingQuestions.weight,
        order: schema_1.sessionRatingQuestions.order,
    })
        .from(schema_1.sessionRatingQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.isActive, true))
        .orderBy(schema_1.sessionRatingQuestions.order);
    // 2. Fetch students directly assigned to this session
    const directStudents = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        avatar: schema_1.Student.avatar,
    })
        .from(schema_1.sessionUsers)
        .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.sessionUsers.studentId, schema_1.Student.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionUsers.sessionId, sessionId));
    // 3. Fetch attendance records
    const attendanceRecords = await connection_1.db
        .select({
        studentId: schema_1.sessionAttendance.studentId,
        status: schema_1.sessionAttendance.status,
        attendedAt: schema_1.sessionAttendance.attendedAt,
    })
        .from(schema_1.sessionAttendance)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionAttendance.sessionId, sessionId));
    const attendanceMap = new Map(attendanceRecords.map(a => [a.studentId, a.status]));
    // 4. Fetch existing ratings if any
    const existingRatings = await connection_1.db
        .select({
        id: schema_1.sessionStudentRatings.id,
        studentId: schema_1.sessionStudentRatings.studentId,
        overallRating: schema_1.sessionStudentRatings.overallRating,
        generalComment: schema_1.sessionStudentRatings.generalComment,
    })
        .from(schema_1.sessionStudentRatings)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, sessionId));
    const ratingIds = existingRatings.map(r => r.id);
    let questionRatings = [];
    if (ratingIds.length > 0) {
        questionRatings = await connection_1.db
            .select({
            sessionStudentRatingId: schema_1.sessionStudentQuestionRatings.sessionStudentRatingId,
            questionId: schema_1.sessionStudentQuestionRatings.questionId,
            rating: schema_1.sessionStudentQuestionRatings.rating,
            comment: schema_1.sessionStudentQuestionRatings.comment,
        })
            .from(schema_1.sessionStudentQuestionRatings)
            .where((0, drizzle_orm_1.inArray)(schema_1.sessionStudentQuestionRatings.sessionStudentRatingId, ratingIds));
    }
    const qRatingMap = new Map();
    for (const qr of questionRatings) {
        if (!qRatingMap.has(qr.sessionStudentRatingId)) {
            qRatingMap.set(qr.sessionStudentRatingId, []);
        }
        qRatingMap.get(qr.sessionStudentRatingId).push(qr);
    }
    const ratingMap = new Map(existingRatings.map(r => [
        r.studentId,
        {
            ...r,
            overallRating: Number(r.overallRating),
            questionRatings: qRatingMap.get(r.id) || [],
        }
    ]));
    const studentsList = directStudents.map(s => ({
        id: s.id,
        name: `${s.firstname} ${s.lastname}`,
        email: s.email,
        avatar: s.avatar,
        attendanceStatus: attendanceMap.get(s.id) || "absent",
        existingRating: ratingMap.get(s.id) || null,
    }));
    (0, response_1.SuccessResponse)(res, {
        message: "Rating form data retrieved successfully",
        data: {
            session,
            questions,
            students: studentsList,
        }
    });
};
exports.getTeacherSessionRatingForm = getTeacherSessionRatingForm;
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
