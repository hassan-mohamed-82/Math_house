import { Request, Response } from "express";
import { db } from "../../models/connection";
import { quizAttempts, studentQuizAnswers, quizzes, questions, questionOptions, Student, examAttempts, studentAnswers, Exams } from "../../models/schema";
import { eq, and, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors";

export const getStudentQuizReports = async (req: Request, res: Response) => {
    const { studentId } = req.params;

    const existingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new NotFound("Student not found");
    }

    const attempts = await db
        .select({
            attemptId: quizAttempts.id,
            score: quizAttempts.score,
            date: quizAttempts.endedAt,
            quizId: quizzes.id,
            quizName: quizzes.title,
            totalScore: quizzes.totalScore,
            passScore: quizzes.passScore
        })
        .from(quizAttempts)
        .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .where(
            and(
                eq(quizAttempts.studentId, studentId),
                eq(quizAttempts.status, "completed")
            )
        );

    const reportData = await Promise.all(
        attempts.map(async (attempt) => {
            const mistakes = await db
                .select({
                    questionId: questions.id,
                    questionText: questions.question,
                    studentSelectedOptionId: studentQuizAnswers.selectedOptionId,
                    studentGridInAnswer: studentQuizAnswers.gridInAnswer,
                })
                .from(studentQuizAnswers)
                .innerJoin(questions, eq(studentQuizAnswers.questionId, questions.id))
                .where(
                    and(
                        eq(studentQuizAnswers.attemptId, attempt.attemptId),
                        eq(studentQuizAnswers.isCorrect, false)
                    )
                );
            
            const questionIds = mistakes.map(m => m.questionId);
            let options: any[] = [];
            
            if (questionIds.length > 0) {
                options = await db
                    .select({
                        id: questionOptions.id,
                        questionId: questionOptions.questionId,
                        answer: questionOptions.answer,
                        isCorrect: questionOptions.isCorrect,
                        order: questionOptions.order
                    })
                    .from(questionOptions)
                    .where(inArray(questionOptions.questionId, questionIds));
            }

            const mistakesWithDetails = mistakes.map(m => {
                const qOptions = options.filter(o => o.questionId === m.questionId);
                const correctOption = qOptions.find(o => o.isCorrect);
                const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);

                return {
                    ...m,
                    correctOption: correctOption ? correctOption.answer : null,
                    studentOption: studentOption ? studentOption.answer : null,
                    options: qOptions.map(({questionId, isCorrect, ...rest}) => rest)
                };
            });

            return {
                ...attempt,
                mistakes: mistakesWithDetails
            };
        })
    );

    return SuccessResponse(res, {
        message: "Student quiz reports retrieved successfully",
        data: reportData
    });
};

export const getStudentExamReports = async (req: Request, res: Response) => {
    const { studentId } = req.params;

    const existingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new NotFound("Student not found");
    }

    const attempts = await db
        .select({
            attemptId: examAttempts.id,
            score: examAttempts.score,
            date: examAttempts.endedAt,
            examId: Exams.id,
            examName: Exams.title,
            totalScore: Exams.totalScore,
            passScore: Exams.passScore
        })
        .from(examAttempts)
        .innerJoin(Exams, eq(examAttempts.examId, Exams.id))
        .where(
            and(
                eq(examAttempts.studentId, studentId),
                eq(examAttempts.status, "completed")
            )
        );

    const reportData = await Promise.all(
        attempts.map(async (attempt) => {
            const mistakes = await db
                .select({
                    questionId: questions.id,
                    questionText: questions.question,
                    studentSelectedOptionId: studentAnswers.selectedOptionId,
                    studentGridInAnswer: studentAnswers.gridInAnswer,
                })
                .from(studentAnswers)
                .innerJoin(questions, eq(studentAnswers.questionId, questions.id))
                .where(
                    and(
                        eq(studentAnswers.attemptId, attempt.attemptId),
                        eq(studentAnswers.isCorrect, false)
                    )
                );
            
            const questionIds = mistakes.map(m => m.questionId);
            let options: any[] = [];
            
            if (questionIds.length > 0) {
                options = await db
                    .select({
                        id: questionOptions.id,
                        questionId: questionOptions.questionId,
                        answer: questionOptions.answer,
                        isCorrect: questionOptions.isCorrect,
                        order: questionOptions.order
                    })
                    .from(questionOptions)
                    .where(inArray(questionOptions.questionId, questionIds));
            }

            const mistakesWithDetails = mistakes.map(m => {
                const qOptions = options.filter(o => o.questionId === m.questionId);
                const correctOption = qOptions.find(o => o.isCorrect);
                const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);

                return {
                    ...m,
                    correctOption: correctOption ? correctOption.answer : null,
                    studentOption: studentOption ? studentOption.answer : null,
                    options: qOptions.map(({questionId, isCorrect, ...rest}) => rest)
                };
            });

            return {
                ...attempt,
                mistakes: mistakesWithDetails
            };
        })
    );

    return SuccessResponse(res, {
        message: "Student exam reports retrieved successfully",
        data: reportData
    });
};
