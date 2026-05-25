"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRawScorebyId = exports.deleteRawScore = exports.updateRawScore = exports.getAllRawScores = exports.createRawScore = void 0;
const BadRequest_1 = require("../../Errors/BadRequest");
const schema_1 = require("../../models/schema");
const connection_1 = require("../../models/connection");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const createRawScore = async (req, res) => {
    const { name, courseId, score, is_giftingScore, giftingScore } = req.body;
    if (!name || !courseId || !score || is_giftingScore === undefined || giftingScore === undefined) {
        throw new BadRequest_1.BadRequest("Name, Course ID, Score, Is Gifting Score, Gifting Score are required");
    }
    const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    const existingRawScore = await connection_1.db.select().from(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.name, name));
    if (existingRawScore.length > 0) {
        throw new BadRequest_1.BadRequest("Raw Score already exists");
    }
    await connection_1.db.insert(schema_1.rawScore).values({
        name,
        courseId,
        score,
        is_giftingScore,
        giftingScore,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Raw Score created successfully" }, 200);
};
exports.createRawScore = createRawScore;
const getAllRawScores = async (req, res) => {
    const rawScores = await connection_1.db.select({
        id: schema_1.rawScore.id,
        name: schema_1.rawScore.name,
        score: schema_1.rawScore.score,
        is_giftingScore: schema_1.rawScore.is_giftingScore,
        giftingScore: schema_1.rawScore.giftingScore,
        courses: {
            id: schema_1.courses.id,
            name: schema_1.courses.name,
        }
    }).from(schema_1.rawScore).innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.rawScore.courseId, schema_1.courses.id));
    return (0, response_1.SuccessResponse)(res, { message: "Raw Score fetched successfully", rawScores }, 200);
};
exports.getAllRawScores = getAllRawScores;
const updateRawScore = async (req, res) => {
    const { id } = req.params;
    const { name, courseId, score, is_giftingScore, giftingScore } = req.body;
    const existingRawScore = await connection_1.db.select().from(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.id, id));
    if (existingRawScore.length === 0) {
        throw new BadRequest_1.BadRequest("Raw Score not found");
    }
    if (courseId) {
        const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
        if (existingCourse.length === 0) {
            throw new BadRequest_1.BadRequest("Course not found");
        }
    }
    await connection_1.db.update(schema_1.rawScore).set({
        name: name !== undefined ? name : existingRawScore[0].name,
        courseId: courseId !== undefined ? courseId : existingRawScore[0].courseId,
        score: score !== undefined ? score : existingRawScore[0].score,
        is_giftingScore: is_giftingScore !== undefined ? is_giftingScore : existingRawScore[0].is_giftingScore,
        giftingScore: giftingScore !== undefined ? giftingScore : existingRawScore[0].giftingScore,
    }).where((0, drizzle_orm_1.eq)(schema_1.rawScore.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Raw Score updated successfully" }, 200);
};
exports.updateRawScore = updateRawScore;
const deleteRawScore = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Raw Score ID is required");
    }
    const existingRawScore = await connection_1.db.select().from(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.id, id));
    if (existingRawScore.length === 0) {
        throw new BadRequest_1.BadRequest("Raw Score not found");
    }
    const diagnosticExams = await connection_1.db.select().from(schema_1.diagnosticExam).where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.rawScoreId, id));
    if (diagnosticExams.length > 0) {
        throw new BadRequest_1.BadRequest("Cannot Delete Raw Score as it is used in Diagnostic Exam");
    }
    await connection_1.db.delete(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Raw Score deleted successfully" }, 200);
};
exports.deleteRawScore = deleteRawScore;
const getRawScorebyId = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Raw Score ID is required");
    }
    const existingRawScore = await connection_1.db.select().from(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.id, id));
    if (existingRawScore.length === 0) {
        throw new BadRequest_1.BadRequest("Raw Score not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Raw Score fetched successfully", rawScore: existingRawScore[0] }, 200);
};
exports.getRawScorebyId = getRawScorebyId;
