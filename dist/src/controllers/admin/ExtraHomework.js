"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentExtraHomework = exports.reviewStudentSubmission = exports.deleteExtraHomework = exports.updateExtraHomework = exports.getExtraHomeworkById = exports.getAllExtraHomework = exports.createExtraHomework = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const uuid_1 = require("uuid");
const handleImages_1 = require("../../utils/handleImages");
// Helper to resolve student IDs based on targetType
const resolveTargetStudents = async (body) => {
    const { targetType, targetCategoryId, targetGradeId, targetGroupId, studentIds = [] } = body;
    if (targetType === "individual") {
        return studentIds;
    }
    if (targetType === "category" && targetCategoryId) {
        const students = await connection_1.db
            .select({ id: schema_1.Student.id })
            .from(schema_1.Student)
            .where((0, drizzle_orm_1.eq)(schema_1.Student.category, targetCategoryId));
        return students.map(s => s.id);
    }
    if (targetType === "grade" && targetGradeId) {
        const students = await connection_1.db
            .select({ id: schema_1.Student.id })
            .from(schema_1.Student)
            .where((0, drizzle_orm_1.eq)(schema_1.Student.grade, targetGradeId));
        return students.map(s => s.id);
    }
    if (targetType === "group" && targetGroupId) {
        const groupMembers = await connection_1.db
            .select({ studentId: schema_1.groupStudents.studentId })
            .from(schema_1.groupStudents)
            .where((0, drizzle_orm_1.eq)(schema_1.groupStudents.groupId, targetGroupId));
        return groupMembers.map(g => g.studentId);
    }
    if (targetType === "all") {
        const allStudents = await connection_1.db.select({ id: schema_1.Student.id }).from(schema_1.Student);
        return allStudents.map(s => s.id);
    }
    return studentIds;
};
// ── CREATE EXTRA HOMEWORK ─────────────────────────────────────────
const createExtraHomework = async (req, res) => {
    const adminId = req.user?.id;
    const { title, description, pdf, link, dueDate, targetType = "individual", targetCategoryId, targetGradeId, targetGroupId, studentIds = [], } = req.body;
    if (!title || !title.trim()) {
        throw new BadRequest_1.BadRequest("Homework title is required");
    }
    let pdfUrl = null;
    if (pdf) {
        if (pdf.startsWith("data:application/pdf;base64,")) {
            pdfUrl = await (0, handleImages_1.validateAndSavePdf)(req, pdf, "extra_homework");
        }
        else if (pdf.startsWith("http")) {
            pdfUrl = pdf;
        }
        else {
            throw new BadRequest_1.BadRequest("PDF must be a base64 encoded string or valid URL");
        }
    }
    const resolvedStudentIds = await resolveTargetStudents({
        targetType,
        targetCategoryId,
        targetGradeId,
        targetGroupId,
        studentIds,
    });
    const homeworkId = (0, uuid_1.v4)();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.extraHomework).values({
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
                id: (0, uuid_1.v4)(),
                homeworkId,
                studentId,
                status: "assigned",
            }));
            await tx.insert(schema_1.extraHomeworkStudents).values(assignments);
        }
    });
    const [createdHw] = await connection_1.db
        .select()
        .from(schema_1.extraHomework)
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomework.id, homeworkId));
    (0, response_1.SuccessResponse)(res, {
        message: "Extra homework created and assigned successfully",
        data: {
            ...createdHw,
            totalStudentsAssigned: resolvedStudentIds.length,
        }
    });
};
exports.createExtraHomework = createExtraHomework;
// ── GET ALL EXTRA HOMEWORK ─────────────────────────────────────────
const getAllExtraHomework = async (req, res) => {
    const { page, limit, search, targetType } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;
    const conditions = [];
    if (search) {
        conditions.push((0, drizzle_orm_1.like)(schema_1.extraHomework.title, `%${search}%`));
    }
    if (targetType) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.extraHomework.targetType, targetType));
    }
    const homeworkList = await connection_1.db
        .select({
        id: schema_1.extraHomework.id,
        title: schema_1.extraHomework.title,
        description: schema_1.extraHomework.description,
        pdfUrl: schema_1.extraHomework.pdfUrl,
        link: schema_1.extraHomework.link,
        dueDate: schema_1.extraHomework.dueDate,
        targetType: schema_1.extraHomework.targetType,
        targetGroupId: schema_1.extraHomework.targetGroupId,
        createdAt: schema_1.extraHomework.createdAt,
        categoryName: schema_1.category.name,
        gradeName: schema_1.grade.name,
        groupName: schema_1.groups.name,
    })
        .from(schema_1.extraHomework)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.extraHomework.targetCategoryId, schema_1.category.id))
        .leftJoin(schema_1.grade, (0, drizzle_orm_1.eq)(schema_1.extraHomework.targetGradeId, schema_1.grade.id))
        .leftJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.extraHomework.targetGroupId, schema_1.groups.id))
        .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.extraHomework.createdAt))
        .limit(limitNum)
        .offset(offset);
    const homeworkWithStats = await Promise.all(homeworkList.map(async (hw) => {
        const studentAssignments = await connection_1.db
            .select({
            status: schema_1.extraHomeworkStudents.status,
        })
            .from(schema_1.extraHomeworkStudents)
            .where((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.homeworkId, hw.id));
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
    }));
    const [totalCount] = await connection_1.db
        .select({ count: (0, drizzle_orm_1.count)() })
        .from(schema_1.extraHomework)
        .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined);
    (0, response_1.SuccessResponse)(res, {
        message: "Extra homework list retrieved successfully",
        data: {
            homework: homeworkWithStats,
            pagination: {
                total: totalCount.count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalCount.count / limitNum),
            }
        }
    });
};
exports.getAllExtraHomework = getAllExtraHomework;
// ── GET EXTRA HOMEWORK DETAILS ────────────────────────────────────
const getExtraHomeworkById = async (req, res) => {
    const { id } = req.params;
    const [hw] = await connection_1.db
        .select({
        id: schema_1.extraHomework.id,
        title: schema_1.extraHomework.title,
        description: schema_1.extraHomework.description,
        pdfUrl: schema_1.extraHomework.pdfUrl,
        link: schema_1.extraHomework.link,
        dueDate: schema_1.extraHomework.dueDate,
        targetType: schema_1.extraHomework.targetType,
        targetGroupId: schema_1.extraHomework.targetGroupId,
        createdAt: schema_1.extraHomework.createdAt,
        updatedAt: schema_1.extraHomework.updatedAt,
        categoryName: schema_1.category.name,
        gradeName: schema_1.grade.name,
        groupName: schema_1.groups.name,
    })
        .from(schema_1.extraHomework)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.extraHomework.targetCategoryId, schema_1.category.id))
        .leftJoin(schema_1.grade, (0, drizzle_orm_1.eq)(schema_1.extraHomework.targetGradeId, schema_1.grade.id))
        .leftJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.extraHomework.targetGroupId, schema_1.groups.id))
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomework.id, id));
    if (!hw) {
        throw new NotFound_1.NotFound("Extra homework not found");
    }
    const assignedStudents = await connection_1.db
        .select({
        assignmentId: schema_1.extraHomeworkStudents.id,
        studentId: schema_1.extraHomeworkStudents.studentId,
        status: schema_1.extraHomeworkStudents.status,
        submittedPdf: schema_1.extraHomeworkStudents.submittedPdf,
        submittedAt: schema_1.extraHomeworkStudents.submittedAt,
        studentNotes: schema_1.extraHomeworkStudents.studentNotes,
        score: schema_1.extraHomeworkStudents.score,
        feedback: schema_1.extraHomeworkStudents.feedback,
        reviewedAt: schema_1.extraHomeworkStudents.reviewedAt,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        avatar: schema_1.Student.avatar,
        phone: schema_1.Student.phone,
    })
        .from(schema_1.extraHomeworkStudents)
        .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.studentId, schema_1.Student.id))
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.homeworkId, id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.extraHomeworkStudents.submittedAt));
    const totalAssigned = assignedStudents.length;
    const totalSubmitted = assignedStudents.filter(s => s.status !== "assigned").length;
    const totalGraded = assignedStudents.filter(s => s.status === "graded").length;
    (0, response_1.SuccessResponse)(res, {
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
exports.getExtraHomeworkById = getExtraHomeworkById;
// ── UPDATE EXTRA HOMEWORK (WITH INTEGRATED STUDENT ASSIGNMENT) ──
const updateExtraHomework = async (req, res) => {
    const { id } = req.params;
    const { title, description, pdf, link, dueDate, targetType, targetCategoryId, targetGradeId, targetGroupId, studentIds, } = req.body;
    const [existing] = await connection_1.db
        .select()
        .from(schema_1.extraHomework)
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomework.id, id));
    if (!existing) {
        throw new NotFound_1.NotFound("Extra homework not found");
    }
    const updateData = {};
    if (title !== undefined)
        updateData.title = title.trim();
    if (description !== undefined)
        updateData.description = description ? description.trim() : null;
    if (link !== undefined)
        updateData.link = link ? link.trim() : null;
    if (dueDate !== undefined)
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (targetType !== undefined)
        updateData.targetType = targetType;
    if (targetCategoryId !== undefined)
        updateData.targetCategoryId = targetCategoryId || null;
    if (targetGradeId !== undefined)
        updateData.targetGradeId = targetGradeId || null;
    if (targetGroupId !== undefined)
        updateData.targetGroupId = targetGroupId || null;
    if (pdf !== undefined) {
        if (pdf === null || pdf === "") {
            if (existing.pdfUrl)
                await (0, handleImages_1.deleteImage)(existing.pdfUrl);
            updateData.pdfUrl = null;
        }
        else if (pdf.startsWith("data:application/pdf;base64,")) {
            if (existing.pdfUrl)
                await (0, handleImages_1.deleteImage)(existing.pdfUrl);
            updateData.pdfUrl = await (0, handleImages_1.validateAndSavePdf)(req, pdf, "extra_homework");
        }
        else if (pdf.startsWith("http")) {
            updateData.pdfUrl = pdf;
        }
    }
    let newlyAssignedCount = 0;
    // Detect whether the target audience is changing
    const targetChanged = (targetType !== undefined && targetType !== existing.targetType) ||
        (targetGroupId !== undefined && targetGroupId !== existing.targetGroupId) ||
        (targetCategoryId !== undefined && targetCategoryId !== existing.targetCategoryId) ||
        (targetGradeId !== undefined && targetGradeId !== existing.targetGradeId);
    await connection_1.db.transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
            await tx
                .update(schema_1.extraHomework)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.extraHomework.id, id));
        }
        // Handle student assignment when target criteria or studentIds are supplied
        const effectiveTargetType = targetType !== undefined ? targetType : existing.targetType;
        const effectiveTargetGroupId = targetGroupId !== undefined ? targetGroupId : existing.targetGroupId ?? undefined;
        const effectiveTargetCategoryId = targetCategoryId !== undefined ? targetCategoryId : existing.targetCategoryId ?? undefined;
        const effectiveTargetGradeId = targetGradeId !== undefined ? targetGradeId : existing.targetGradeId ?? undefined;
        if (targetType || Array.isArray(studentIds) || targetCategoryId || targetGradeId || targetGroupId) {
            // If the target audience changed, remove old unsubmitted assignments
            // so students are reassigned from scratch for the new target
            if (targetChanged) {
                await tx
                    .delete(schema_1.extraHomeworkStudents)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.homeworkId, id), (0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.status, "assigned")));
            }
            const resolvedStudentIds = await resolveTargetStudents({
                targetType: effectiveTargetType,
                targetCategoryId: effectiveTargetCategoryId,
                targetGradeId: effectiveTargetGradeId,
                targetGroupId: effectiveTargetGroupId,
                studentIds: studentIds || [],
            });
            if (resolvedStudentIds.length > 0) {
                // Re-fetch remaining assignments (after possible delete above)
                const existingAssignments = await tx
                    .select({ studentId: schema_1.extraHomeworkStudents.studentId })
                    .from(schema_1.extraHomeworkStudents)
                    .where((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.homeworkId, id));
                const existingIds = new Set(existingAssignments.map(a => a.studentId));
                const newStudentIds = Array.from(new Set(resolvedStudentIds)).filter(sid => !existingIds.has(sid));
                if (newStudentIds.length > 0) {
                    const newRows = newStudentIds.map((sid) => ({
                        id: (0, uuid_1.v4)(),
                        homeworkId: id,
                        studentId: sid,
                        status: "assigned",
                    }));
                    await tx.insert(schema_1.extraHomeworkStudents).values(newRows);
                    newlyAssignedCount = newStudentIds.length;
                }
            }
        }
    });
    const [updated] = await connection_1.db
        .select()
        .from(schema_1.extraHomework)
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomework.id, id));
    (0, response_1.SuccessResponse)(res, {
        message: "Extra homework updated successfully",
        data: {
            ...updated,
            newlyAssignedStudents: newlyAssignedCount,
        },
    });
};
exports.updateExtraHomework = updateExtraHomework;
// ── DELETE EXTRA HOMEWORK ─────────────────────────────────────────
const deleteExtraHomework = async (req, res) => {
    const { id } = req.params;
    const [existing] = await connection_1.db
        .select()
        .from(schema_1.extraHomework)
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomework.id, id));
    if (!existing) {
        throw new NotFound_1.NotFound("Extra homework not found");
    }
    if (existing.pdfUrl) {
        await (0, handleImages_1.deleteImage)(existing.pdfUrl);
    }
    await connection_1.db.delete(schema_1.extraHomework).where((0, drizzle_orm_1.eq)(schema_1.extraHomework.id, id));
    (0, response_1.SuccessResponse)(res, {
        message: "Extra homework deleted successfully",
    });
};
exports.deleteExtraHomework = deleteExtraHomework;
// ── REVIEW / GRADE STUDENT SUBMISSION ─────────────────────────────
const reviewStudentSubmission = async (req, res) => {
    const adminId = req.user?.id;
    const { id: homeworkId, submissionId } = req.params;
    const { score, feedback, status = "graded" } = req.body;
    const [submission] = await connection_1.db
        .select()
        .from(schema_1.extraHomeworkStudents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.id, submissionId), (0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.homeworkId, homeworkId)));
    if (!submission) {
        throw new NotFound_1.NotFound("Student submission record not found");
    }
    const updateData = {
        reviewedAt: new Date(),
        reviewedBy: adminId || null,
        status: status || "graded",
    };
    if (score !== undefined)
        updateData.score = Number(score);
    if (feedback !== undefined)
        updateData.feedback = feedback ? feedback.trim() : null;
    await connection_1.db
        .update(schema_1.extraHomeworkStudents)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.id, submissionId));
    const [updated] = await connection_1.db
        .select()
        .from(schema_1.extraHomeworkStudents)
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.id, submissionId));
    (0, response_1.SuccessResponse)(res, {
        message: "Student homework reviewed and graded successfully",
        data: updated,
    });
};
exports.reviewStudentSubmission = reviewStudentSubmission;
// ── GET A STUDENT'S EXTRA HOMEWORK HISTORY ─────────────────────────
const getStudentExtraHomework = async (req, res) => {
    const { id } = req.params;
    const [student] = await connection_1.db
        .select({ id: schema_1.Student.id, firstname: schema_1.Student.firstname, lastname: schema_1.Student.lastname })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("Student not found");
    }
    const homeworkList = await connection_1.db
        .select({
        assignmentId: schema_1.extraHomeworkStudents.id,
        homeworkId: schema_1.extraHomework.id,
        title: schema_1.extraHomework.title,
        description: schema_1.extraHomework.description,
        pdfUrl: schema_1.extraHomework.pdfUrl,
        link: schema_1.extraHomework.link,
        dueDate: schema_1.extraHomework.dueDate,
        status: schema_1.extraHomeworkStudents.status,
        submittedPdf: schema_1.extraHomeworkStudents.submittedPdf,
        submittedAt: schema_1.extraHomeworkStudents.submittedAt,
        studentNotes: schema_1.extraHomeworkStudents.studentNotes,
        score: schema_1.extraHomeworkStudents.score,
        feedback: schema_1.extraHomeworkStudents.feedback,
        reviewedAt: schema_1.extraHomeworkStudents.reviewedAt,
        createdAt: schema_1.extraHomeworkStudents.createdAt,
    })
        .from(schema_1.extraHomeworkStudents)
        .innerJoin(schema_1.extraHomework, (0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.homeworkId, schema_1.extraHomework.id))
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.studentId, id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.extraHomeworkStudents.createdAt));
    (0, response_1.SuccessResponse)(res, {
        message: "Student extra homework history retrieved successfully",
        data: {
            student: { id: student.id, name: `${student.firstname} ${student.lastname}` },
            totalAssignments: homeworkList.length,
            homework: homeworkList,
        }
    });
};
exports.getStudentExtraHomework = getStudentExtraHomework;
