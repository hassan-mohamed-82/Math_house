"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiagnosticAttemptRecommendations = exports.getDiagnosticAttemptReview = exports.getStudentAttempts = exports.submitDiagnosticExamReq = exports.startDiagnosticExamReq = exports.getDiagnosticExamQuestions = exports.getDiagnosticExamById = exports.getDiagnosticExams = exports.submitDiagnosticExam = exports.startDiagnosticExam = void 0;
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const Errors_1 = require("../../Errors");
// -----------------------------------------
const startDiagnosticExam = async (studentId, examId) => {
    const [exam] = await connection_1.db
        .select({ duration: schema_1.diagnosticExam.duration })
        .from(schema_1.diagnosticExam)
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.id, examId));
    if (!exam) {
        throw new Error("Diagnostic exam not found");
    }
    const now = new Date();
    const endTime = new Date(now.getTime() + exam.duration * 60 * 1000);
    const attemptId = (0, crypto_1.randomUUID)();
    await connection_1.db.insert(schema_1.diagnosticExamAttempt).values({
        id: attemptId,
        studentId: studentId,
        diagnosticExamId: examId,
        startedAt: now,
        endedAt: endTime,
    });
    return { message: "Exam started", attemptId, endTime };
};
exports.startDiagnosticExam = startDiagnosticExam;
const submitDiagnosticExam = async (studentId, attemptId, answers) => {
    const [attempt] = await connection_1.db
        .select()
        .from(schema_1.diagnosticExamAttempt)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.diagnosticExamAttempt.id, attemptId), (0, drizzle_orm_1.eq)(schema_1.diagnosticExamAttempt.studentId, studentId) // Ensure it belongs to the authenticated user
    ));
    if (!attempt) {
        throw new Error("No active exam attempt found");
    }
    if (attempt.isCompleted) {
        throw new Error("This exam attempt has already been submitted");
    }
    const now = new Date();
    if (attempt.endedAt && now > attempt.endedAt) {
        // Auto-close the attempt with 0 score if time expired
        await connection_1.db.update(schema_1.diagnosticExamAttempt)
            .set({
            score: 0,
            isCompleted: true,
            endedAt: attempt.endedAt // keep the original end time
        })
            .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamAttempt.id, attempt.id));
        throw new Error("Exam time limit exceeded. Attempt has been automatically closed.");
    }
    const [exam] = await connection_1.db
        .select({
        numberOfQuestions: schema_1.diagnosticExam.numberOfQuestions,
        rawScore: {
            score: schema_1.rawScore.score,
            is_giftingScore: schema_1.rawScore.is_giftingScore,
            giftingScore: schema_1.rawScore.giftingScore,
        }
    })
        .from(schema_1.diagnosticExam)
        .leftJoin(schema_1.rawScore, (0, drizzle_orm_1.eq)(schema_1.diagnosticExam.rawScoreId, schema_1.rawScore.id))
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.id, attempt.diagnosticExamId));
    if (!exam) {
        throw new Error("Diagnostic exam not found");
    }
    let gradePerQuestion = 0;
    if (exam.rawScore) {
        const calculatedTotalScore = exam.rawScore.score - (exam.rawScore.is_giftingScore ? exam.rawScore.giftingScore : 0);
        gradePerQuestion = exam.numberOfQuestions > 0 ? calculatedTotalScore / exam.numberOfQuestions : 0;
    }
    let finalScore = 0;
    // Fetch all questions for this exam to ensure unanswered ones are marked incorrect
    const examQuestions = await connection_1.db
        .select({
        questionId: schema_1.diagnosticExamQuestions.questionId,
        answerType: schema_1.questions.answerType,
    })
        .from(schema_1.diagnosticExamQuestions)
        .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.diagnosticExamQuestions.questionId, schema_1.questions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamQuestions.diagnosticExamId, attempt.diagnosticExamId));
    for (const examQuestion of examQuestions) {
        let isCorrect = false;
        let studentAnswerId = null;
        let studentGridInAnswer = null;
        // Find if the student submitted an answer for this question
        const submittedAnswer = answers.find(a => a.questionId === examQuestion.questionId);
        if (submittedAnswer) {
            if (examQuestion.answerType === "MCQ" && submittedAnswer.answerId) {
                studentAnswerId = submittedAnswer.answerId;
                // Check if the selected option is correct
                const [selectedOption] = await connection_1.db
                    .select({ isCorrect: schema_1.questionOptions.isCorrect })
                    .from(schema_1.questionOptions)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.questionOptions.id, studentAnswerId), (0, drizzle_orm_1.eq)(schema_1.questionOptions.questionId, examQuestion.questionId)));
                if (selectedOption && selectedOption.isCorrect) {
                    isCorrect = true;
                }
            }
            else if (examQuestion.answerType === "Grid in" && submittedAnswer.textValue) {
                studentGridInAnswer = submittedAnswer.textValue;
                // Check grid in text value against correct options
                const correctOptions = await connection_1.db
                    .select({ answer: schema_1.questionOptions.answer })
                    .from(schema_1.questionOptions)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.questionOptions.questionId, examQuestion.questionId), (0, drizzle_orm_1.eq)(schema_1.questionOptions.isCorrect, true)));
                // Allow if text matches any valid correct grid-in answer (case-insensitive trim)
                const normalizedSubmit = studentGridInAnswer.trim().toLowerCase();
                isCorrect = correctOptions.some(opt => opt.answer.trim().toLowerCase() === normalizedSubmit);
            }
        }
        // If no submittedAnswer is found, isCorrect remains false 
        if (isCorrect) {
            finalScore += gradePerQuestion;
        }
        // Save student answer metadata (including blank/unanswered questions as incorrect)
        await connection_1.db.insert(schema_1.studentDiagnosticAnswers).values({
            id: (0, crypto_1.randomUUID)(),
            attemptId: attempt.id,
            questionId: examQuestion.questionId,
            studentAnswerId: studentAnswerId,
            studentGridInAnswer: studentGridInAnswer,
            isCorrect: isCorrect,
        });
    }
    // 4. Finalize the attempt
    await connection_1.db.update(schema_1.diagnosticExamAttempt)
        .set({
        score: Math.round(finalScore),
        isCompleted: true,
        endedAt: new Date() // Record actual finish time
    })
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamAttempt.id, attempt.id));
};
exports.submitDiagnosticExam = submitDiagnosticExam;
// ------------------------------
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
const getDiagnosticExamQuestions = async (req, res) => {
    const { id } = req.params;
    // Fetch the mapping and the basic question details without pagination
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
        // Order by creation time to ensure consistent ordering
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
    });
};
exports.getDiagnosticExamQuestions = getDiagnosticExamQuestions;
const startDiagnosticExamReq = async (req, res) => {
    const studentId = req.user?.id;
    if (!studentId)
        throw new Errors_1.BadRequest("Not authenticated");
    const { examId } = req.params;
    const result = await (0, exports.startDiagnosticExam)(studentId, examId);
    return (0, response_1.SuccessResponse)(res, result, 200);
};
exports.startDiagnosticExamReq = startDiagnosticExamReq;
const submitDiagnosticExamReq = async (req, res) => {
    const studentId = req.user?.id;
    if (!studentId)
        throw new Errors_1.BadRequest("Not authenticated");
    const { attemptId } = req.params;
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
        throw new Errors_1.BadRequest("Answers array is required");
    }
    try {
        await (0, exports.submitDiagnosticExam)(studentId, attemptId, answers);
        return (0, response_1.SuccessResponse)(res, { message: "Diagnostic Exam Submitted successfully." }, 200);
    }
    catch (error) {
        throw new Errors_1.BadRequest(error.message);
    }
};
exports.submitDiagnosticExamReq = submitDiagnosticExamReq;
const getStudentAttempts = async (req, res) => {
    const studentId = req.user?.id;
    if (!studentId)
        throw new Errors_1.BadRequest("Not authenticated");
    const attempts = await connection_1.db
        .select({
        id: schema_1.diagnosticExamAttempt.id,
        diagnosticExamId: schema_1.diagnosticExamAttempt.diagnosticExamId,
        isCompleted: schema_1.diagnosticExamAttempt.isCompleted,
        startedAt: schema_1.diagnosticExamAttempt.startedAt,
        endedAt: schema_1.diagnosticExamAttempt.endedAt,
        diagnosticExam: {
            id: schema_1.diagnosticExam.id,
            title: schema_1.diagnosticExam.title,
            description: schema_1.diagnosticExam.description
        }
    })
        .from(schema_1.diagnosticExamAttempt)
        .leftJoin(schema_1.diagnosticExam, (0, drizzle_orm_1.eq)(schema_1.diagnosticExamAttempt.diagnosticExamId, schema_1.diagnosticExam.id))
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamAttempt.studentId, studentId))
        .orderBy(schema_1.diagnosticExamAttempt.startedAt);
    return (0, response_1.SuccessResponse)(res, {
        message: "Attempts retrieved successfully",
        data: attempts
    }, 200);
};
exports.getStudentAttempts = getStudentAttempts;
const getDiagnosticAttemptReview = async (req, res) => {
    const { attemptId } = req.params;
    const allAnswers = await connection_1.db
        .select({
        questionId: schema_1.studentDiagnosticAnswers.questionId,
        studentAnswerId: schema_1.studentDiagnosticAnswers.studentAnswerId,
        studentGridInAnswer: schema_1.studentDiagnosticAnswers.studentGridInAnswer,
        isCorrect: schema_1.studentDiagnosticAnswers.isCorrect, // ضفنا دي عشان نعرف السؤال صح ولا غلط
        questionText: schema_1.questions.question,
        questionImage: schema_1.questions.image,
        answerType: schema_1.questions.answerType,
        correctOptionId: schema_1.questionOptions.id,
        correctOptionAnswer: schema_1.questionOptions.answer,
        explanationPdf: schema_1.questionAnswers.pdf,
        explanationVideo: schema_1.questionAnswers.video,
    })
        .from(schema_1.studentDiagnosticAnswers)
        .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.studentDiagnosticAnswers.questionId, schema_1.questions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.studentDiagnosticAnswers.attemptId, attemptId)
    // شيلنا شرط (isCorrect, false) عشان يجيب كله
    )
        .leftJoin(schema_1.questionOptions, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.questionOptions.questionId, schema_1.studentDiagnosticAnswers.questionId), (0, drizzle_orm_1.eq)(schema_1.questionOptions.isCorrect, true)))
        .leftJoin(schema_1.questionAnswers, (0, drizzle_orm_1.eq)(schema_1.questionAnswers.questionId, schema_1.studentDiagnosticAnswers.questionId));
    const uniqueAnswersMap = new Map();
    for (const ans of allAnswers) {
        if (!uniqueAnswersMap.has(ans.questionId)) {
            uniqueAnswersMap.set(ans.questionId, {
                questionId: ans.questionId,
                questionText: ans.questionText,
                questionImage: ans.questionImage,
                answerType: ans.answerType,
                isCorrect: ans.isCorrect, // بتظهر هنا في النتيجة النهائية
                studentSubmittedMCQId: ans.studentAnswerId,
                studentSubmittedGridInText: ans.studentGridInAnswer,
                correctAnswers: [],
                explanationContent: {
                    pdf: ans.explanationPdf,
                    video: ans.explanationVideo
                }
            });
        }
        if (ans.correctOptionAnswer) {
            uniqueAnswersMap.get(ans.questionId).correctAnswers.push({
                optionId: ans.correctOptionId,
                answerText: ans.correctOptionAnswer
            });
        }
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Diagnostic Exam Review retrieved successfully",
        data: Array.from(uniqueAnswersMap.values())
    }, 200);
};
exports.getDiagnosticAttemptReview = getDiagnosticAttemptReview;
const getDiagnosticAttemptRecommendations = async (req, res) => {
    const { attemptId } = req.params;
    // Fetch wrong answers for this attempt and group by lessonId to see what to study
    const wrongAnswerLessons = await connection_1.db
        .select({
        lessonId: schema_1.lessons.id,
        lessonName: schema_1.lessons.name,
        chapterId: schema_1.chapters.id,
        chapterName: schema_1.chapters.name,
        courseId: schema_1.courses.id,
        courseName: schema_1.courses.name,
    })
        .from(schema_1.studentDiagnosticAnswers)
        .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.studentDiagnosticAnswers.questionId, schema_1.questions.id))
        .innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.questions.lessonId, schema_1.lessons.id))
        .innerJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
        .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.lessons.courseId, schema_1.courses.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.studentDiagnosticAnswers.attemptId, attemptId), (0, drizzle_orm_1.eq)(schema_1.studentDiagnosticAnswers.isCorrect, false)));
    // Extract unique lesson details that student got wrong
    const uniqueLessonsMap = new Map();
    for (const item of wrongAnswerLessons) {
        if (!uniqueLessonsMap.has(item.lessonId)) {
            uniqueLessonsMap.set(item.lessonId, {
                lessonId: item.lessonId,
                lessonName: item.lessonName,
                chapter: {
                    id: item.chapterId,
                    name: item.chapterName
                },
                course: {
                    id: item.courseId,
                    name: item.courseName
                }
            });
        }
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Diagnostic Exam Recommendations generated successfully",
        data: {
            recommendedLessonsToStudy: Array.from(uniqueLessonsMap.values())
        }
    }, 200);
};
exports.getDiagnosticAttemptRecommendations = getDiagnosticAttemptRecommendations;
