import { Request, Response } from "express";
import { db } from "../../models/connection";
import { sessionRatingQuestions } from "../../models/schema";
import { eq, desc, asc, like, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import { v4 as uuidv4 } from "uuid";

// ── GET ALL RATING QUESTIONS ──────────────────────────────────────
export const getAllRatingQuestions = async (req: Request, res: Response) => {
    const { status, search, category } = req.query;

    const conditions = [];

    if (status === "active") {
        conditions.push(eq(sessionRatingQuestions.isActive, true));
    } else if (status === "inactive") {
        conditions.push(eq(sessionRatingQuestions.isActive, false));
    }

    if (category) {
        conditions.push(eq(sessionRatingQuestions.category, category as string));
    }

    if (search) {
        conditions.push(like(sessionRatingQuestions.title, `%${search}%`));
    }

    const questionsList = await db
        .select()
        .from(sessionRatingQuestions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(sessionRatingQuestions.order), desc(sessionRatingQuestions.createdAt));

    SuccessResponse(res, {
        message: "Rating questions retrieved successfully",
        data: questionsList,
    });
};

// ── GET RATING QUESTION BY ID ────────────────────────────────────
export const getRatingQuestionById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [question] = await db
        .select()
        .from(sessionRatingQuestions)
        .where(eq(sessionRatingQuestions.id, id));

    if (!question) {
        throw new NotFound("Rating question not found");
    }

    SuccessResponse(res, {
        message: "Rating question retrieved successfully",
        data: question,
    });
};

// ── CREATE RATING QUESTION ───────────────────────────────────────
export const createRatingQuestion = async (req: Request, res: Response) => {
    const { title, description, category = "general", weight = 1, order = 0, isActive = true } = req.body;

    if (!title || !title.trim()) {
        throw new BadRequest("Question title is required");
    }

    const id = uuidv4();

    await db.insert(sessionRatingQuestions).values({
        id,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        weight: Number(weight) || 1,
        order: Number(order) || 0,
        isActive: isActive !== false,
    });

    const [created] = await db
        .select()
        .from(sessionRatingQuestions)
        .where(eq(sessionRatingQuestions.id, id));

    SuccessResponse(res, {
        message: "Rating question created successfully",
        data: created,
    });
};

// ── UPDATE RATING QUESTION ───────────────────────────────────────
export const updateRatingQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, category, weight, order, isActive } = req.body;

    const [existing] = await db
        .select()
        .from(sessionRatingQuestions)
        .where(eq(sessionRatingQuestions.id, id));

    if (!existing) {
        throw new NotFound("Rating question not found");
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (category !== undefined) updateData.category = category;
    if (weight !== undefined) updateData.weight = Number(weight) || 1;
    if (order !== undefined) updateData.order = Number(order) || 0;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    await db
        .update(sessionRatingQuestions)
        .set(updateData)
        .where(eq(sessionRatingQuestions.id, id));

    const [updated] = await db
        .select()
        .from(sessionRatingQuestions)
        .where(eq(sessionRatingQuestions.id, id));

    SuccessResponse(res, {
        message: "Rating question updated successfully",
        data: updated,
    });
};

// ── TOGGLE RATING QUESTION ACTIVE STATUS ─────────────────────────
export const toggleRatingQuestionStatus = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [existing] = await db
        .select()
        .from(sessionRatingQuestions)
        .where(eq(sessionRatingQuestions.id, id));

    if (!existing) {
        throw new NotFound("Rating question not found");
    }

    await db
        .update(sessionRatingQuestions)
        .set({ isActive: !existing.isActive })
        .where(eq(sessionRatingQuestions.id, id));

    SuccessResponse(res, {
        message: `Rating question ${!existing.isActive ? "activated" : "deactivated"} successfully`,
        data: { id, isActive: !existing.isActive },
    });
};

// ── DELETE RATING QUESTION ───────────────────────────────────────
export const deleteRatingQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [existing] = await db
        .select()
        .from(sessionRatingQuestions)
        .where(eq(sessionRatingQuestions.id, id));

    if (!existing) {
        throw new NotFound("Rating question not found");
    }

    await db
        .delete(sessionRatingQuestions)
        .where(eq(sessionRatingQuestions.id, id));

    SuccessResponse(res, {
        message: "Rating question deleted successfully",
    });
};
