import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { db } from "../../models/connection";
import { courses, diagnosticExam, diagnosticExamQuestions, questions, questionOptions, diagnosticExamAttempt, studentDiagnosticAnswers, rawScore, questionAnswers, lessons, chapters } from "../../models/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BadRequest } from "../../Errors";
// -----------------------------------------
export const startDiagnosticExam = async (studentId: string, examId: string) => {
    const [exam] = await db
        .select({ duration: diagnosticExam.duration })
        .from(diagnosticExam)
        .where(eq(diagnosticExam.id, examId));
    if (!exam) {
        throw new Error("Diagnostic exam not found");
    }
    const now = new Date();
    const endTime = new Date(now.getTime() + exam.duration * 60 * 1000);
    const attemptId = randomUUID();

    await db.insert(diagnosticExamAttempt).values({
        id: attemptId,
        studentId: studentId,
        diagnosticExamId: examId,
        startedAt: now,
        endedAt: endTime,
    });
    return { message: "Exam started", attemptId, endTime };
};
export const submitDiagnosticExam = async (studentId: string, attemptId: string, answers: { questionId: string; answerId?: string; textValue?: string }[]) => {
    const [attempt] = await db
        .select()
        .from(diagnosticExamAttempt)
        .where(
            and(
                eq(diagnosticExamAttempt.id, attemptId),
                eq(diagnosticExamAttempt.studentId, studentId) // Ensure it belongs to the authenticated user
            )
        );

    if (!attempt) {
        throw new Error("No active exam attempt found");
    }

    if (attempt.isCompleted) {
        throw new Error("This exam attempt has already been submitted");
    }

    const now = new Date();
    if (attempt.endedAt && now > attempt.endedAt) {
        // Auto-close the attempt with 0 score if time expired
        await db.update(diagnosticExamAttempt)
            .set({
                score: 0,
                isCompleted: true,
                endedAt: attempt.endedAt // keep the original end time
            })
            .where(eq(diagnosticExamAttempt.id, attempt.id));

        throw new Error("Exam time limit exceeded. Attempt has been automatically closed.");
    }

    const [exam] = await db
        .select({
            numberOfQuestions: diagnosticExam.numberOfQuestions,
            rawScore: {
                score: rawScore.score,
                is_giftingScore: rawScore.is_giftingScore,
                giftingScore: rawScore.giftingScore,
            }
        })
        .from(diagnosticExam)
        .leftJoin(rawScore, eq(diagnosticExam.rawScoreId, rawScore.id))
        .where(eq(diagnosticExam.id, attempt.diagnosticExamId));

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
    const examQuestions = await db
        .select({
            questionId: diagnosticExamQuestions.questionId,
            answerType: questions.answerType,
        })
        .from(diagnosticExamQuestions)
        .innerJoin(questions, eq(diagnosticExamQuestions.questionId, questions.id))
        .where(eq(diagnosticExamQuestions.diagnosticExamId, attempt.diagnosticExamId));

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
                const [selectedOption] = await db
                    .select({ isCorrect: questionOptions.isCorrect })
                    .from(questionOptions)
                    .where(
                        and(
                            eq(questionOptions.id, studentAnswerId),
                            eq(questionOptions.questionId, examQuestion.questionId)
                        )
                    );

                if (selectedOption && selectedOption.isCorrect) {
                    isCorrect = true;
                }
            } else if (examQuestion.answerType === "Grid in" && submittedAnswer.textValue) {
                studentGridInAnswer = submittedAnswer.textValue;
                // Check grid in text value against correct options
                const correctOptions = await db
                    .select({ answer: questionOptions.answer })
                    .from(questionOptions)
                    .where(
                        and(
                            eq(questionOptions.questionId, examQuestion.questionId),
                            eq(questionOptions.isCorrect, true)
                        )
                    );

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
        await db.insert(studentDiagnosticAnswers).values({
            id: randomUUID(),
            attemptId: attempt.id,
            questionId: examQuestion.questionId,
            studentAnswerId: studentAnswerId,
            studentGridInAnswer: studentGridInAnswer,
            isCorrect: isCorrect,
        });
    }

    // 4. Finalize the attempt
    await db.update(diagnosticExamAttempt)
        .set({
            score: Math.round(finalScore),
            isCompleted: true,
            endedAt: new Date() // Record actual finish time
        })
        .where(eq(diagnosticExamAttempt.id, attempt.id));
};
// ------------------------------
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

export const getDiagnosticExamQuestions = async (req: Request, res: Response) => {
    const { id } = req.params;

    // Fetch the mapping and the basic question details without pagination
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
        // Order by creation time to ensure consistent ordering
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
    });
};

export const startDiagnosticExamReq = async (req: Request, res: Response) => {
    const studentId = req.user?.id;
    if (!studentId) throw new BadRequest("Not authenticated");
    const { examId } = req.params;

    const result = await startDiagnosticExam(studentId, examId);

    return SuccessResponse(res, result, 200);
};

