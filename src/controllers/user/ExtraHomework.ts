import { Request, Response } from "express";
import { db } from "../../models/connection";
import { extraHomework, extraHomeworkStudents } from "../../models/schema";
import { eq, desc, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import { validateAndSavePdf, deleteImage } from "../../utils/handleImages";

// ── GET LOGGED-IN STUDENT'S EXTRA HOMEWORK ASSIGNMENTS ────────────
export const getMyExtraHomework = async (req: Request, res: Response) => {
    const studentId = (req as any).user.id;
    const { status } = req.query; // "pending" | "submitted" | "graded" | undefined

    const conditions = [eq(extraHomeworkStudents.studentId, studentId)];

    if (status === "pending") {
        conditions.push(eq(extraHomeworkStudents.status, "assigned"));
    } else if (status === "submitted") {
        conditions.push(eq(extraHomeworkStudents.status, "submitted"));
    } else if (status === "graded") {
        conditions.push(eq(extraHomeworkStudents.status, "graded"));
    }

    const homeworkList = await db
        .select({
            assignmentId: extraHomeworkStudents.id,
            homeworkId: extraHomework.id,
            title: extraHomework.title,
            description: extraHomework.description,
            pdfUrl: extraHomework.pdfUrl,
            link: extraHomework.link,
            dueDate: extraHomework.dueDate,
            status: extraHomeworkStudents.status,
            submittedPdf: extraHomeworkStudents.submittedPdf,
            submittedAt: extraHomeworkStudents.submittedAt,
            studentNotes: extraHomeworkStudents.studentNotes,
            score: extraHomeworkStudents.score,
            feedback: extraHomeworkStudents.feedback,
            reviewedAt: extraHomeworkStudents.reviewedAt,
            createdAt: extraHomeworkStudents.createdAt,
        })
        .from(extraHomeworkStudents)
        .innerJoin(extraHomework, eq(extraHomeworkStudents.homeworkId, extraHomework.id))
        .where(and(...conditions))
        .orderBy(desc(extraHomeworkStudents.createdAt));

    const total = homeworkList.length;
    const pendingCount = homeworkList.filter(h => h.status === "assigned").length;
    const submittedCount = homeworkList.filter(h => h.status === "submitted").length;
    const gradedCount = homeworkList.filter(h => h.status === "graded" || h.status === "reviewed").length;

    SuccessResponse(res, {
        message: "Extra homework assignments retrieved successfully",
        data: {
            summary: {
                total,
                pendingCount,
                submittedCount,
                gradedCount,
            },
            homework: homeworkList,
        }
    });
};

// ── GET SINGLE EXTRA HOMEWORK DETAILS FOR LOGGED-IN STUDENT ───────
export const getExtraHomeworkDetail = async (req: Request, res: Response) => {
    const studentId = (req as any).user.id;
    const { id: homeworkId } = req.params;

    const [assignment] = await db
        .select({
            assignmentId: extraHomeworkStudents.id,
            homeworkId: extraHomework.id,
            title: extraHomework.title,
            description: extraHomework.description,
            pdfUrl: extraHomework.pdfUrl,
            link: extraHomework.link,
            dueDate: extraHomework.dueDate,
            status: extraHomeworkStudents.status,
            submittedPdf: extraHomeworkStudents.submittedPdf,
            submittedAt: extraHomeworkStudents.submittedAt,
            studentNotes: extraHomeworkStudents.studentNotes,
            score: extraHomeworkStudents.score,
            feedback: extraHomeworkStudents.feedback,
            reviewedAt: extraHomeworkStudents.reviewedAt,
            createdAt: extraHomeworkStudents.createdAt,
        })
        .from(extraHomeworkStudents)
        .innerJoin(extraHomework, eq(extraHomeworkStudents.homeworkId, extraHomework.id))
        .where(
            and(
                eq(extraHomeworkStudents.studentId, studentId),
                eq(extraHomeworkStudents.homeworkId, homeworkId)
            )
        );

    if (!assignment) {
        throw new NotFound("Extra homework assignment not found for your account");
    }

    SuccessResponse(res, {
        message: "Extra homework details retrieved successfully",
        data: assignment,
    });
};

// ── STUDENT SUBMITS SOLVED PDF FOR EXTRA HOMEWORK ─────────────────
export const submitExtraHomework = async (req: Request, res: Response) => {
    const studentId = (req as any).user.id;
    const { id: homeworkId } = req.params;
    const { pdf, studentNotes } = req.body;

    if (!pdf) {
        throw new BadRequest("Solved homework PDF is required");
    }

    const [assignment] = await db
        .select()
        .from(extraHomeworkStudents)
        .where(
            and(
                eq(extraHomeworkStudents.studentId, studentId),
                eq(extraHomeworkStudents.homeworkId, homeworkId)
            )
        );

    if (!assignment) {
        throw new NotFound("You are not assigned to this homework");
    }

    let submittedPdfUrl: string;
    if (pdf.startsWith("data:application/pdf;base64,")) {
        if (assignment.submittedPdf) {
            await deleteImage(assignment.submittedPdf);
        }
        submittedPdfUrl = await validateAndSavePdf(req, pdf, "student_extra_homework");
    } else if (pdf.startsWith("http")) {
        submittedPdfUrl = pdf;
    } else {
        throw new BadRequest("Invalid PDF format. Must be base64-encoded PDF or valid URL");
    }

    await db
        .update(extraHomeworkStudents)
        .set({
            submittedPdf: submittedPdfUrl,
            submittedAt: new Date(),
            studentNotes: studentNotes ? studentNotes.trim() : null,
            status: "submitted",
            updatedAt: new Date(),
        })
        .where(eq(extraHomeworkStudents.id, assignment.id));

    const [updated] = await db
        .select()
        .from(extraHomeworkStudents)
        .where(eq(extraHomeworkStudents.id, assignment.id));

    SuccessResponse(res, {
        message: "Extra homework submitted successfully",
        data: updated,
    });
};
