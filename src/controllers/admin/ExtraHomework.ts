import { Request, Response } from "express";
import { db } from "../../models/connection";
import {
    extraHomework,
    extraHomeworkStudents,
    Student,
    category,
    grade,
    groups,
    admins,
    groupStudents,
} from "../../models/schema";
import { eq, desc, and, like, inArray, count, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import { v4 as uuidv4 } from "uuid";
import { validateAndSavePdf, deleteImage } from "../../utils/handleImages";

// Helper to resolve student IDs based on targetType
const resolveTargetStudents = async (body: {
    targetType: "all" | "category" | "grade" | "group" | "individual";
    targetCategoryId?: string;
    targetGradeId?: string;
    targetGroupId?: string;
    studentIds?: string[];
}): Promise<string[]> => {
    const { targetType, targetCategoryId, targetGradeId, targetGroupId, studentIds = [] } = body;

    if (targetType === "individual") {
        return studentIds;
    }

    if (targetType === "category" && targetCategoryId) {
        const students = await db
            .select({ id: Student.id })
            .from(Student)
            .where(eq(Student.category, targetCategoryId));
        return students.map(s => s.id);
    }

    if (targetType === "grade" && targetGradeId) {
        const students = await db
            .select({ id: Student.id })
            .from(Student)
            .where(eq(Student.grade, targetGradeId));
        return students.map(s => s.id);
    }

    if (targetType === "group" && targetGroupId) {
        const groupMembers = await db
            .select({ studentId: groupStudents.studentId })
            .from(groupStudents)
            .where(eq(groupStudents.groupId, targetGroupId));
        return groupMembers.map(g => g.studentId);
    }

    if (targetType === "all") {
        const allStudents = await db.select({ id: Student.id }).from(Student);
        return allStudents.map(s => s.id);
    }

    return studentIds;
};

// ── CREATE EXTRA HOMEWORK ─────────────────────────────────────────
export const createExtraHomework = async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;
    const {
        title,
        description,
        pdf,
        link,
        dueDate,
        targetType = "individual",
        targetCategoryId,
        targetGradeId,
        targetGroupId,
        studentIds = [],
    } = req.body;

    if (!title || !title.trim()) {
        throw new BadRequest("Homework title is required");
    }

    let pdfUrl: string | null = null;
    if (pdf) {
        if (pdf.startsWith("data:application/pdf;base64,")) {
            pdfUrl = await validateAndSavePdf(req, pdf, "extra_homework");
        } else if (pdf.startsWith("http")) {
            pdfUrl = pdf;
        } else {
            throw new BadRequest("PDF must be a base64 encoded string or valid URL");
        }
    }

    const resolvedStudentIds = await resolveTargetStudents({
        targetType,
        targetCategoryId,
        targetGradeId,
        targetGroupId,
        studentIds,
    });

    const homeworkId = uuidv4();

    await db.transaction(async (tx) => {
        await tx.insert(extraHomework).values({
            id: homeworkId,
            title: title.trim(),
            description: description?.trim() || null,
            pdfUrl,
            link: link?.trim() || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            targetType,
            targetCategoryId: targetCategoryId || null,
            targetGradeId: targetGradeId || null,
            targetGroupId: targetGroupId || null,
            createdBy: adminId || null,
        });

        if (resolvedStudentIds.length > 0) {
            const uniqueStudentIds = Array.from(new Set(resolvedStudentIds));
            const assignments = uniqueStudentIds.map(studentId => ({
                id: uuidv4(),
                homeworkId,
                studentId,
                status: "assigned" as const,
            }));

            await tx.insert(extraHomeworkStudents).values(assignments);
        }
    });

    const [createdHw] = await db
        .select()
        .from(extraHomework)
        .where(eq(extraHomework.id, homeworkId));

    SuccessResponse(res, {
        message: "Extra homework created and assigned successfully",
        data: {
            ...createdHw,
            totalStudentsAssigned: resolvedStudentIds.length,
        }
    });
};

