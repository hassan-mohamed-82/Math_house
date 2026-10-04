"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRatingQuestion = exports.toggleRatingQuestionStatus = exports.updateRatingQuestion = exports.createRatingQuestion = exports.getRatingQuestionById = exports.getAllRatingQuestions = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const uuid_1 = require("uuid");
// ── GET ALL RATING QUESTIONS ──────────────────────────────────────
const getAllRatingQuestions = async (req, res) => {
    const { status, search, category } = req.query;
    const conditions = [];
    if (status === "active") {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.isActive, true));
    }
    else if (status === "inactive") {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.isActive, false));
    }
    if (category) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.category, category));
    }
    if (search) {
        conditions.push((0, drizzle_orm_1.like)(schema_1.sessionRatingQuestions.title, `%${search}%`));
    }
    const questionsList = await connection_1.db
        .select()
        .from(schema_1.sessionRatingQuestions)
        .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy((0, drizzle_orm_1.asc)(schema_1.sessionRatingQuestions.order), (0, drizzle_orm_1.desc)(schema_1.sessionRatingQuestions.createdAt));
    (0, response_1.SuccessResponse)(res, {
        message: "Rating questions retrieved successfully",
        data: questionsList,
    });
};
exports.getAllRatingQuestions = getAllRatingQuestions;
// ── GET RATING QUESTION BY ID ────────────────────────────────────
const getRatingQuestionById = async (req, res) => {
    const { id } = req.params;
    const [question] = await connection_1.db
        .select()
        .from(schema_1.sessionRatingQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.id, id));
    if (!question) {
        throw new NotFound_1.NotFound("Rating question not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Rating question retrieved successfully",
        data: question,
    });
};
exports.getRatingQuestionById = getRatingQuestionById;
// ── CREATE RATING QUESTION ───────────────────────────────────────
const createRatingQuestion = async (req, res) => {
    const { title, description, category = "general", weight = 1, order = 0, isActive = true } = req.body;
    if (!title || !title.trim()) {
        throw new BadRequest_1.BadRequest("Question title is required");
    }
    const id = (0, uuid_1.v4)();
    await connection_1.db.insert(schema_1.sessionRatingQuestions).values({
        id,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        weight: Number(weight) || 1,
        order: Number(order) || 0,
        isActive: isActive !== false,
    });
    const [created] = await connection_1.db
        .select()
        .from(schema_1.sessionRatingQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.id, id));
    (0, response_1.SuccessResponse)(res, {
        message: "Rating question created successfully",
        data: created,
    });
};
exports.createRatingQuestion = createRatingQuestion;
// ── UPDATE RATING QUESTION ───────────────────────────────────────
const updateRatingQuestion = async (req, res) => {
    const { id } = req.params;
    const { title, description, category, weight, order, isActive } = req.body;
    const [existing] = await connection_1.db
        .select()
        .from(schema_1.sessionRatingQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.id, id));
    if (!existing) {
        throw new NotFound_1.NotFound("Rating question not found");
    }
    const updateData = {};
    if (title !== undefined)
        updateData.title = title.trim();
    if (description !== undefined)
        updateData.description = description ? description.trim() : null;
    if (category !== undefined)
        updateData.category = category;
    if (weight !== undefined)
        updateData.weight = Number(weight) || 1;
    if (order !== undefined)
        updateData.order = Number(order) || 0;
    if (isActive !== undefined)
        updateData.isActive = Boolean(isActive);
    await connection_1.db
        .update(schema_1.sessionRatingQuestions)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.id, id));
    const [updated] = await connection_1.db
        .select()
        .from(schema_1.sessionRatingQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.id, id));
    (0, response_1.SuccessResponse)(res, {
        message: "Rating question updated successfully",
        data: updated,
    });
};
exports.updateRatingQuestion = updateRatingQuestion;
// ── TOGGLE RATING QUESTION ACTIVE STATUS ─────────────────────────
const toggleRatingQuestionStatus = async (req, res) => {
    const { id } = req.params;
    const [existing] = await connection_1.db
        .select()
        .from(schema_1.sessionRatingQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.id, id));
    if (!existing) {
        throw new NotFound_1.NotFound("Rating question not found");
    }
    await connection_1.db
        .update(schema_1.sessionRatingQuestions)
        .set({ isActive: !existing.isActive })
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.id, id));
    (0, response_1.SuccessResponse)(res, {
        message: `Rating question ${!existing.isActive ? "activated" : "deactivated"} successfully`,
        data: { id, isActive: !existing.isActive },
    });
};
exports.toggleRatingQuestionStatus = toggleRatingQuestionStatus;
// ── DELETE RATING QUESTION ───────────────────────────────────────
const deleteRatingQuestion = async (req, res) => {
    const { id } = req.params;
    const [existing] = await connection_1.db
        .select()
        .from(schema_1.sessionRatingQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.id, id));
    if (!existing) {
        throw new NotFound_1.NotFound("Rating question not found");
    }
    await connection_1.db
        .delete(schema_1.sessionRatingQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatingQuestions.id, id));
    (0, response_1.SuccessResponse)(res, {
        message: "Rating question deleted successfully",
    });
};
exports.deleteRatingQuestion = deleteRatingQuestion;