export const submitDiagnosticExamReq = async (req: Request, res: Response) => {
    const studentId = req.user?.id;
    if (!studentId) throw new BadRequest("Not authenticated");
    const { attemptId } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
        throw new BadRequest("Answers array is required");
    }

    try {
        await submitDiagnosticExam(studentId, attemptId, answers);
        return SuccessResponse(res, { message: "Diagnostic Exam Submitted successfully." }, 200);
    } catch (error: any) {
        throw new BadRequest(error.message);
    }
};

export const getStudentAttempts = async (req: Request, res: Response) => {
    const studentId = req.user?.id;
    if (!studentId) throw new BadRequest("Not authenticated");

    const attempts = await db
        .select({
            id: diagnosticExamAttempt.id,
            diagnosticExamId: diagnosticExamAttempt.diagnosticExamId,
            isCompleted: diagnosticExamAttempt.isCompleted,
            startedAt: diagnosticExamAttempt.startedAt,
            endedAt: diagnosticExamAttempt.endedAt,
            diagnosticExam: {
                id: diagnosticExam.id,
                title: diagnosticExam.title,
                description: diagnosticExam.description
            }
        })
        .from(diagnosticExamAttempt)
        .leftJoin(diagnosticExam, eq(diagnosticExamAttempt.diagnosticExamId, diagnosticExam.id))
        .where(eq(diagnosticExamAttempt.studentId, studentId))
        .orderBy(diagnosticExamAttempt.startedAt);

    return SuccessResponse(res, {
        message: "Attempts retrieved successfully",
        data: attempts
    }, 200);
};

export const getDiagnosticAttemptReview = async (req: Request, res: Response) => {
    const { attemptId } = req.params;

    // Fetch wrong answers for this attempt
    const wrongAnswers = await db
        .select({
            questionId: studentDiagnosticAnswers.questionId,
            studentAnswerId: studentDiagnosticAnswers.studentAnswerId,
            studentGridInAnswer: studentDiagnosticAnswers.studentGridInAnswer,
            questionText: questions.question,
            questionImage: questions.image,
            answerType: questions.answerType,
            correctOptionId: questionOptions.id,
            correctOptionAnswer: questionOptions.answer,
            explanationPdf: questionAnswers.pdf,
            explanationVideo: questionAnswers.video,
        })
        .from(studentDiagnosticAnswers)
        .innerJoin(questions, eq(studentDiagnosticAnswers.questionId, questions.id))
        // We only care about wrong answers
        .where(
            and(
                eq(studentDiagnosticAnswers.attemptId, attemptId),
                eq(studentDiagnosticAnswers.isCorrect, false)
            )
        )
        // Join with options to get the correct answer
        .leftJoin(
            questionOptions,
            and(
                eq(questionOptions.questionId, studentDiagnosticAnswers.questionId),
                eq(questionOptions.isCorrect, true)
            )
        )
        // Join with answers to get explanations
        .leftJoin(questionAnswers, eq(questionAnswers.questionId, studentDiagnosticAnswers.questionId));

    // De-duplicate if there are multiple correct options for Grid In
    const uniqueWrongAnswersMap = new Map();
    for (const ans of wrongAnswers) {
        if (!uniqueWrongAnswersMap.has(ans.questionId)) {
            uniqueWrongAnswersMap.set(ans.questionId, {
                questionId: ans.questionId,
                questionText: ans.questionText,
                questionImage: ans.questionImage,
                answerType: ans.answerType,
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
            uniqueWrongAnswersMap.get(ans.questionId).correctAnswers.push({
                optionId: ans.correctOptionId,
                answerText: ans.correctOptionAnswer
            });
        }
    }

    return SuccessResponse(res, {
        message: "Diagnostic Exam Review retrieved successfully",
        data: Array.from(uniqueWrongAnswersMap.values())
    }, 200);
};

export const getDiagnosticAttemptRecommendations = async (req: Request, res: Response) => {
    const { attemptId } = req.params;

    // Fetch wrong answers for this attempt and group by lessonId to see what to study
    const wrongAnswerLessons = await db
        .select({
            lessonId: lessons.id,
            lessonName: lessons.name,
            chapterId: chapters.id,
            chapterName: chapters.name,
            courseId: courses.id,
            courseName: courses.name,
        })
        .from(studentDiagnosticAnswers)
        .innerJoin(questions, eq(studentDiagnosticAnswers.questionId, questions.id))
        .innerJoin(lessons, eq(questions.lessonId, lessons.id))
        .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
        .innerJoin(courses, eq(lessons.courseId, courses.id))
        .where(
            and(
                eq(studentDiagnosticAnswers.attemptId, attemptId),
                eq(studentDiagnosticAnswers.isCorrect, false)
            )
        );

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

    return SuccessResponse(res, {
        message: "Diagnostic Exam Recommendations generated successfully",
        data: {
            recommendedLessonsToStudy: Array.from(uniqueLessonsMap.values())
        }
    }, 200);
};