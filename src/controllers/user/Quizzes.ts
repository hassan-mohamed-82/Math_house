import { Request, Response } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../models/connection";
import { quizzes, questions, quizQuestions, questionOptions } from "../../models/schema";
import { SuccessResponse } from "../../utils/response";
import { NotFound, UnauthorizedError } from "../../Errors";

export const getQuizQuestions = async (req: Request, res: Response) => {
    const { quizId } = req.params;

    const existingQuiz = await db.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.id, quizId));
    if (existingQuiz.length === 0) {
        throw new NotFound("Quiz not found");
    }

    const AllQuizQuestions = await db.select({
        id: quizQuestions.quizId,
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
    }).from(quizQuestions)
        .innerJoin(questions, eq(quizQuestions.questionId, questions.id))
        .where(eq(quizQuestions.quizId, quizId))
        .orderBy(questions.createdAt);

    const questionIds = AllQuizQuestions.map(q => q.question.id);

    let options: any[] = [];

    if (questionIds.length > 0) {
        options = await db.select({
            id: questionOptions.id,
            questionId: questionOptions.questionId,
            answer: questionOptions.answer,
            order: questionOptions.order,
        }).from(questionOptions)
            .where(inArray(questionOptions.questionId, questionIds));
    }

    const formattedQuestions = AllQuizQuestions.map((q) => {
        return {
            ...q.question,
            options: options.filter(o => o.questionId === q.question.id).map(({questionId, ...rest}) => rest),
        };
    });

    return SuccessResponse(res, {message: "Quiz questions retrieved successfully", data: formattedQuestions});
};
