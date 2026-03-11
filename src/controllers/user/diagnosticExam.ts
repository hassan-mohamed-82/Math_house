import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { db } from "../../models/connection";
import { courses, diagnosticExam, diagnosticExamQuestions, questions, questionOptions } from "../../models/schema";
import { eq, inArray, sql } from "drizzle-orm";

export const getDiagnosticExams = async (req: Request, res: Response) => {
    const diagnosticExams = await db.select({
        id: diagnosticExam.id,
        name: diagnosticExam.title,
        description: diagnosticExam.description,
        duration: diagnosticExam.duration,
        totalScore: diagnosticExam.totalScore,
        passScore: diagnosticExam.passScore,
        rawScoreId: diagnosticExam.rawScoreId,
        numberOfQuestions: diagnosticExam.numberOfQuestions,
        isActive: diagnosticExam.isActive,
        courseId: diagnosticExam.courseId,
        course: {
            Id: courses.id,
            name: courses.name,
            description: courses.description,
        }
    }).from(diagnosticExam)
        .leftJoin(courses, eq(diagnosticExam.courseId, courses.id));

    return SuccessResponse(res, { message: "Diagnostic Exam retrieved successfully", data: diagnosticExams });
};

export const getDiagnosticExamById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const ExistDiagnosticExam = await db.select({
        id: diagnosticExam.id,
        name: diagnosticExam.title,
        description: diagnosticExam.description,
        duration: diagnosticExam.duration,
        totalScore: diagnosticExam.totalScore,
        passScore: diagnosticExam.passScore,
        rawScoreId: diagnosticExam.rawScoreId,
        numberOfQuestions: diagnosticExam.numberOfQuestions,
        isActive: diagnosticExam.isActive,
        courseId: diagnosticExam.courseId,
        course: {
            Id: courses.id,
            name: courses.name,
            description: courses.description,
        },
    }).from(diagnosticExam)
        .leftJoin(courses, eq(diagnosticExam.courseId, courses.id))
        .where(eq(diagnosticExam.id, id));

    return SuccessResponse(res, { message: "Diagnostic Exam retrieved successfully", data: ExistDiagnosticExam });
};

export const getDiagnosticExamOptions = async (req: Request, res: Response) => {
    const { id } = req.params;

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const [totalQueries] = await db.select({ count: sql<number>`count(*)` })
        .from(diagnosticExamQuestions)
        .where(eq(diagnosticExamQuestions.diagnosticExamId, id));

    const total = totalQueries.count;
    const totalPages = Math.ceil(total / limit);

    // Fetch the mapping and the basic question details with pagination
    const AllDiagnosticExamQuestions = await db.select({
        id: diagnosticExamQuestions.id,
        diagnosticExamId: diagnosticExamQuestions.diagnosticExamId,
        score: diagnosticExamQuestions.score,
        createdAt: diagnosticExamQuestions.createdAt,
        updatedAt: diagnosticExamQuestions.updatedAt,
        question: {
            id: questions.id,
            question: questions.question,
            image: questions.image,
            answerType: questions.answerType,
            difficulty: questions.difficulty,
            questionType: questions.questionType,
            year: questions.year,
            month: questions.month,
        }
    }).from(diagnosticExamQuestions)
        .innerJoin(questions, eq(diagnosticExamQuestions.questionId, questions.id))
        .where(eq(diagnosticExamQuestions.diagnosticExamId, id))
        .limit(limit)
        .offset(offset)
        // Order by creation time to ensure consistent pagination, if there's no specific sort order
        .orderBy(diagnosticExamQuestions.createdAt);

    const questionIds = AllDiagnosticExamQuestions.map((q) => q.question.id);

    let options: any[] = [];

    // Fetch the options for the related questions
    if (questionIds.length > 0) {
        options = await db.select({
            id: questionOptions.id,
            questionId: questionOptions.questionId,
            answer: questionOptions.answer,
            order: questionOptions.order,
        }).from(questionOptions)
            .where(inArray(questionOptions.questionId, questionIds));
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

    return SuccessResponse(res, {
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