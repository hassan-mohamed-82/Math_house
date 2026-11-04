import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import { notes } from "../../models/schema/admin/Notes";
import { Student } from "../../models/schema/admin/Student";
import { eq, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";

// ── Helper: ensure student exists ────────────────────────────────────────────
const assertStudentExists = async (studentId: string) => {
    const [student] = await db
        .select({ id: Student.id })
        .from(Student)
        .where(eq(Student.id, studentId))
        .limit(1);

    if (!student) throw new NotFound("Student not found");
};

// ── 1. Get all notes for a student ───────────────────────────────────────────
export const getStudentNotes = async (req: Request, res: Response) => {
    const { studentId } = req.params;

    await assertStudentExists(studentId);

    const noteRows = await db
        .select({
            id: notes.id,
            title: notes.title,
            content: notes.content,
            createdAt: notes.createdAt,
            updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(eq(notes.studentId, studentId));

    return SuccessResponse(res, {
        message: "Student notes retrieved successfully",
        data: noteRows,
    });
};

// ── 2. Create a note for a student ───────────────────────────────────────────
export const createStudentNote = async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { title, content } = req.body;

    if (!title && !content) {
        throw new BadRequest("At least one of title or content is required");
    }

    await assertStudentExists(studentId);

    const noteId = randomUUID();
    await db.insert(notes).values({
        id: noteId,
        studentId,
        title: title ?? null,
        content: content ?? null,
    });

    const [created] = await db
        .select()
        .from(notes)
        .where(eq(notes.id, noteId))
        .limit(1);

    return SuccessResponse(res, {
        message: "Note created successfully",
        data: created,
    }, 201);
};

// ── 3. Update a note by note id ──────────────────────────────────────────────
export const updateStudentNote = async (req: Request, res: Response) => {
    const { studentId, noteId } = req.params;
    const { title, content } = req.body;

    await assertStudentExists(studentId);

    const [existing] = await db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.studentId, studentId)))
        .limit(1);

    if (!existing) throw new NotFound("Note not found for this student");

    await db
        .update(notes)
        .set({
            ...(title !== undefined && { title }),
            ...(content !== undefined && { content }),
            updatedAt: new Date(),
        })
        .where(eq(notes.id, noteId));

    const [updated] = await db
        .select()
        .from(notes)
        .where(eq(notes.id, noteId))
        .limit(1);

    return SuccessResponse(res, {
        message: "Note updated successfully",
        data: updated,
    });
};

// ── 4. Delete a single note by note id ───────────────────────────────────────
export const deleteStudentNote = async (req: Request, res: Response) => {
    const { studentId, noteId } = req.params;

    await assertStudentExists(studentId);

    const [existing] = await db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.studentId, studentId)))
        .limit(1);

    if (!existing) throw new NotFound("Note not found for this student");

    await db.delete(notes).where(eq(notes.id, noteId));

    return SuccessResponse(res, { message: "Note deleted successfully" });
};
