import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { db } from "../../models/connection";
import { examCodes } from "../../models/schema";
import { eq } from "drizzle-orm";
import { NotFound } from "../../Errors";
import { BadRequest } from "../../Errors/BadRequest";

export const getExamCodes = async (req: Request, res: Response) => {
    const AllExamCode = await db.select().from(examCodes);
    return SuccessResponse(res, { message: "Exam codes fetched successfully", data: AllExamCode }, 200);
}

export const createExamCode = async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code) throw new BadRequest("Code is required");
    await db.insert(examCodes).values({ code });
    return SuccessResponse(res, { message: "Exam code created successfully" }, 201);
}

export const updateExamCode = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Id is required");
    const { code } = req.body;
    const examCode = await db.query.examCodes.findFirst({ where: eq(examCodes.id, id) });
    if (!examCode) throw new NotFound("Exam code not found");
    await db.update(examCodes).set({ code: code || examCode.code }).where(eq(examCodes.id, id));
    return SuccessResponse(res, { message: "Exam code updated successfully" }, 200);
}

export const deleteExamCode = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Id is required");
    const examCode = await db.query.examCodes.findFirst({ where: eq(examCodes.id, id) });
    if (!examCode) throw new NotFound("Exam code not found");
    await db.delete(examCodes).where(eq(examCodes.id, id));
    return SuccessResponse(res, { message: "Exam code deleted successfully" }, 200);
}