import { Request, Response } from "express";
import { eq, and, inArray, asc } from "drizzle-orm";
import { db } from "../../models/connection";
import { quizzes, questions, quizQuestions, questionOptions, quizAttempts, studentQuizAnswers, lessons } from "../../models/schema";
import { randomUUID } from "crypto";
import { SuccessResponse } from "../../utils/response";
import { NotFound, UnauthorizedError, BadRequest } from "../../Errors";
import { checkAccess } from "../../utils/accessControl";

export const getQuizQuestions = async (req: Request, res: Response) => {
    const { quizId } = req.params;

    const [existingQuiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!existingQuiz) {
        throw new NotFound("Quiz not found");
    }

    const hasAccess = await checkAccess(req.user.id, {
        courseId: existingQuiz.courseId || undefined,
        chapterId: existingQuiz.chapterId || undefined,
        lessonId: existingQuiz.lessonId || undefined
    });

    if (!hasAccess) {
        throw new BadRequest("You do not have access to this quiz. Please purchase the corresponding course, chapter, or lesson.");
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

export const getQuizById = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const { quizId } = req.params;

    const [existingQuiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!existingQuiz) {
        throw new NotFound("Quiz not found");
    }

    const hasAccess = await checkAccess(studentId, {
        courseId: existingQuiz.courseId || undefined,
        chapterId: existingQuiz.chapterId || undefined,
        lessonId: existingQuiz.lessonId || undefined
    });

    if (!hasAccess) {
        throw new BadRequest("You do not have access to this quiz. Please purchase the corresponding course, chapter, or lesson.");
    }

    const [existingAttempt] = await db
        .select({
            id: quizAttempts.id,
            status: quizAttempts.status,
            startedAt: quizAttempts.startedAt,
            score: quizAttempts.score,
            isPassed: quizAttempts.isPassed,
        })
        .from(quizAttempts)
        .where(and(
            eq(quizAttempts.studentId, studentId),
            eq(quizAttempts.quizId, quizId),
        ));

    const questionsCount = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quizId));

    SuccessResponse(res, {
        quiz: {
            id: existingQuiz.id,
            title: existingQuiz.title,
            description: existingQuiz.description,
            durationHours: existingQuiz.durationHours,
            durationMinutes: existingQuiz.durationMinutes,
            totalScore: existingQuiz.totalScore,
            passScore: existingQuiz.passScore,
            questionsCount: questionsCount.length,
        },
        attempt: existingAttempt ?? null,
    });
};

export const startQuiz = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const { quizId } = req.params;

    const [existingQuiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!existingQuiz) throw new NotFound("Quiz not found");
    if (!existingQuiz.isActive) throw new BadRequest("Quiz is not active");

    const hasAccess = await checkAccess(studentId, {
        courseId: existingQuiz.courseId || undefined,
        chapterId: existingQuiz.chapterId || undefined,
        lessonId: existingQuiz.lessonId || undefined
    });

    if (!hasAccess) {
        throw new BadRequest("You do not have access to this quiz.");
    }

    const [existingAttempt] = await db
        .select({ id: quizAttempts.id, startedAt: quizAttempts.startedAt })
        .from(quizAttempts)
        .where(and(
            eq(quizAttempts.studentId, studentId),
            eq(quizAttempts.quizId, quizId),
            eq(quizAttempts.status, "in_progress"),
        ));

    if (existingAttempt) {
        return SuccessResponse(res, {
            message: "Quiz already in progress",
            attempt: existingAttempt,
        });
    }

    const [completedAttempt] = await db
        .select({ id: quizAttempts.id })
        .from(quizAttempts)
        .where(and(
            eq(quizAttempts.studentId, studentId),
            eq(quizAttempts.quizId, quizId),
            eq(quizAttempts.status, "completed"),
        ));

    if (completedAttempt) {
        throw new BadRequest("You have already completed this quiz");
    }

    const attemptId = randomUUID();

    await db.insert(quizAttempts).values({
        id: attemptId,
        studentId,
        quizId,
        status: "in_progress",
    });

    SuccessResponse(res, {
        message: "Quiz started successfully",
        attempt: { id: attemptId, quizId },
    }, 201);
};

