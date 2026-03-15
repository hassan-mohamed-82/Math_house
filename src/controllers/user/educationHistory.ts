import { Request , Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../models/connection";
import { Student } from "../../models/schema/admin/Student";
import { SuccessResponse } from "../../utils/response";
import { NotFound, UnauthorizedError } from "../../Errors";

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

export const QuestionsHistory = async (req: Request, res: Response) => {

};