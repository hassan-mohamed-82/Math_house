"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitExtraHomework = exports.getExtraHomeworkDetail = exports.getMyExtraHomework = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
// ── GET LOGGED-IN STUDENT'S EXTRA HOMEWORK ASSIGNMENTS ────────────
const getMyExtraHomework = async (req, res) => {
    const studentId = req.user.id;
    const { status } = req.query; // "pending" | "submitted" | "graded" | undefined
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.studentId, studentId)];
    if (status === "pending") {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.status, "assigned"));
    }
    else if (status === "submitted") {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.status, "submitted"));
    }
    else if (status === "graded") {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.status, "graded"));
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
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.extraHomeworkStudents.createdAt));
    const total = homeworkList.length;
    const pendingCount = homeworkList.filter(h => h.status === "assigned").length;
    const submittedCount = homeworkList.filter(h => h.status === "submitted").length;
    const gradedCount = homeworkList.filter(h => h.status === "graded" || h.status === "reviewed").length;
    (0, response_1.SuccessResponse)(res, {
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
exports.getMyExtraHomework = getMyExtraHomework;
// ── GET SINGLE EXTRA HOMEWORK DETAILS FOR LOGGED-IN STUDENT ───────
const getExtraHomeworkDetail = async (req, res) => {
    const studentId = req.user.id;
    const { id: homeworkId } = req.params;
    const [assignment] = await connection_1.db
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
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.homeworkId, homeworkId)));
    if (!assignment) {
        throw new NotFound_1.NotFound("Extra homework assignment not found for your account");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Extra homework details retrieved successfully",
        data: assignment,
    });
};
exports.getExtraHomeworkDetail = getExtraHomeworkDetail;
// ── STUDENT SUBMITS SOLVED PDF FOR EXTRA HOMEWORK ─────────────────
const submitExtraHomework = async (req, res) => {
    const studentId = req.user.id;
    const { id: homeworkId } = req.params;
    const { pdf, studentNotes } = req.body;
    if (!pdf) {
        throw new BadRequest_1.BadRequest("Solved homework PDF is required");
    }
    const [assignment] = await connection_1.db
        .select()
        .from(schema_1.extraHomeworkStudents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.homeworkId, homeworkId)));
    if (!assignment) {
        throw new NotFound_1.NotFound("You are not assigned to this homework");
    }
    let submittedPdfUrl;
    if (pdf.startsWith("data:application/pdf;base64,")) {
        if (assignment.submittedPdf) {
            await (0, handleImages_1.deleteImage)(assignment.submittedPdf);
        }
        submittedPdfUrl = await (0, handleImages_1.validateAndSavePdf)(req, pdf, "student_extra_homework");
    }
    else if (pdf.startsWith("http")) {
        submittedPdfUrl = pdf;
    }
    else {
        throw new BadRequest_1.BadRequest("Invalid PDF format. Must be base64-encoded PDF or valid URL");
    }
    await connection_1.db
        .update(schema_1.extraHomeworkStudents)
        .set({
        submittedPdf: submittedPdfUrl,
        submittedAt: new Date(),
        studentNotes: studentNotes ? studentNotes.trim() : null,
        status: "submitted",
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.id, assignment.id));
    const [updated] = await connection_1.db
        .select()
        .from(schema_1.extraHomeworkStudents)
        .where((0, drizzle_orm_1.eq)(schema_1.extraHomeworkStudents.id, assignment.id));
    (0, response_1.SuccessResponse)(res, {
        message: "Extra homework submitted successfully",
        data: updated,
    });
};
exports.submitExtraHomework = submitExtraHomework;
