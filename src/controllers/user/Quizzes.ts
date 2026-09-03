import { Request, Response } from "express";
import { eq, and, inArray, asc, desc, or, isNull, gt, sql } from "drizzle-orm";
import { db } from "../../models/connection";
import { quizzes, questions, quizQuestions, questionOptions, quizAttempts, studentQuizAnswers, lessons, Student, enrolledItems, chapters, courses } from "../../models/schema";
import { randomUUID } from "crypto";
import { isEquivalentGridInAnswer } from "../../utils/checkGridInAnswer";
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
        ))
        .orderBy(desc(quizAttempts.startedAt));

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

    const [passedAttempt] = await db
        .select({ id: quizAttempts.id })
        .from(quizAttempts)
        .where(and(
            eq(quizAttempts.studentId, studentId),
            eq(quizAttempts.quizId, quizId),
            inArray(quizAttempts.status, ["completed", "timed_out"]),
            eq(quizAttempts.isPassed, true)
        ));

    if (passedAttempt) {
        throw new BadRequest("You have already passed this quiz. You cannot take it again.");
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
                answer: questionOptions.answer,
            })
            .from(questionOptions)
            .where(and(
                inArray(questionOptions.questionId, questionIds),
                eq(questionOptions.isCorrect, true),
            ));

        // Use array to support multiple correct options
        const groupedOptions = new Map<string, any[]>();
        for (const opt of correctOptions) {
            if (!groupedOptions.has(opt.questionId)) {
                groupedOptions.set(opt.questionId, []);
            }
            groupedOptions.get(opt.questionId)!.push(opt);
        }
        correctOptionMap = groupedOptions;
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
            const correctOpts = correctOptionMap.get(questionId) || [];
            isCorrect = correctOpts.some((opt: any) => opt.id === selectedOptionId);
        } else if (questionInfo.answerType === "Grid in" && gridInAnswer) {
            const correctOpts = correctOptionMap.get(questionId) || [];
            isCorrect = correctOpts.some((opt: any) => isEquivalentGridInAnswer(gridInAnswer, opt.answer));
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

export const getRemainingHomework = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const { lessonId } = req.query as { lessonId?: string };

    const [existingStudent] = await db.select().from(Student).where(eq(Student.id, studentId));
    if (!existingStudent) {
        throw new NotFound("Student not found");
    }

    let accessibleLessons: {
        id: string;
        name: string;
        order: number;
        chapterId: string;
        courseId: string;
    }[] = [];

    if (lessonId) {
        // 1. Specific lesson requested
        const [lessonData] = await db
            .select({
                id: lessons.id,
                name: lessons.name,
                order: lessons.order,
                chapterId: lessons.chapterId,
                courseId: lessons.courseId,
            })
            .from(lessons)
            .where(eq(lessons.id, lessonId));

        if (!lessonData) {
            throw new NotFound("Lesson not found");
        }

        const hasAccess = await checkAccess(studentId, {
            lessonId,
            chapterId: lessonData.chapterId,
            courseId: lessonData.courseId,
        });

        if (!hasAccess) {
            throw new BadRequest("You do not have access to this lesson's homework. Please purchase the lesson, chapter, or course.");
        }

        accessibleLessons = [lessonData];
    } else {
        // 2. Fetch all active enrollments for the student
        const now = new Date();
        const activeEnrollments = await db
            .select({
                courseId: enrolledItems.courseId,
                semesterId: enrolledItems.semesterId,
                chapterId: enrolledItems.chapterId,
                lessonId: enrolledItems.lessonId,
            })
            .from(enrolledItems)
            .where(
                and(
                    eq(enrolledItems.studentId, studentId),
                    eq(enrolledItems.status, "active"),
                    or(
                        isNull(enrolledItems.expiresAt),
                        gt(enrolledItems.expiresAt, now)
                    )
                )
            );

        if (activeEnrollments.length === 0) {
            return SuccessResponse(res, {
                message: "No remaining homework found",
                summary: {
                    total: 0,
                    solved: 0,
                    remaining: 0,
                },
                count: 0,
                quizzes: [],
            }, 200);
        }

        const enrolledLessonIds = activeEnrollments.map(e => e.lessonId).filter((id): id is string => !!id);
        const enrolledChapterIds = activeEnrollments.map(e => e.chapterId).filter((id): id is string => !!id);
        const enrolledSemesterIds = activeEnrollments.map(e => e.semesterId).filter((id): id is string => !!id);
        const enrolledCourseIds = activeEnrollments.map(e => e.courseId).filter((id): id is string => !!id);

        const orConditions = [];
        if (enrolledLessonIds.length > 0) {
            orConditions.push(inArray(lessons.id, enrolledLessonIds));
        }
        if (enrolledChapterIds.length > 0) {
            orConditions.push(inArray(lessons.chapterId, enrolledChapterIds));
        }
        if (enrolledCourseIds.length > 0) {
            orConditions.push(inArray(lessons.courseId, enrolledCourseIds));
        }
        if (enrolledSemesterIds.length > 0) {
            const semesterChapters = await db
                .select({ id: chapters.id })
                .from(chapters)
                .where(inArray(chapters.semesterId, enrolledSemesterIds));
            const semesterChapterIds = semesterChapters.map(c => c.id);
            if (semesterChapterIds.length > 0) {
                orConditions.push(inArray(lessons.chapterId, semesterChapterIds));
            }
        }

        if (orConditions.length === 0) {
            return SuccessResponse(res, {
                message: "No remaining homework found",
                summary: {
                    total: 0,
                    solved: 0,
                    remaining: 0,
                },
                count: 0,
                quizzes: [],
            }, 200);
        }

        accessibleLessons = await db
            .select({
                id: lessons.id,
                name: lessons.name,
                order: lessons.order,
                chapterId: lessons.chapterId,
                courseId: lessons.courseId,
            })
            .from(lessons)
            .where(or(...orConditions));
    }

    if (accessibleLessons.length === 0) {
        return SuccessResponse(res, {
            message: "No remaining homework found",
            summary: {
                total: 0,
                solved: 0,
                remaining: 0,
            },
            count: 0,
            quizzes: [],
        }, 200);
    }

    const accessibleLessonIds = accessibleLessons.map(l => l.id);

    // 3. Fetch all active quizzes linked to these accessible lessons
    const homeworkQuizzes = await db
        .select({
            id: quizzes.id,
            title: quizzes.title,
            description: quizzes.description,
            durationHours: quizzes.durationHours,
            durationMinutes: quizzes.durationMinutes,
            totalScore: quizzes.totalScore,
            passScore: quizzes.passScore,
            quizOrder: quizzes.quizOrder,
            lessonId: quizzes.lessonId,
            chapterId: quizzes.chapterId,
            courseId: quizzes.courseId,
        })
        .from(quizzes)
        .where(
            and(
                eq(quizzes.isActive, true),
                inArray(quizzes.lessonId, accessibleLessonIds)
            )
        )
        .orderBy(asc(quizzes.quizOrder));

    if (homeworkQuizzes.length === 0) {
        return SuccessResponse(res, {
            message: "No remaining homework found",
            summary: {
                total: 0,
                solved: 0,
                remaining: 0,
            },
            count: 0,
            quizzes: [],
        }, 200);
    }

    const quizIds = homeworkQuizzes.map(q => q.id);

    // 4. Fetch student attempts for these quizzes
    const attempts = await db
        .select({
            id: quizAttempts.id,
            quizId: quizAttempts.quizId,
            status: quizAttempts.status,
            score: quizAttempts.score,
            isPassed: quizAttempts.isPassed,
            startedAt: quizAttempts.startedAt,
            endedAt: quizAttempts.endedAt,
        })
        .from(quizAttempts)
        .where(
            and(
                eq(quizAttempts.studentId, studentId),
                inArray(quizAttempts.quizId, quizIds)
            )
        )
        .orderBy(desc(quizAttempts.startedAt));

    // A quiz is solved if there is any attempt with status 'completed' or 'timed_out' (or isPassed = true)
    const solvedQuizIds = new Set(
        attempts
            .filter(a => a.status === "completed" || a.status === "timed_out" || a.isPassed === true)
            .map(a => a.quizId)
    );

    // In-progress attempt lookup
    const inProgressAttemptsMap = new Map<string, typeof attempts[0]>();
    attempts.forEach(a => {
        if (a.status === "in_progress" && !inProgressAttemptsMap.has(a.quizId)) {
            inProgressAttemptsMap.set(a.quizId, a);
        }
    });

    const remainingQuizzes = homeworkQuizzes.filter(q => !solvedQuizIds.has(q.id));
    const solvedQuizzesCount = homeworkQuizzes.filter(q => solvedQuizIds.has(q.id)).length;

    const summary = {
        total: homeworkQuizzes.length,
        solved: solvedQuizzesCount,
        remaining: remainingQuizzes.length,
    };

    if (remainingQuizzes.length === 0) {
        return SuccessResponse(res, {
            message: "All homework quizzes have been solved!",
            summary,
            count: 0,
            quizzes: [],
        }, 200);
    }

    const remainingQuizIds = remainingQuizzes.map(q => q.id);

    // 5. Fetch question counts
    const questionsCountRows = await db
        .select({
            quizId: quizQuestions.quizId,
            count: sql<number>`count(${quizQuestions.id})`
        })
        .from(quizQuestions)
        .where(inArray(quizQuestions.quizId, remainingQuizIds))
        .groupBy(quizQuestions.quizId);

    const questionsCountMap = new Map<string, number>(
        questionsCountRows.map(r => [r.quizId, Number(r.count)])
    );

    // 6. Gather chapter & course names
    const chapterIds = Array.from(
        new Set(
            remainingQuizzes
                .map(q => q.chapterId)
                .concat(accessibleLessons.map(l => l.chapterId))
                .filter((id): id is string => !!id)
        )
    );
    const courseIds = Array.from(
        new Set(
            remainingQuizzes
                .map(q => q.courseId)
                .concat(accessibleLessons.map(l => l.courseId))
                .filter((id): id is string => !!id)
        )
    );

    const chaptersMap = new Map<string, { id: string; name: string }>();
    if (chapterIds.length > 0) {
        const chapterRows = await db
            .select({ id: chapters.id, name: chapters.name })
            .from(chapters)
            .where(inArray(chapters.id, chapterIds));
        chapterRows.forEach(c => chaptersMap.set(c.id, c));
    }

    const coursesMap = new Map<string, { id: string; name: string }>();
    if (courseIds.length > 0) {
        const courseRows = await db
            .select({ id: courses.id, name: courses.name })
            .from(courses)
            .where(inArray(courses.id, courseIds));
        courseRows.forEach(c => coursesMap.set(c.id, c));
    }

    const lessonsMap = new Map<string, typeof accessibleLessons[0]>(
        accessibleLessons.map(l => [l.id, l])
    );

    const formattedQuizzes = remainingQuizzes.map(quiz => {
        const lesson = quiz.lessonId ? lessonsMap.get(quiz.lessonId) : null;
        const chapterId = quiz.chapterId || lesson?.chapterId;
        const courseId = quiz.courseId || lesson?.courseId;
        const inProgress = inProgressAttemptsMap.get(quiz.id);

        return {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            durationHours: quiz.durationHours,
            durationMinutes: quiz.durationMinutes,
            totalScore: quiz.totalScore,
            passScore: quiz.passScore,
            quizOrder: quiz.quizOrder,
            questionsCount: questionsCountMap.get(quiz.id) || 0,
            attemptStatus: inProgress ? "in_progress" : "not_attempted",
            attempt: inProgress
                ? {
                    id: inProgress.id,
                    startedAt: inProgress.startedAt,
                    status: inProgress.status,
                }
                : null,
            lesson: lesson
                ? {
                    id: lesson.id,
                    name: lesson.name,
                    order: lesson.order,
                }
                : null,
            chapter: chapterId ? chaptersMap.get(chapterId) ?? null : null,
            course: courseId ? coursesMap.get(courseId) ?? null : null,
        };
    });

    return SuccessResponse(res, {
        message: "Remaining homework retrieved successfully",
        summary,
        count: formattedQuizzes.length,
        quizzes: formattedQuizzes,
    }, 200);
};
