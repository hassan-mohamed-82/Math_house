"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySessionRatingBySessionId = exports.getMySessionRatings = exports.submitSessionRatings = exports.getSessionRatingForm = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const uuid_1 = require("uuid");
const Errors_1 = require("../../Errors");
const getStudentId = (req) => {
    const id = req.user?.id;
    if (!id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return id;
};
/**
 * Check if the student is enrolled in the given session (directly or via group).
 */
async function verifyStudentSessionAccess(sessionId, studentId) {
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
        .where((0, drizzle_orm_1.eq)(schema_1.sessions.id, sessionId));
    if (!session) {
        throw new NotFound_1.NotFound("Session not found");
    }
    const [directMembership] = await connection_1.db
        .select({ id: schema_1.sessionUsers.id })
        .from(schema_1.sessionUsers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionUsers.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.sessionUsers.studentId, studentId)));
    let hasAccess = !!directMembership;
    if (!hasAccess) {
        const [groupMembership] = await connection_1.db
            .select({ id: schema_1.sessionGroups.id })
            .from(schema_1.sessionGroups)
            .innerJoin(schema_1.groupStudents, (0, drizzle_orm_1.eq)(schema_1.sessionGroups.groupId, schema_1.groupStudents.groupId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionGroups.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.groupStudents.studentId, studentId)));
        hasAccess = !!groupMembership;
    }
    if (!hasAccess) {
        throw new NotFound_1.NotFound("You are not enrolled in this session");
    }
    return session;
}
// ── GET RATING FORM DATA FOR STUDENT'S SESSION ────────────────────
const getSessionRatingForm = async (req, res) => {
    const studentId = getStudentId(req);
    const sessionId = req.params.sessionId || req.params.id;
    if (!sessionId) {
        throw new BadRequest_1.BadRequest("sessionId parameter is required");
    }
    const session = await verifyStudentSessionAccess(sessionId, studentId);
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
    // 2. Fetch existing rating if already rated
    const [existingRating] = await connection_1.db
        .select({
        id: schema_1.sessionStudentRatings.id,
        overallRating: schema_1.sessionStudentRatings.overallRating,
        generalComment: schema_1.sessionStudentRatings.generalComment,
        createdAt: schema_1.sessionStudentRatings.createdAt,
        updatedAt: schema_1.sessionStudentRatings.updatedAt,
    })
        .from(schema_1.sessionStudentRatings)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.studentId, studentId)));
    let questionRatings = [];
    if (existingRating) {
        questionRatings = await connection_1.db
            .select({
            id: schema_1.sessionStudentQuestionRatings.id,
            questionId: schema_1.sessionStudentQuestionRatings.questionId,
            rating: schema_1.sessionStudentQuestionRatings.rating,
            comment: schema_1.sessionStudentQuestionRatings.comment,
        })
            .from(schema_1.sessionStudentQuestionRatings)
            .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentQuestionRatings.sessionStudentRatingId, existingRating.id));
    }
    (0, response_1.SuccessResponse)(res, {
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
exports.getSessionRatingForm = getSessionRatingForm;
// ── STUDENT SUBMITS SESSION RATINGS ──────────────────────────────
const submitSessionRatings = async (req, res) => {
    const studentId = getStudentId(req);
    const sessionId = req.params.sessionId || req.params.id;
    if (!sessionId) {
        throw new BadRequest_1.BadRequest("sessionId parameter is required");
    }
    const session = await verifyStudentSessionAccess(sessionId, studentId);
    const { ratings, generalComment } = req.body;
    if (!Array.isArray(ratings) || ratings.length === 0) {
        throw new BadRequest_1.BadRequest("At least one question rating is required");
    }
    // Fetch active rating questions to validate IDs and weights
    const allQuestions = await connection_1.db
        .select({ id: schema_1.sessionRatingQuestions.id, weight: schema_1.sessionRatingQuestions.weight })
        .from(schema_1.sessionRatingQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.isActive, true));
    const questionMap = new Map(allQuestions.map(q => [q.id, q.weight || 1]));
    let totalWeight = 0;
    let weightedSum = 0;
    for (const r of ratings) {
        const num = Number(r.rating);
        if (isNaN(num) || num < 1 || num > 10) {
            throw new BadRequest_1.BadRequest(`Rating must be between 1 and 10 for question ${r.questionId}`);
        }
        const weight = questionMap.get(r.questionId);
        if (weight === undefined) {
            throw new BadRequest_1.BadRequest(`Rating question ${r.questionId} is invalid or inactive`);
        }
        totalWeight += weight;
        weightedSum += num * weight;
    }
    const overallRating = totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : 0;
    let savedRatingId = "";
    await connection_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select({ id: schema_1.sessionStudentRatings.id })
            .from(schema_1.sessionStudentRatings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.studentId, studentId)));
        if (existing) {
            savedRatingId = existing.id;
            await tx
                .update(schema_1.sessionStudentRatings)
                .set({
                overallRating,
                generalComment: generalComment || null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.id, savedRatingId));
            await tx
                .delete(schema_1.sessionStudentQuestionRatings)
                .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentQuestionRatings.sessionStudentRatingId, savedRatingId));
        }
        else {
            savedRatingId = (0, uuid_1.v4)();
            await tx.insert(schema_1.sessionStudentRatings).values({
                id: savedRatingId,
                sessionId,
                studentId,
                overallRating,
                generalComment: generalComment || null,
            });
        }
        const questionValues = ratings.map(r => ({
            id: (0, uuid_1.v4)(),
            sessionStudentRatingId: savedRatingId,
            questionId: r.questionId,
            rating: Number(r.rating),
            comment: r.comment?.trim() || null,
        }));
        await tx.insert(schema_1.sessionStudentQuestionRatings).values(questionValues);
    });
    (0, response_1.SuccessResponse)(res, {
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
exports.submitSessionRatings = submitSessionRatings;
// ── GET LOGGED-IN STUDENT'S SESSION RATINGS / EVALUATIONS ─────────
const getMySessionRatings = async (req, res) => {
    const studentId = getStudentId(req);
    const ratingsList = await connection_1.db
        .select({
        id: schema_1.sessionStudentRatings.id,
        sessionId: schema_1.sessionStudentRatings.sessionId,
        sessionName: schema_1.sessions.name,
        sessionDate: schema_1.sessions.sessionDate,
        timeFrom: schema_1.sessions.timeFrom,
        timeTo: schema_1.sessions.timeTo,
        teacherId: schema_1.sessions.teacherId,
        teacherName: schema_1.teachers.name,
        overallRating: schema_1.sessionStudentRatings.overallRating,
        generalComment: schema_1.sessionStudentRatings.generalComment,
        createdAt: schema_1.sessionStudentRatings.createdAt,
    })
        .from(schema_1.sessionStudentRatings)
        .innerJoin(schema_1.sessions, (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, schema_1.sessions.id))
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.sessions.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.studentId, studentId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.sessionStudentRatings.createdAt));
    if (ratingsList.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
            message: "No session evaluations found",
            data: {
                averageRating: 0,
                totalSessionsEvaluated: 0,
                evaluations: [],
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
    (0, response_1.SuccessResponse)(res, {
        message: "Session evaluations retrieved successfully",
        data: {
            averageRating: avgRating,
            totalSessionsEvaluated: ratingsList.length,
            evaluations,
        }
    });
};
exports.getMySessionRatings = getMySessionRatings;
// ── GET SINGLE SESSION EVALUATION FOR LOGGED-IN STUDENT ───────────
const getMySessionRatingBySessionId = async (req, res) => {
    const studentId = getStudentId(req);
    const sessionId = req.params.sessionId || req.params.id;
    const [rating] = await connection_1.db
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
    })
        .from(schema_1.sessionStudentRatings)
        .innerJoin(schema_1.sessions, (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, schema_1.sessions.id))
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.sessions.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.sessionStudentRatings.studentId, studentId)));
    if (!rating) {
        throw new NotFound_1.NotFound("No evaluation found for this session");
    }
    const questionRatings = await connection_1.db
        .select({
        id: schema_1.sessionStudentQuestionRatings.id,
        questionId: schema_1.sessionStudentQuestionRatings.questionId,
        rating: schema_1.sessionStudentQuestionRatings.rating,
        comment: schema_1.sessionStudentQuestionRatings.comment,
        questionTitle: schema_1.sessionRatingQuestions.title,
        questionCategory: schema_1.sessionRatingQuestions.category,
    })
        .from(schema_1.sessionStudentQuestionRatings)
        .innerJoin(schema_1.sessionRatingQuestions, (0, drizzle_orm_1.eq)(schema_1.sessionStudentQuestionRatings.questionId, schema_1.sessionRatingQuestions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionStudentQuestionRatings.sessionStudentRatingId, rating.id));
    (0, response_1.SuccessResponse)(res, {
        message: "Session evaluation retrieved successfully",
        data: {
            ...rating,
            overallRating: Number(rating.overallRating),
            questionRatings,
        }
    });
};
exports.getMySessionRatingBySessionId = getMySessionRatingBySessionId;