// ── GET ALL EXTRA HOMEWORK ─────────────────────────────────────────
export const getAllExtraHomework = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, search, targetType } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = [];

    if (search) {
        conditions.push(like(extraHomework.title, `%${search}%`));
    }
    if (targetType) {
        conditions.push(eq(extraHomework.targetType, targetType as any));
    }

    const homeworkList = await db
        .select({
            id: extraHomework.id,
            title: extraHomework.title,
            description: extraHomework.description,
            pdfUrl: extraHomework.pdfUrl,
            link: extraHomework.link,
            dueDate: extraHomework.dueDate,
            targetType: extraHomework.targetType,
            createdAt: extraHomework.createdAt,
            categoryName: category.name,
            gradeName: grade.name,
            groupName: groups.name,
        })
        .from(extraHomework)
        .leftJoin(category, eq(extraHomework.targetCategoryId, category.id))
        .leftJoin(grade, eq(extraHomework.targetGradeId, grade.id))
        .leftJoin(groups, eq(extraHomework.targetGroupId, groups.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(extraHomework.createdAt))
        .limit(Number(limit))
        .offset(offset);

    const homeworkWithStats = await Promise.all(
        homeworkList.map(async (hw) => {
            const studentAssignments = await db
                .select({
                    status: extraHomeworkStudents.status,
                })
                .from(extraHomeworkStudents)
                .where(eq(extraHomeworkStudents.homeworkId, hw.id));

            const totalAssigned = studentAssignments.length;
            const submittedCount = studentAssignments.filter(s => s.status === "submitted" || s.status === "reviewed" || s.status === "graded").length;
            const gradedCount = studentAssignments.filter(s => s.status === "graded").length;

            return {
                ...hw,
                stats: {
                    totalAssigned,
                    submittedCount,
                    pendingCount: totalAssigned - submittedCount,
                    gradedCount,
                    submissionRate: totalAssigned > 0 ? Number(((submittedCount / totalAssigned) * 100).toFixed(1)) : 0,
                }
            };
        })
    );

    const [totalCount] = await db
        .select({ count: count() })
        .from(extraHomework)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

    SuccessResponse(res, {
        message: "Extra homework list retrieved successfully",
        data: {
            homework: homeworkWithStats,
            pagination: {
                total: totalCount.count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalCount.count / Number(limit)),
            }
        }
    });
};

// ── GET EXTRA HOMEWORK DETAILS ────────────────────────────────────
export const getExtraHomeworkById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [hw] = await db
        .select({
            id: extraHomework.id,
            title: extraHomework.title,
            description: extraHomework.description,
            pdfUrl: extraHomework.pdfUrl,
            link: extraHomework.link,
            dueDate: extraHomework.dueDate,
            targetType: extraHomework.targetType,
            createdAt: extraHomework.createdAt,
            updatedAt: extraHomework.updatedAt,
            categoryName: category.name,
            gradeName: grade.name,
            groupName: groups.name,
        })
        .from(extraHomework)
        .leftJoin(category, eq(extraHomework.targetCategoryId, category.id))
        .leftJoin(grade, eq(extraHomework.targetGradeId, grade.id))
        .leftJoin(groups, eq(extraHomework.targetGroupId, groups.id))
        .where(eq(extraHomework.id, id));

    if (!hw) {
        throw new NotFound("Extra homework not found");
    }

    const assignedStudents = await db
        .select({
            assignmentId: extraHomeworkStudents.id,
            studentId: extraHomeworkStudents.studentId,
            status: extraHomeworkStudents.status,
            submittedPdf: extraHomeworkStudents.submittedPdf,
            submittedAt: extraHomeworkStudents.submittedAt,
            studentNotes: extraHomeworkStudents.studentNotes,
            score: extraHomeworkStudents.score,
            feedback: extraHomeworkStudents.feedback,
            reviewedAt: extraHomeworkStudents.reviewedAt,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            avatar: Student.avatar,
            phone: Student.phone,
        })
        .from(extraHomeworkStudents)
        .innerJoin(Student, eq(extraHomeworkStudents.studentId, Student.id))
        .where(eq(extraHomeworkStudents.homeworkId, id))
        .orderBy(desc(extraHomeworkStudents.submittedAt));

    const totalAssigned = assignedStudents.length;
    const totalSubmitted = assignedStudents.filter(s => s.status !== "assigned").length;
    const totalGraded = assignedStudents.filter(s => s.status === "graded").length;

    SuccessResponse(res, {
        message: "Extra homework details retrieved successfully",
        data: {
            ...hw,
            stats: {
                totalAssigned,
                totalSubmitted,
                totalGraded,
                pendingSubmissions: totalAssigned - totalSubmitted,
            },
            students: assignedStudents.map(s => ({
                assignmentId: s.assignmentId,
                status: s.status,
                submittedPdf: s.submittedPdf,
                submittedAt: s.submittedAt,
                studentNotes: s.studentNotes,
                score: s.score,
                feedback: s.feedback,
                reviewedAt: s.reviewedAt,
                student: {
                    id: s.studentId,
                    name: `${s.firstname} ${s.lastname}`,
                    nickname: s.nickname,
                    email: s.email,
                    avatar: s.avatar,
                    phone: s.phone,
                }
            })),
        }
    });
};

