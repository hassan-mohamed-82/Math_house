"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiagnosticExamOptions = exports.getDiagnosticExamById = exports.getDiagnosticExams = void 0;
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const getDiagnosticExams = async (req, res) => {
    const diagnosticExams = await connection_1.db.select({
        id: schema_1.diagnosticExam.id,
        name: schema_1.diagnosticExam.title,
        description: schema_1.diagnosticExam.description,
        duration: schema_1.diagnosticExam.duration,
        totalScore: schema_1.diagnosticExam.totalScore,
        passScore: schema_1.diagnosticExam.passScore,
        rawScoreId: schema_1.diagnosticExam.rawScoreId,
        numberOfQuestions: schema_1.diagnosticExam.numberOfQuestions,
        isActive: schema_1.diagnosticExam.isActive,
        courseId: schema_1.diagnosticExam.courseId,
        course: {
            Id: schema_1.courses.id,
            name: schema_1.courses.name,
            description: schema_1.courses.description,
        }
    }).from(schema_1.diagnosticExam)
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.diagnosticExam.courseId, schema_1.courses.id));
    return (0, response_1.SuccessResponse)(res, { message: "Diagnostic Exam retrieved successfully", data: diagnosticExams });
};
exports.getDiagnosticExams = getDiagnosticExams;
const getDiagnosticExamById = async (req, res) => {
    const { id } = req.params;
    const ExistDiagnosticExam = await connection_1.db.select({
        id: schema_1.diagnosticExam.id,
        name: schema_1.diagnosticExam.title,
        description: schema_1.diagnosticExam.description,
        duration: schema_1.diagnosticExam.duration,
        totalScore: schema_1.diagnosticExam.totalScore,
        passScore: schema_1.diagnosticExam.passScore,
        rawScoreId: schema_1.diagnosticExam.rawScoreId,
        numberOfQuestions: schema_1.diagnosticExam.numberOfQuestions,
        isActive: schema_1.diagnosticExam.isActive,
        courseId: schema_1.diagnosticExam.courseId,
        course: {
            Id: schema_1.courses.id,
            name: schema_1.courses.name,
            description: schema_1.courses.description,
        },
    }).from(schema_1.diagnosticExam)
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.diagnosticExam.courseId, schema_1.courses.id))
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Diagnostic Exam retrieved successfully", data: ExistDiagnosticExam });
};
exports.getDiagnosticExamById = getDiagnosticExamById;
const getDiagnosticExamOptions = async (req, res) => {
    const { id } = req.params;
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    // Get total count for pagination
    const [totalQueries] = await connection_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` })
        .from(schema_1.diagnosticExamQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamQuestions.diagnosticExamId, id));
    const total = totalQueries.count;
    const totalPages = Math.ceil(total / limit);
    // Fetch the mapping and the basic question details with pagination
    const AllDiagnosticExamQuestions = await connection_1.db.select({
        id: schema_1.diagnosticExamQuestions.id,
        diagnosticExamId: schema_1.diagnosticExamQuestions.diagnosticExamId,
        score: schema_1.diagnosticExamQuestions.score,
        createdAt: schema_1.diagnosticExamQuestions.createdAt,
        updatedAt: schema_1.diagnosticExamQuestions.updatedAt,
        question: {
            id: schema_1.questions.id,
            question: schema_1.questions.question,
            image: schema_1.questions.image,
            answerType: schema_1.questions.answerType,
            difficulty: schema_1.questions.difficulty,
            questionType: schema_1.questions.questionType,
            year: schema_1.questions.year,
            month: schema_1.questions.month,
        }
    }).from(schema_1.diagnosticExamQuestions)
        .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.diagnosticExamQuestions.questionId, schema_1.questions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamQuestions.diagnosticExamId, id))
        .limit(limit)
        .offset(offset)
        // Order by creation time to ensure consistent pagination, if there's no specific sort order
        .orderBy(schema_1.diagnosticExamQuestions.createdAt);
    const questionIds = AllDiagnosticExamQuestions.map((q) => q.question.id);
    let options = [];
    // Fetch the options for the related questions
    if (questionIds.length > 0) {
        options = await connection_1.db.select({
            id: schema_1.questionOptions.id,
            questionId: schema_1.questionOptions.questionId,
            answer: schema_1.questionOptions.answer,
            order: schema_1.questionOptions.order,
        }).from(schema_1.questionOptions)
            .where((0, drizzle_orm_1.inArray)(schema_1.questionOptions.questionId, questionIds));
    }
    // Attach options to each corresponding question and flatten the structure
    const formattedQuestions = AllDiagnosticExamQuestions.map((q) => {
        return {
            ...q.question,
            score: q.score, // Keeps the point value of the question if needed
            options: options
                .filter((opt) => opt.questionId === q.question.id)
                .map(({ questionId, ...rest }) => rest), // Omit questionId redundancy
        };
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Diagnostic Exam Options retrieved successfully",
        data: formattedQuestions,
        pagination: {
            total,
            page,
            limit,
            totalPages
        }
    });
};
exports.getDiagnosticExamOptions = getDiagnosticExamOptions;
