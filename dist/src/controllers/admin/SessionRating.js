"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSessionRating = exports.getRatingById = exports.getStudentSessionRatings = exports.getSessionRatings = exports.rateSessionStudents = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const uuid_1 = require("uuid");
// ── RATE ONE OR MULTIPLE STUDENTS FOR A SESSION ──────────────────
const rateSessionStudents = async (req, res) => {
    const { sessionId } = req.params;
    const adminId = req.user?.id;
    // Support either single student payload or array of students
    const studentsPayload = req.body.students || (req.body.studentId ? [req.body] : []);
    if (studentsPayload.length === 0) {
        throw new BadRequest_1.BadRequest("No student rating data provided");
    }
    // 1. Verify session exists
    const [session] = await connection_1.db
        .select({ id: schema_1.sessions.id, name: schema_1.sessions.name, teacherId: schema_1.sessions.teacherId })
        .from(schema_1.sessions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessions.id, sessionId));
    if (!session) {
        throw new NotFound_1.NotFound("Session not found");
    }
    // 2. Fetch all active rating questions to validate questions & get weights
    const allQuestions = await connection_1.db
        .select({ id: schema_1.sessionRatingQuestions.id, title: schema_1.sessionRatingQuestions.title, weight: schema_1.sessionRatingQuestions.weight })
        .from(schema_1.sessionRatingQuestions);
    const questionMap = new Map(allQuestions.map(q => [q.id, { id: q.id, title: q.title, weight: q.weight || 1 }]));
    // 3. Process each student rating
    const savedRatings = [];
    for (const item of studentsPayload) {
        const { studentId, ratings, generalComment } = item;
        if (!studentId) {
            throw new BadRequest_1.BadRequest("studentId is required for each rating");
        }
        if (!Array.isArray(ratings) || ratings.length === 0) {
            throw new BadRequest_1.BadRequest(`At least one question rating is required for student ${studentId}`);
        }
        // Verify student exists
        const [student] = await connection_1.db
            .select({ id: schema_1.Student.id, firstname: schema_1.Student.firstname, lastname: schema_1.Student.lastname })
            .from(schema_1.Student)
            .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
        if (!student) {
            throw new NotFound_1.NotFound(`Student with ID ${studentId} not found`);
        }
        // Validate ratings and calculate weighted average
        let totalWeight = 0;
        let weightedSum = 0;
        for (const r of ratings) {
            const num = Number(r.rating);
            if (isNaN(num) || num < 1 || num > 10) {
                throw new BadRequest_1.BadRequest(`Rating must be between 1 and 10 for question ${r.questionId}`);
            }
            const q = questionMap.get(r.questionId);
            if (!q) {
                throw new BadRequest_1.BadRequest(`Rating question ${r.questionId} does not exist`);
            }
            const w = q.weight;
            totalWeight += w;
            weightedSum += num * w;
        }
        const overallRating = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : 0;
        // Upsert master rating record
        await connection_1.db.transaction(async (tx) => {
            // Check existing
            const [existingRating] = await tx
                .select({ id: schema_1.sessionStudentRatings.id })
                .from(schema_1.sessionStudentRatings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.studentId, studentId)));
            let ratingId;
            if (existingRating) {
                ratingId = existingRating.id;
                await tx
                    .update(schema_1.sessionStudentRatings)
                    .set({
                    overallRating,
                    generalComment: generalComment || null,
                    ratedByAdminId: adminId || null,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.id, ratingId));
                // Delete old question ratings to replace with updated
                await tx
                    .delete(schema_1.sessionStudentQuestionRatings)
                    .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentQuestionRatings.sessionStudentRatingId, ratingId));
            }
            else {
                ratingId = (0, uuid_1.v4)();
                await tx.insert(schema_1.sessionStudentRatings).values({
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
                id: (0, uuid_1.v4)(),
                sessionStudentRatingId: ratingId,
                questionId: r.questionId,
                rating: Number(r.rating),
                comment: r.comment?.trim() || null,
            }));
            await tx.insert(schema_1.sessionStudentQuestionRatings).values(questionValues);
            savedRatings.push({
                ratingId,
                studentId,
                studentName: `${student.firstname} ${student.lastname}`,
                overallRating,
                ratedQuestionsCount: ratings.length,
            });
        });
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Session ratings saved successfully",
        data: {
            sessionId,
            sessionName: session.name,
            totalStudentsRated: savedRatings.length,
            ratings: savedRatings,
        }
    });
};
exports.rateSessionStudents = rateSessionStudents;
// ── GET ALL RATINGS FOR A SPECIFIC SESSION ────────────────────────
const getSessionRatings = async (req, res) => {
    const { sessionId } = req.params;
    // Verify session
    const [session] = await connection_1.db
        .select({
        id: schema_1.sessions.id,
        name: schema_1.sessions.name,
        sessionDate: schema_1.sessions.sessionDate,
        teacherId: schema_1.sessions.teacherId,
        teacherName: schema_1.teachers.name,
    })
        .from(schema_1.sessions)
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.sessions.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessions.id, sessionId));
    if (!session) {
        throw new NotFound_1.NotFound("Session not found");
    }
    // Fetch master student ratings
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
        studentNickname: schema_1.Student.nickname,
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
    // Fetch question ratings
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
    // Group question ratings by sessionStudentRatingId
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
            firstname: r.studentFirstname,
            lastname: r.studentLastname,
            nickname: r.studentNickname,
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
// ── GET A STUDENT'S SESSION EVALUATION HISTORY ────────────────────
const getStudentSessionRatings = async (req, res) => {
    const { id } = req.params; // studentId
    // Verify student
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        avatar: schema_1.Student.avatar,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("Student not found");
    }
    const ratingsList = await connection_1.db
        .select({
        id: schema_1.sessionStudentRatings.id,
        sessionId: schema_1.sessionStudentRatings.sessionId,
        sessionName: schema_1.sessions.name,
        sessionDate: schema_1.sessions.sessionDate,
        teacherId: schema_1.sessions.teacherId,
        teacherName: schema_1.teachers.name,
        overallRating: schema_1.sessionStudentRatings.overallRating,
        generalComment: schema_1.sessionStudentRatings.generalComment,
        createdAt: schema_1.sessionStudentRatings.createdAt,
        updatedAt: schema_1.sessionStudentRatings.updatedAt,
    })
        .from(schema_1.sessionStudentRatings)
        .innerJoin(schema_1.sessions, (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, schema_1.sessions.id))
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.sessions.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.studentId, id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.sessionStudentRatings.createdAt));
    if (ratingsList.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
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
        teacherName: r.teacherName,
        overallRating: Number(r.overallRating),
        generalComment: r.generalComment,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        questionRatings: qMap.get(r.id) || [],
    }));
    (0, response_1.SuccessResponse)(res, {
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
exports.getStudentSessionRatings = getStudentSessionRatings;
// ── GET SINGLE RATING BY ID ──────────────────────────────────────
const getRatingById = async (req, res) => {
    const { ratingId } = req.params;
    const [rating] = await connection_1.db
        .select({
        id: schema_1.sessionStudentRatings.id,
        sessionId: schema_1.sessionStudentRatings.sessionId,
        sessionName: schema_1.sessions.name,
        sessionDate: schema_1.sessions.sessionDate,
        studentId: schema_1.sessionStudentRatings.studentId,
        studentFirstname: schema_1.Student.firstname,
        studentLastname: schema_1.Student.lastname,
        overallRating: schema_1.sessionStudentRatings.overallRating,
        generalComment: schema_1.sessionStudentRatings.generalComment,
        createdAt: schema_1.sessionStudentRatings.createdAt,
        updatedAt: schema_1.sessionStudentRatings.updatedAt,
    })
        .from(schema_1.sessionStudentRatings)
        .innerJoin(schema_1.sessions, (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, schema_1.sessions.id))
        .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.studentId, schema_1.Student.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.id, ratingId));
    if (!rating) {
        throw new NotFound_1.NotFound("Session rating record not found");
    }
    const questionRatings = await connection_1.db
        .select({
        id: schema_1.sessionStudentQuestionRatings.id,
        questionId: schema_1.sessionStudentQuestionRatings.questionId,
        rating: schema_1.sessionStudentQuestionRatings.rating,
        comment: schema_1.sessionStudentQuestionRatings.comment,
        questionTitle: schema_1.sessionRatingQuestions.title,
        questionCategory: schema_1.sessionRatingQuestions.category,
        questionWeight: schema_1.sessionRatingQuestions.weight,
    })
        .from(schema_1.sessionStudentQuestionRatings)
        .innerJoin(schema_1.sessionRatingQuestions, (0, drizzle_orm_1.eq)(schema_1.sessionStudentQuestionRatings.questionId, schema_1.sessionRatingQuestions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentQuestionRatings.sessionStudentRatingId, ratingId));
    (0, response_1.SuccessResponse)(res, {
        message: "Session rating details retrieved successfully",
        data: {
            ...rating,
            questionRatings,
        }
    });
};
exports.getRatingById = getRatingById;
// ── DELETE RATING ─────────────────────────────────────────────────
const deleteSessionRating = async (req, res) => {
    const { ratingId } = req.params;
    const [existing] = await connection_1.db
        .select({ id: schema_1.sessionStudentRatings.id })
        .from(schema_1.sessionStudentRatings)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.id, ratingId));
    if (!existing) {
        throw new NotFound_1.NotFound("Session rating not found");
    }
    await connection_1.db
        .delete(schema_1.sessionStudentRatings)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.id, ratingId));
    (0, response_1.SuccessResponse)(res, {
        message: "Session rating deleted successfully",
    });
};
exports.deleteSessionRating = deleteSessionRating;
