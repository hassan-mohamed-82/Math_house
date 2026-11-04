import { Request, Response } from "express";
import { db } from "../../models/connection";
import { notes } from "../../models/schema/admin/Notes";
import { eq, desc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { UnauthorizedError } from "../../Errors";

// ── Helper: get authenticated student id ─────────────────────────────────────
const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

// GET /user/notes (or /user/notes/:studentId)
// Returns all notes for the authenticated student (or specified student)
export const getStudentNotes = async (req: Request, res: Response) => {
    const studentId = req.params.studentId || req.params.id || getStudentId(req);

    const noteRows = await db
        .select({
            id: notes.id,
            studentId: notes.studentId,
            title: notes.title,
            content: notes.content,
            createdAt: notes.createdAt,
            updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(eq(notes.studentId, studentId))
        .orderBy(desc(notes.createdAt));

    return SuccessResponse(res, {
        message: "Student notes retrieved successfully",
        data: noteRows,
    });
};

// Alias for backwards-compatibility
export const getMyNotes = getStudentNotes;
