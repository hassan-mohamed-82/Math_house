"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizzesByLessonId = exports.submitQuiz = exports.startQuiz = exports.getQuizById = exports.getQuizQuestions = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const crypto_1 = require("crypto");
const checkGridInAnswer_1 = require("../../utils/checkGridInAnswer");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const accessControl_1 = require("../../utils/accessControl");
const getQuizQuestions = async (req, res) => {
    const { quizId } = req.params;
    const [existingQuiz] = await connection_1.db.select().from(schema_1.quizzes).where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, quizId));
    if (!existingQuiz) {
        throw new Errors_1.NotFound("Quiz not found");
    }
    const hasAccess = await (0, accessControl_1.checkAccess)(req.user.id, {
        courseId: existingQuiz.courseId || undefined,
        chapterId: existingQuiz.chapterId || undefined,
        lessonId: existingQuiz.lessonId || undefined
    });
    if (!hasAccess) {
        throw new Errors_1.BadRequest("You do not have access to this quiz. Please purchase the corresponding course, chapter, or lesson.");
    }
    const AllQuizQuestions = await connection_1.db.select({
        id: schema_1.quizQuestions.quizId,
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
    }).from(schema_1.quizQuestions)
        .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.quizQuestions.questionId, schema_1.questions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, quizId))
        .orderBy(schema_1.questions.createdAt);
    const questionIds = AllQuizQuestions.map(q => q.question.id);
    let options = [];
    if (questionIds.length > 0) {
        options = await connection_1.db.select({
            id: schema_1.questionOptions.id,
            questionId: schema_1.questionOptions.questionId,
            answer: schema_1.questionOptions.answer,
            order: schema_1.questionOptions.order,
        }).from(schema_1.questionOptions)
            .where((0, drizzle_orm_1.inArray)(schema_1.questionOptions.questionId, questionIds));
    }
    const formattedQuestions = AllQuizQuestions.map((q) => {
        return {
            ...q.question,
            options: options.filter(o => o.questionId === q.question.id).map(({ questionId, ...rest }) => rest),
        };
    });
    return (0, response_1.SuccessResponse)(res, { message: "Quiz questions retrieved successfully", data: formattedQuestions });
};
exports.getQuizQuestions = getQuizQuestions;
const getQuizById = async (req, res) => {
    const studentId = req.user.id;
    const { quizId } = req.params;
    const [existingQuiz] = await connection_1.db.select().from(schema_1.quizzes).where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, quizId));
    if (!existingQuiz) {
        throw new Errors_1.NotFound("Quiz not found");
    }
    const hasAccess = await (0, accessControl_1.checkAccess)(studentId, {
        courseId: existingQuiz.courseId || undefined,
        chapterId: existingQuiz.chapterId || undefined,
        lessonId: existingQuiz.lessonId || undefined
    });
    if (!hasAccess) {
        throw new Errors_1.BadRequest("You do not have access to this quiz. Please purchase the corresponding course, chapter, or lesson.");
    }
    const [existingAttempt] = await connection_1.db
        .select({
        id: schema_1.quizAttempts.id,
        status: schema_1.quizAttempts.status,
        startedAt: schema_1.quizAttempts.startedAt,
        score: schema_1.quizAttempts.score,
        isPassed: schema_1.quizAttempts.isPassed,
    })
        .from(schema_1.quizAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quizAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.quizAttempts.quizId, quizId)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.quizAttempts.startedAt));
    const questionsCount = await connection_1.db
        .select()
        .from(schema_1.quizQuestions)
        .where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, quizId));
    (0, response_1.SuccessResponse)(res, {
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
exports.getQuizById = getQuizById;
const startQuiz = async (req, res) => {
    const studentId = req.user.id;
    const { quizId } = req.params;
    const [existingQuiz] = await connection_1.db.select().from(schema_1.quizzes).where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, quizId));
    if (!existingQuiz)
        throw new Errors_1.NotFound("Quiz not found");
    if (!existingQuiz.isActive)
        throw new Errors_1.BadRequest("Quiz is not active");
    const hasAccess = await (0, accessControl_1.checkAccess)(studentId, {
        courseId: existingQuiz.courseId || undefined,
        chapterId: existingQuiz.chapterId || undefined,
        lessonId: existingQuiz.lessonId || undefined
    });
    if (!hasAccess) {
        throw new Errors_1.BadRequest("You do not have access to this quiz.");
    }
    const [existingAttempt] = await connection_1.db
        .select({ id: schema_1.quizAttempts.id, startedAt: schema_1.quizAttempts.startedAt })
        .from(schema_1.quizAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quizAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.quizAttempts.quizId, quizId), (0, drizzle_orm_1.eq)(schema_1.quizAttempts.status, "in_progress")));
    if (existingAttempt) {
        return (0, response_1.SuccessResponse)(res, {
            message: "Quiz already in progress",
            attempt: existingAttempt,
        });
    }
    const [passedAttempt] = await connection_1.db
        .select({ id: schema_1.quizAttempts.id })
        .from(schema_1.quizAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quizAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.quizAttempts.quizId, quizId), (0, drizzle_orm_1.inArray)(schema_1.quizAttempts.status, ["completed", "timed_out"]), (0, drizzle_orm_1.eq)(schema_1.quizAttempts.isPassed, true)));
    if (passedAttempt) {
        throw new Errors_1.BadRequest("You have already passed this quiz. You cannot take it again.");
    }
    const attemptId = (0, crypto_1.randomUUID)();
    await connection_1.db.insert(schema_1.quizAttempts).values({
        id: attemptId,
        studentId,
        quizId,
        status: "in_progress",
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Quiz started successfully",
        attempt: { id: attemptId, quizId },
    }, 201);
};
exports.startQuiz = startQuiz;
const submitQuiz = async (req, res) => {
    const studentId = req.user.id;
    const { quizId } = req.params;
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
        throw new Errors_1.BadRequest("Answers must be an array");
    }
    const [attempt] = await connection_1.db
        .select({ id: schema_1.quizAttempts.id, startedAt: schema_1.quizAttempts.startedAt })
        .from(schema_1.quizAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quizAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.quizAttempts.quizId, quizId), (0, drizzle_orm_1.eq)(schema_1.quizAttempts.status, "in_progress")));
    if (!attempt)
        throw new Errors_1.NotFound("No in-progress quiz attempt found");
    const [quiz] = await connection_1.db
        .select({ totalScore: schema_1.quizzes.totalScore, passScore: schema_1.quizzes.passScore, durationHours: schema_1.quizzes.durationHours, durationMinutes: schema_1.quizzes.durationMinutes })
        .from(schema_1.quizzes)
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, quizId));
    if (!quiz)
        throw new Errors_1.NotFound("Quiz not found");
    const startedAt = new Date(attempt.startedAt).getTime();
    const now = Date.now();
    const durationMs = ((quiz.durationHours || 0) * 60 * 60 * 1000) + ((quiz.durationMinutes || 0) * 60 * 1000);
    const isTimedOut = durationMs > 0 && (now - startedAt) > durationMs;
    const quizQs = await connection_1.db
        .select({
        questionId: schema_1.quizQuestions.questionId,
        answerType: schema_1.questions.answerType,
    })
        .from(schema_1.quizQuestions)
        .leftJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.quizQuestions.questionId, schema_1.questions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, quizId));
    const questionIds = quizQs.map(q => q.questionId);
    const totalQuestions = quizQs.length;
    const scorePerQuestion = totalQuestions > 0 ? (quiz.totalScore || 100) / totalQuestions : 0;
    const questionScoreMap = new Map(quizQs.map(q => [q.questionId, { score: scorePerQuestion, answerType: q.answerType }]));
    let correctOptionMap = new Map();
    if (questionIds.length > 0) {
        const correctOptions = await connection_1.db
            .select({
            id: schema_1.questionOptions.id,
            questionId: schema_1.questionOptions.questionId,
            answer: schema_1.questionOptions.answer,
        })
            .from(schema_1.questionOptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.questionOptions.questionId, questionIds), (0, drizzle_orm_1.eq)(schema_1.questionOptions.isCorrect, true)));
        // Use array to support multiple correct options
        const groupedOptions = new Map();
        for (const opt of correctOptions) {
            if (!groupedOptions.has(opt.questionId)) {
                groupedOptions.set(opt.questionId, []);
            }
            groupedOptions.get(opt.questionId).push(opt);
        }
        correctOptionMap = groupedOptions;
    }
    let totalAchievedScore = 0;
    const answersToInsert = [];
    for (const answer of answers) {
        const { questionId, selectedOptionId, gridInAnswer } = answer;
        const questionInfo = questionScoreMap.get(questionId);
        if (!questionInfo)
            continue;
        let isCorrect = false;
        let achievedScore = 0;
        if (questionInfo.answerType === "MCQ" && selectedOptionId) {
            const correctOpts = correctOptionMap.get(questionId) || [];
            isCorrect = correctOpts.some((opt) => opt.id === selectedOptionId);
        }
        else if (questionInfo.answerType === "Grid in" && gridInAnswer) {
            const correctOpts = correctOptionMap.get(questionId) || [];
            isCorrect = correctOpts.some((opt) => (0, checkGridInAnswer_1.isEquivalentGridInAnswer)(gridInAnswer, opt.answer));
        }
        if (isCorrect) {
            achievedScore = questionInfo.score;
            totalAchievedScore += achievedScore;
        }
        answersToInsert.push({
            id: (0, crypto_1.randomUUID)(),
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
    await connection_1.db.transaction(async (tx) => {
        if (answersToInsert.length > 0) {
            await tx.insert(schema_1.studentQuizAnswers).values(answersToInsert);
        }
        await tx
            .update(schema_1.quizAttempts)
            .set({
            endedAt: new Date(),
            score: Math.round(totalAchievedScore),
            isPassed,
            status: finalStatus,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.quizAttempts.id, attempt.id));
    });
    (0, response_1.SuccessResponse)(res, {
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
exports.submitQuiz = submitQuiz;
const getQuizzesByLessonId = async (req, res) => {
    const studentId = req.user.id;
    const { lessonId } = req.params;
    // 1. Get lesson info to check access
    const [lessonData] = await connection_1.db
        .select({
        id: schema_1.lessons.id,
        chapterId: schema_1.lessons.chapterId,
        courseId: schema_1.lessons.courseId
    })
        .from(schema_1.lessons)
        .where((0, drizzle_orm_1.eq)(schema_1.lessons.id, lessonId));
    if (!lessonData) {
        throw new Errors_1.NotFound("Lesson not found");
    }
    // 2. Check access
    const hasAccess = await (0, accessControl_1.checkAccess)(studentId, {
        lessonId: lessonId,
        chapterId: lessonData.chapterId,
        courseId: lessonData.courseId
    });
    if (!hasAccess) {
        throw new Errors_1.BadRequest("You do not have access to this lesson's quizzes. Please purchase the lesson, chapter, or course.");
    }
    // 3. Fetch quizzes for this lesson
    const lessonQuizzes = await connection_1.db
        .select({
        id: schema_1.quizzes.id,
        title: schema_1.quizzes.title,
        description: schema_1.quizzes.description,
        durationHours: schema_1.quizzes.durationHours,
        durationMinutes: schema_1.quizzes.durationMinutes,
        totalScore: schema_1.quizzes.totalScore,
        quizOrder: schema_1.quizzes.quizOrder,
    })
        .from(schema_1.quizzes)
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.lessonId, lessonId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.quizzes.quizOrder));
    return (0, response_1.SuccessResponse)(res, {
        message: "Lesson quizzes fetched successfully",
        quizzes: lessonQuizzes
    }, 200);
};
exports.getQuizzesByLessonId = getQuizzesByLessonId;