export const submitQuiz = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const { quizId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
        throw new BadRequest("Answers must be an array");
    }

    const [attempt] = await db
        .select({ id: quizAttempts.id, startedAt: quizAttempts.startedAt })
        .from(quizAttempts)
        .where(and(
            eq(quizAttempts.studentId, studentId),
            eq(quizAttempts.quizId, quizId),
            eq(quizAttempts.status, "in_progress"),
        ));

    if (!attempt) throw new NotFound("No in-progress quiz attempt found");

    const [quiz] = await db
        .select({ totalScore: quizzes.totalScore, passScore: quizzes.passScore, durationHours: quizzes.durationHours, durationMinutes: quizzes.durationMinutes })
        .from(quizzes)
        .where(eq(quizzes.id, quizId));

    if (!quiz) throw new NotFound("Quiz not found");

    const startedAt = new Date(attempt.startedAt).getTime();
    const now = Date.now();
    const durationMs = ((quiz.durationHours || 0) * 60 * 60 * 1000) + ((quiz.durationMinutes || 0) * 60 * 1000);
    const isTimedOut = durationMs > 0 && (now - startedAt) > durationMs;

    const quizQs = await db
        .select({
            questionId: quizQuestions.questionId,
            answerType: questions.answerType,
        })
        .from(quizQuestions)
        .leftJoin(questions, eq(quizQuestions.questionId, questions.id))
        .where(eq(quizQuestions.quizId, quizId));

    const questionIds = quizQs.map(q => q.questionId);
    
    const totalQuestions = quizQs.length;
    const scorePerQuestion = totalQuestions > 0 ? (quiz.totalScore || 100) / totalQuestions : 0;

    const questionScoreMap = new Map(
        quizQs.map(q => [q.questionId, { score: scorePerQuestion, answerType: q.answerType }])
    );

    let correctOptionMap = new Map();
    if (questionIds.length > 0) {
        const correctOptions = await db
            .select({
                id: questionOptions.id,
                questionId: questionOptions.questionId,
            })
            .from(questionOptions)
            .where(and(
                inArray(questionOptions.questionId, questionIds),
                eq(questionOptions.isCorrect, true),
            ));

        correctOptionMap = new Map(
            correctOptions.map(opt => [opt.questionId, opt.id])
        );
    }

    let totalAchievedScore = 0;
    const answersToInsert: {
        id: string;
        attemptId: string;
        questionId: string;
        selectedOptionId: string | null;
        gridInAnswer: string | null;
        isCorrect: boolean;
        score: number;
    }[] = [];

    for (const answer of answers) {
        const { questionId, selectedOptionId, gridInAnswer } = answer;
        const questionInfo = questionScoreMap.get(questionId);

        if (!questionInfo) continue;

        let isCorrect = false;
        let achievedScore = 0;

        if (questionInfo.answerType === "MCQ" && selectedOptionId) {
            const correctOptionId = correctOptionMap.get(questionId);
            isCorrect = selectedOptionId === correctOptionId;
        }

        if (isCorrect) {
            achievedScore = questionInfo.score;
            totalAchievedScore += achievedScore;
        }

        answersToInsert.push({
            id: randomUUID(),
            attemptId: attempt.id,
            questionId,
            selectedOptionId: selectedOptionId ?? null,
            gridInAnswer: gridInAnswer ?? null,
            isCorrect,
            score: achievedScore,
        });
    }

    const isPassed = totalAchievedScore >= (quiz.passScore || 50);
    const finalStatus = isTimedOut ? "timed_out" : "completed";

    await db.transaction(async (tx) => {
        if (answersToInsert.length > 0) {
            await tx.insert(studentQuizAnswers).values(answersToInsert);
        }

        await tx
            .update(quizAttempts)
            .set({
                endedAt: new Date(),
                score: Math.round(totalAchievedScore),
                isPassed,
                status: finalStatus as any,
            })
            .where(eq(quizAttempts.id, attempt.id));
    });

    SuccessResponse(res, {
        message: isTimedOut ? "Quiz submitted (time exceeded)" : "Quiz submitted successfully",
        result: {
            attemptId: attempt.id,
            score: Math.round(totalAchievedScore),
            totalScore: quiz.totalScore,
            passScore: quiz.passScore,
            isPassed,
            status: finalStatus,
        },
    });
};

export const getQuizzesByLessonId = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const { lessonId } = req.params;

    // 1. Get lesson info to check access
    const [lessonData] = await db
        .select({ 
            id: lessons.id,
            chapterId: lessons.chapterId,
            courseId: lessons.courseId
        })
        .from(lessons)
        .where(eq(lessons.id, lessonId));

    if (!lessonData) {
        throw new NotFound("Lesson not found");
    }

    // 2. Check access
    const hasAccess = await checkAccess(studentId, {
        lessonId: lessonId,
        chapterId: lessonData.chapterId,
        courseId: lessonData.courseId
    });

    if (!hasAccess) {
        throw new BadRequest("You do not have access to this lesson's quizzes. Please purchase the lesson, chapter, or course.");
    }

    // 3. Fetch quizzes for this lesson
    const lessonQuizzes = await db
        .select({
            id: quizzes.id,
            title: quizzes.title,
            description: quizzes.description,
            durationHours: quizzes.durationHours,
            durationMinutes: quizzes.durationMinutes,
            totalScore: quizzes.totalScore,
            quizOrder: quizzes.quizOrder,
        })
        .from(quizzes)
        .where(eq(quizzes.lessonId, lessonId))
        .orderBy(asc(quizzes.quizOrder));

    return SuccessResponse(res, {
        message: "Lesson quizzes fetched successfully",
        quizzes: lessonQuizzes
    }, 200);
};