// ── UPDATE EXTRA HOMEWORK (WITH INTEGRATED STUDENT ASSIGNMENT) ──
export const updateExtraHomework = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        title,
        description,
        pdf,
        link,
        dueDate,
        targetType,
        targetCategoryId,
        targetGradeId,
        targetGroupId,
        studentIds,
    } = req.body;

    const [existing] = await db
        .select()
        .from(extraHomework)
        .where(eq(extraHomework.id, id));

    if (!existing) {
        throw new NotFound("Extra homework not found");
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (link !== undefined) updateData.link = link ? link.trim() : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (targetType !== undefined) updateData.targetType = targetType;
    if (targetCategoryId !== undefined) updateData.targetCategoryId = targetCategoryId || null;
    if (targetGradeId !== undefined) updateData.targetGradeId = targetGradeId || null;
    if (targetGroupId !== undefined) updateData.targetGroupId = targetGroupId || null;

    if (pdf !== undefined) {
        if (pdf === null || pdf === "") {
            if (existing.pdfUrl) await deleteImage(existing.pdfUrl);
            updateData.pdfUrl = null;
        } else if (pdf.startsWith("data:application/pdf;base64,")) {
            if (existing.pdfUrl) await deleteImage(existing.pdfUrl);
            updateData.pdfUrl = await validateAndSavePdf(req, pdf, "extra_homework");
        } else if (pdf.startsWith("http")) {
            updateData.pdfUrl = pdf;
        }
    }

    let newlyAssignedCount = 0;

    await db.transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
            await tx
                .update(extraHomework)
                .set(updateData)
                .where(eq(extraHomework.id, id));
        }

        // Handle adding students if target criteria or studentIds are supplied
        if (targetType || Array.isArray(studentIds) || targetCategoryId || targetGradeId || targetGroupId) {
            const resolvedStudentIds = await resolveTargetStudents({
                targetType: targetType || existing.targetType,
                targetCategoryId: targetCategoryId !== undefined ? targetCategoryId : existing.targetCategoryId ?? undefined,
                targetGradeId: targetGradeId !== undefined ? targetGradeId : existing.targetGradeId ?? undefined,
                targetGroupId: targetGroupId !== undefined ? targetGroupId : existing.targetGroupId ?? undefined,
                studentIds: studentIds || [],
            });

            if (resolvedStudentIds.length > 0) {
                const existingAssignments = await tx
                    .select({ studentId: extraHomeworkStudents.studentId })
                    .from(extraHomeworkStudents)
                    .where(eq(extraHomeworkStudents.homeworkId, id));

                const existingIds = new Set(existingAssignments.map(a => a.studentId));
                const newStudentIds = Array.from(new Set(resolvedStudentIds)).filter(sid => !existingIds.has(sid));

                if (newStudentIds.length > 0) {
                    const newRows = newStudentIds.map((sid: string) => ({
                        id: uuidv4(),
                        homeworkId: id,
                        studentId: sid,
                        status: "assigned" as const,
                    }));

                    await tx.insert(extraHomeworkStudents).values(newRows);
                    newlyAssignedCount = newStudentIds.length;
                }
            }
        }
    });

    const [updated] = await db
        .select()
        .from(extraHomework)
        .where(eq(extraHomework.id, id));

    SuccessResponse(res, {
        message: "Extra homework updated successfully",
        data: {
            ...updated,
            newlyAssignedStudents: newlyAssignedCount,
        },
    });
};

// ── DELETE EXTRA HOMEWORK ─────────────────────────────────────────
export const deleteExtraHomework = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [existing] = await db
        .select()
        .from(extraHomework)
        .where(eq(extraHomework.id, id));

    if (!existing) {
        throw new NotFound("Extra homework not found");
    }

    if (existing.pdfUrl) {
        await deleteImage(existing.pdfUrl);
    }

    await db.delete(extraHomework).where(eq(extraHomework.id, id));

    SuccessResponse(res, {
        message: "Extra homework deleted successfully",
    });
};

// ── REVIEW / GRADE STUDENT SUBMISSION ─────────────────────────────
export const reviewStudentSubmission = async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;
    const { id: homeworkId, submissionId } = req.params;
    const { score, feedback, status = "graded" } = req.body;

    const [submission] = await db
        .select()
        .from(extraHomeworkStudents)
        .where(
            and(
                eq(extraHomeworkStudents.id, submissionId),
                eq(extraHomeworkStudents.homeworkId, homeworkId)
            )
        );

    if (!submission) {
        throw new NotFound("Student submission record not found");
    }

    const updateData: any = {
        reviewedAt: new Date(),
        reviewedBy: adminId || null,
        status: status || "graded",
    };

    if (score !== undefined) updateData.score = Number(score);
    if (feedback !== undefined) updateData.feedback = feedback ? feedback.trim() : null;

    await db
        .update(extraHomeworkStudents)
        .set(updateData)
        .where(eq(extraHomeworkStudents.id, submissionId));

    const [updated] = await db
        .select()
        .from(extraHomeworkStudents)
        .where(eq(extraHomeworkStudents.id, submissionId));

    SuccessResponse(res, {
        message: "Student homework reviewed and graded successfully",
        data: updated,
    });
};

// ── GET A STUDENT'S EXTRA HOMEWORK HISTORY ─────────────────────────
export const getStudentExtraHomework = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [student] = await db
        .select({ id: Student.id, firstname: Student.firstname, lastname: Student.lastname })
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("Student not found");
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
        .where(eq(extraHomeworkStudents.studentId, id))
        .orderBy(desc(extraHomeworkStudents.createdAt));

    SuccessResponse(res, {
        message: "Student extra homework history retrieved successfully",
        data: {
            student: { id: student.id, name: `${student.firstname} ${student.lastname}` },
            totalAssignments: homeworkList.length,
            homework: homeworkList,
        }
    });
};