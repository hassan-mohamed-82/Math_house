import { Request, Response } from "express";
import { db } from "../../models/connection";
import {
    quizAttempts,
    studentQuizAnswers,
    quizzes,
    questions,
    questionOptions,
    Student,
    questionAnswers,
    lessons,
    sessionLessons,
    sessionAttendance,
    courses,
    category,
    Exams,
    examAttempts,
    studentAnswers,
    diagnosticExam,
    diagnosticExamAttempt,
    studentDiagnosticAnswers
} from "../../models/schema";
import { eq, and, inArray, or, desc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound, UnauthorizedError } from "../../Errors";

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

export const getStudentQuizReports = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);

    const existingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new NotFound("Student not found");
    }

    const studentCategory = existingStudent[0].category;

    // 1. Fetch all attempts of the student for quizzes
    const studentAttempts = await db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.studentId, studentId));

    const attemptQuizIds = studentAttempts.map(a => a.quizId);

    // 2. Fetch all quizzes in student's category OR quizzes that the student has attempted
    const whereConditions = [
        eq(quizzes.categoryId, studentCategory),
        eq(courses.categoryId, studentCategory)
    ];
    if (attemptQuizIds.length > 0) {
        whereConditions.push(inArray(quizzes.id, attemptQuizIds));
    }

    const allQuizzes = await db
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
            isActive: quizzes.isActive,
        })
        .from(quizzes)
        .leftJoin(courses, eq(quizzes.courseId, courses.id))
        .where(or(...whereConditions));

    // 3. Gather all unique lesson IDs from quizzes
    const lessonIds = Array.from(new Set(allQuizzes.map(q => q.lessonId).filter((id): id is string => !!id)));

    // 4. Fetch lesson details
    let lessonsList: any[] = [];
    if (lessonIds.length > 0) {
        lessonsList = await db
            .select()
            .from(lessons)
            .where(inArray(lessons.id, lessonIds));
    }
    const lessonsMap = new Map<string, any>(lessonsList.map(l => [l.id, l]));

    // 5. Fetch session attendance matching student and present for those lessons
    let attendedLessonIds = new Set<string>();
    if (lessonIds.length > 0) {
        const studentLessonAttendance = await db
            .select({
                lessonId: sessionLessons.lessonId
            })
            .from(sessionLessons)
            .innerJoin(sessionAttendance, eq(sessionLessons.sessionId, sessionAttendance.sessionId))
            .where(
                and(
                    eq(sessionAttendance.studentId, studentId),
                    eq(sessionAttendance.status, "present"),
                    inArray(sessionLessons.lessonId, lessonIds)
                )
            );
        attendedLessonIds = new Set(studentLessonAttendance.map(a => a.lessonId));
    }

    // 6. Gather completed attempt IDs to fetch mistakes
    const completedAttemptIds = studentAttempts
        .filter(a => a.status === "completed" || a.status === "timed_out")
        .map(a => a.id);

    let allMistakes: any[] = [];
    if (completedAttemptIds.length > 0) {
        allMistakes = await db
            .select({
                attemptId: studentQuizAnswers.attemptId,
                questionId: questions.id,
                questionText: questions.question,
                lessonId: questions.lessonId,
                studentSelectedOptionId: studentQuizAnswers.selectedOptionId,
                studentGridInAnswer: studentQuizAnswers.gridInAnswer,
            })
            .from(studentQuizAnswers)
            .innerJoin(questions, eq(studentQuizAnswers.questionId, questions.id))
            .where(
                and(
                    inArray(studentQuizAnswers.attemptId, completedAttemptIds),
                    eq(studentQuizAnswers.isCorrect, false)
                )
            );
    }

    // 7. Fetch details for mistaken questions: options and right solutions
    const mistakenQuestionIds = Array.from(new Set(allMistakes.map(m => m.questionId)));

    let allOptions: any[] = [];
    if (mistakenQuestionIds.length > 0) {
        allOptions = await db
            .select({
                id: questionOptions.id,
                questionId: questionOptions.questionId,
                answer: questionOptions.answer,
                isCorrect: questionOptions.isCorrect,
                order: questionOptions.order
            })
            .from(questionOptions)
            .where(inArray(questionOptions.questionId, mistakenQuestionIds));
    }
    const optionsMap = new Map<string, any[]>();
    allOptions.forEach(o => {
        if (!optionsMap.has(o.questionId)) optionsMap.set(o.questionId, []);
        optionsMap.get(o.questionId)!.push(o);
    });

    let allRightSolutions: any[] = [];
    if (mistakenQuestionIds.length > 0) {
        allRightSolutions = await db
            .select({
                questionId: questionAnswers.questionId,
                id: questionAnswers.id,
                pdf: questionAnswers.pdf,
                video: questionAnswers.video,
                image: questionAnswers.image,
                text: questionAnswers.text
            })
            .from(questionAnswers)
            .where(inArray(questionAnswers.questionId, mistakenQuestionIds));
    }
    // Group answers by questionId as an array
    const rightSolutionsMap = new Map<string, any[]>();
    for (const s of allRightSolutions) {
        if (!rightSolutionsMap.has(s.questionId)) rightSolutionsMap.set(s.questionId, []);
        rightSolutionsMap.get(s.questionId)!.push({
            id: s.id,
            answerPdf: s.pdf,
            answerVideo: s.video,
            answerImage: s.image,
            answerText: s.text,
        });
    }

    // 8. Fetch missing lessons details from mistaken questions if they are not already in lessonsMap
    const mistakenQuestionLessonIds = Array.from(
        new Set(allMistakes.map(m => m.lessonId).filter((id): id is string => !!id))
    );
    const missingLessonIds = mistakenQuestionLessonIds.filter(id => !lessonsMap.has(id));
    if (missingLessonIds.length > 0) {
        const missingLessons = await db
            .select()
            .from(lessons)
            .where(inArray(lessons.id, missingLessonIds));
        missingLessons.forEach(l => lessonsMap.set(l.id, l));
    }

    const mistakesByAttemptMap = new Map<string, any[]>();
    allMistakes.forEach(m => {
        if (!mistakesByAttemptMap.has(m.attemptId)) mistakesByAttemptMap.set(m.attemptId, []);

        const qOptions = optionsMap.get(m.questionId) || [];
        const correctOption = qOptions.find(o => o.isCorrect);
        const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);
        const rightSolution = rightSolutionsMap.get(m.questionId) ?? [];
        const lessonDetail = m.lessonId ? lessonsMap.get(m.lessonId) || null : null;

        mistakesByAttemptMap.get(m.attemptId)!.push({
            questionId: m.questionId,
            questionText: m.questionText,
            studentSelectedOptionId: m.studentSelectedOptionId,
            studentGridInAnswer: m.studentGridInAnswer,
            correctOption: correctOption ? correctOption.answer : null,
            studentOption: studentOption ? studentOption.answer : null,
            options: qOptions.map(({ questionId, isCorrect, ...rest }) => rest),
            answers: rightSolution, // array of [{ id, answerPdf, answerVideo, answerImage, answerText }]
            lesson: lessonDetail ? {
                id: lessonDetail.id,
                name: lessonDetail.name,
                description: lessonDetail.description
            } : null
        });
    });

    // 9. Construct final report data
    const reportData = allQuizzes.map(quiz => {
        const attempt = studentAttempts.find(a => a.quizId === quiz.id);

        let status = "absent";
        let attemptId = null;
        let score = null;
        let date = null;
        let mistakes: any[] = [];
        let mistakesCount = 0;

        if (attempt) {
            if (attempt.status === "completed" || attempt.status === "timed_out") {
                status = "attend";
                attemptId = attempt.id;
                score = attempt.score;
                date = attempt.endedAt;
                mistakes = mistakesByAttemptMap.get(attempt.id) || [];
                mistakesCount = mistakes.length;
            } else if (attempt.status === "in_progress") {
                status = "waiting";
                attemptId = attempt.id;
            }
        }

        const quizLessonId = quiz.lessonId;
        const lessonDetail = quizLessonId ? lessonsMap.get(quizLessonId) || null : null;
        const attendedLesson = quizLessonId ? attendedLessonIds.has(quizLessonId) : false;

        return {
            quizId: quiz.id,
            quizName: quiz.title,
            totalScore: quiz.totalScore,
            passScore: quiz.passScore,
            isActive: quiz.isActive,
            status,
            attemptId,
            score,
            date,
            mistakesCount,
            mistakes,
            attendedLesson,
            lesson: lessonDetail ? {
                id: lessonDetail.id,
                name: lessonDetail.name,
                description: lessonDetail.description
            } : null
        };
    });

    return SuccessResponse(res, {
        message: "Quiz reports retrieved successfully",
        data: reportData
    });
};

const getCategoryHierarchy = async (studentCategory: string | null): Promise<string[]> => {
    if (!studentCategory) return [];
    const categoryIds: string[] = [];
    let currentId: string | null = studentCategory;
    while (currentId) {
        if (!categoryIds.includes(currentId)) {
            categoryIds.push(currentId);
        }
        const [cat]: any = await db
            .select({ parentCategoryId: category.parentCategoryId })
            .from(category)
            .where(eq(category.id, currentId));

        currentId = cat?.parentCategoryId ?? null;
    }

    const children = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.parentCategoryId, studentCategory));

    children.forEach(child => {
        if (!categoryIds.includes(child.id)) {
            categoryIds.push(child.id);
        }
    });

    return categoryIds;
};

const getLessonsToRecap = (attemptMistakes: any[]) => {
    const recapMap = new Map<string, { lesson: any, count: number, attendedLesson: boolean }>();
    attemptMistakes.forEach(m => {
        if (m.lesson) {
            const lessonId = m.lesson.id;
            if (!recapMap.has(lessonId)) {
                recapMap.set(lessonId, {
                    lesson: m.lesson,
                    count: 0,
                    attendedLesson: m.attendedLesson
                });
            }
            recapMap.get(lessonId)!.count += 1;
        }
    });
    return Array.from(recapMap.values()).map(r => ({
        ...r.lesson,
        mistakesCount: r.count,
        attendedLesson: r.attendedLesson
    }));
};

// ===================== GET STUDENT EXAM REPORTS =====================
export const getStudentExamReports = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);

    const existingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new NotFound("Student not found");
    }

    const studentCategory = existingStudent[0].category;

    // 1. Fetch all attempts of the student for exams
    const studentAttempts = await db
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.studentId, studentId))
        .orderBy(desc(examAttempts.startedAt));

    const attemptExamIds = studentAttempts.map(a => a.examId);

    // 2. Build Category Hierarchy
    const categoryIds = await getCategoryHierarchy(studentCategory);

    // 3. Fetch all exams in student's category hierarchy OR exams that the student has attempted
    const whereConditions = [];
    if (categoryIds.length > 0) {
        whereConditions.push(inArray(courses.categoryId, categoryIds));
    } else if (studentCategory) {
        whereConditions.push(eq(courses.categoryId, studentCategory));
    }
    if (attemptExamIds.length > 0) {
        whereConditions.push(inArray(Exams.id, attemptExamIds));
    }

    const allExams = whereConditions.length > 0
        ? await db
            .select({
                id: Exams.id,
                title: Exams.title,
                description: Exams.description,
                totalScore: Exams.totalScore,
                passScore: Exams.passScore,
                isActive: Exams.isActive,
                courseId: Exams.courseId,
                courseName: courses.name,
            })
            .from(Exams)
            .innerJoin(courses, eq(Exams.courseId, courses.id))
            .where(or(...whereConditions))
        : [];

    // 4. Gather completed attempt IDs to fetch mistakes
    const completedAttemptIds = studentAttempts
        .filter(a => a.status === "completed" || a.status === "timed_out")
        .map(a => a.id);

    let allMistakes: any[] = [];
    if (completedAttemptIds.length > 0) {
        allMistakes = await db
            .select({
                attemptId: studentAnswers.attemptId,
                questionId: questions.id,
                questionText: questions.question,
                questionImage: questions.image,
                answerType: questions.answerType,
                lessonId: questions.lessonId,
                studentSelectedOptionId: studentAnswers.selectedOptionId,
                studentGridInAnswer: studentAnswers.gridInAnswer,
            })
            .from(studentAnswers)
            .innerJoin(questions, eq(studentAnswers.questionId, questions.id))
            .where(
                and(
                    inArray(studentAnswers.attemptId, completedAttemptIds),
                    eq(studentAnswers.isCorrect, false)
                )
            );
    }

    // 5. Fetch details for mistaken questions: options, right solutions, lessons, and session attendance
    const mistakenQuestionIds = Array.from(new Set(allMistakes.map(m => m.questionId)));
    const lessonIds = Array.from(new Set(allMistakes.map(m => m.lessonId).filter((id): id is string => !!id)));

    let lessonsList: any[] = [];
    if (lessonIds.length > 0) {
        lessonsList = await db
            .select()
            .from(lessons)
            .where(inArray(lessons.id, lessonIds));
    }
    const lessonsMap = new Map<string, any>(lessonsList.map(l => [l.id, l]));

    let attendedLessonIds = new Set<string>();
    if (lessonIds.length > 0) {
        const studentLessonAttendance = await db
            .select({
                lessonId: sessionLessons.lessonId
            })
            .from(sessionLessons)
            .innerJoin(sessionAttendance, eq(sessionLessons.sessionId, sessionAttendance.sessionId))
            .where(
                and(
                    eq(sessionAttendance.studentId, studentId),
                    eq(sessionAttendance.status, "present"),
                    inArray(sessionLessons.lessonId, lessonIds)
                )
            );
        attendedLessonIds = new Set(studentLessonAttendance.map(a => a.lessonId));
    }

    let allOptions: any[] = [];
    if (mistakenQuestionIds.length > 0) {
        allOptions = await db
            .select({
                id: questionOptions.id,
                questionId: questionOptions.questionId,
                answer: questionOptions.answer,
                isCorrect: questionOptions.isCorrect,
                order: questionOptions.order
            })
            .from(questionOptions)
            .where(inArray(questionOptions.questionId, mistakenQuestionIds));
    }
    const optionsMap = new Map<string, any[]>();
    allOptions.forEach(o => {
        if (!optionsMap.has(o.questionId)) optionsMap.set(o.questionId, []);
        optionsMap.get(o.questionId)!.push(o);
    });

    let allRightSolutions: any[] = [];
    if (mistakenQuestionIds.length > 0) {
        allRightSolutions = await db
            .select({
                questionId: questionAnswers.questionId,
                id: questionAnswers.id,
                pdf: questionAnswers.pdf,
                video: questionAnswers.video,
                image: questionAnswers.image,
                text: questionAnswers.text
            })
            .from(questionAnswers)
            .where(inArray(questionAnswers.questionId, mistakenQuestionIds));
    }
    const rightSolutionsMap = new Map<string, any[]>();
    for (const s of allRightSolutions) {
        if (!rightSolutionsMap.has(s.questionId)) rightSolutionsMap.set(s.questionId, []);
        rightSolutionsMap.get(s.questionId)!.push({
            id: s.id,
            answerPdf: s.pdf,
            answerVideo: s.video,
            answerImage: s.image,
            answerText: s.text,
        });
    }

    const mistakesByAttemptMap = new Map<string, any[]>();
    allMistakes.forEach(m => {
        if (!mistakesByAttemptMap.has(m.attemptId)) mistakesByAttemptMap.set(m.attemptId, []);

        const qOptions = optionsMap.get(m.questionId) || [];
        const correctOption = qOptions.find(o => o.isCorrect);
        const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);
        const rightSolution = rightSolutionsMap.get(m.questionId) ?? [];
        const lessonDetail = m.lessonId ? lessonsMap.get(m.lessonId) || null : null;
        const attendedLesson = m.lessonId ? attendedLessonIds.has(m.lessonId) : false;

        mistakesByAttemptMap.get(m.attemptId)!.push({
            questionId: m.questionId,
            questionText: m.questionText,
            questionImage: m.questionImage,
            answerType: m.answerType,
            studentSelectedOptionId: m.studentSelectedOptionId,
            studentGridInAnswer: m.studentGridInAnswer,
            correctOption: correctOption ? correctOption.answer : null,
            studentOption: studentOption ? studentOption.answer : null,
            options: qOptions.map(({ questionId, isCorrect, ...rest }) => rest),
            answers: rightSolution,
            lesson: lessonDetail ? {
                id: lessonDetail.id,
                name: lessonDetail.name,
                description: lessonDetail.description
            } : null,
            attendedLesson
        });
    });

    // 6. Map and build final reportData
    const reportData = allExams.map(exam => {
        const attempt = studentAttempts.find(a => a.examId === exam.id);

        let status = "absent";
        let attemptId = null;
        let score = null;
        let date = null;
        let mistakes: any[] = [];
        let mistakesCount = 0;
        let lessonsToRecap: any[] = [];

        if (attempt) {
            if (attempt.status === "completed" || attempt.status === "timed_out") {
                status = "attend";
                attemptId = attempt.id;
                score = attempt.score;
                date = attempt.endedAt;
                mistakes = mistakesByAttemptMap.get(attempt.id) || [];
                mistakesCount = mistakes.length;
                lessonsToRecap = getLessonsToRecap(mistakes);
            } else if (attempt.status === "in_progress") {
                status = "waiting";
                attemptId = attempt.id;
            }
        }

        return {
            examId: exam.id,
            examName: exam.title,
            courseId: exam.courseId,
            courseName: exam.courseName,
            totalScore: exam.totalScore,
            passScore: exam.passScore,
            isActive: exam.isActive,
            status,
            attemptId,
            score,
            date,
            mistakesCount,
            mistakes,
            lessonsToRecap
        };
    });

    return SuccessResponse(res, {
        message: "Exam reports retrieved successfully",
        data: reportData
    });
};

// ===================== GET STUDENT DIAGNOSTIC EXAM REPORTS =====================
export const getStudentDiagnosticExamReports = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);

    const existingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new NotFound("Student not found");
    }

    const studentCategory = existingStudent[0].category;

    // 1. Fetch all attempts of the student for diagnostic exams
    const studentAttempts = await db
        .select()
        .from(diagnosticExamAttempt)
        .where(eq(diagnosticExamAttempt.studentId, studentId))
        .orderBy(desc(diagnosticExamAttempt.startedAt));

    const attemptExamIds = studentAttempts.map(a => a.diagnosticExamId);

    // 2. Build Category Hierarchy
    const categoryIds = await getCategoryHierarchy(studentCategory);

    // 3. Fetch all diagnostic exams in student's category hierarchy OR exams that the student has attempted
    const whereConditions = [];
    if (categoryIds.length > 0) {
        whereConditions.push(inArray(courses.categoryId, categoryIds));
    } else if (studentCategory) {
        whereConditions.push(eq(courses.categoryId, studentCategory));
    }
    if (attemptExamIds.length > 0) {
        whereConditions.push(inArray(diagnosticExam.id, attemptExamIds));
    }

    const allDiagnosticExams = whereConditions.length > 0
        ? await db
            .select({
                id: diagnosticExam.id,
                title: diagnosticExam.title,
                description: diagnosticExam.description,
                totalScore: diagnosticExam.totalScore,
                passScore: diagnosticExam.passScore,
                duration: diagnosticExam.duration,
                numberOfQuestions: diagnosticExam.numberOfQuestions,
                isActive: diagnosticExam.isActive,
                courseId: diagnosticExam.courseId,
                courseName: courses.name,
            })
            .from(diagnosticExam)
            .innerJoin(courses, eq(diagnosticExam.courseId, courses.id))
            .where(or(...whereConditions))
        : [];

    // 4. Gather completed attempt IDs to fetch mistakes
    const completedAttemptIds = studentAttempts
        .filter(a => a.isCompleted)
        .map(a => a.id);

    let allMistakes: any[] = [];
    if (completedAttemptIds.length > 0) {
        allMistakes = await db
            .select({
                attemptId: studentDiagnosticAnswers.attemptId,
                questionId: questions.id,
                questionText: questions.question,
                questionImage: questions.image,
                answerType: questions.answerType,
                lessonId: questions.lessonId,
                studentAnswerId: studentDiagnosticAnswers.studentAnswerId,
                studentGridInAnswer: studentDiagnosticAnswers.studentGridInAnswer,
            })
            .from(studentDiagnosticAnswers)
            .innerJoin(questions, eq(studentDiagnosticAnswers.questionId, questions.id))
            .where(
                and(
                    inArray(studentDiagnosticAnswers.attemptId, completedAttemptIds),
                    eq(studentDiagnosticAnswers.isCorrect, false)
                )
            );
    }

    // 5. Fetch details for mistaken questions: options, right solutions, lessons, and session attendance
    const mistakenQuestionIds = Array.from(new Set(allMistakes.map(m => m.questionId)));
    const lessonIds = Array.from(new Set(allMistakes.map(m => m.lessonId).filter((id): id is string => !!id)));

    let lessonsList: any[] = [];
    if (lessonIds.length > 0) {
        lessonsList = await db
            .select()
            .from(lessons)
            .where(inArray(lessons.id, lessonIds));
    }
    const lessonsMap = new Map<string, any>(lessonsList.map(l => [l.id, l]));

    let attendedLessonIds = new Set<string>();
    if (lessonIds.length > 0) {
        const studentLessonAttendance = await db
            .select({
                lessonId: sessionLessons.lessonId
            })
            .from(sessionLessons)
            .innerJoin(sessionAttendance, eq(sessionLessons.sessionId, sessionAttendance.sessionId))
            .where(
                and(
                    eq(sessionAttendance.studentId, studentId),
                    eq(sessionAttendance.status, "present"),
                    inArray(sessionLessons.lessonId, lessonIds)
                )
            );
        attendedLessonIds = new Set(studentLessonAttendance.map(a => a.lessonId));
    }

    let allOptions: any[] = [];
    if (mistakenQuestionIds.length > 0) {
        allOptions = await db
            .select({
                id: questionOptions.id,
                questionId: questionOptions.questionId,
                answer: questionOptions.answer,
                isCorrect: questionOptions.isCorrect,
                order: questionOptions.order
            })
            .from(questionOptions)
            .where(inArray(questionOptions.questionId, mistakenQuestionIds));
    }
    const optionsMap = new Map<string, any[]>();
    allOptions.forEach(o => {
        if (!optionsMap.has(o.questionId)) optionsMap.set(o.questionId, []);
        optionsMap.get(o.questionId)!.push(o);
    });

    let allRightSolutions: any[] = [];
    if (mistakenQuestionIds.length > 0) {
        allRightSolutions = await db
            .select({
                questionId: questionAnswers.questionId,
                id: questionAnswers.id,
                pdf: questionAnswers.pdf,
                video: questionAnswers.video,
                image: questionAnswers.image,
                text: questionAnswers.text
            })
            .from(questionAnswers)
            .where(inArray(questionAnswers.questionId, mistakenQuestionIds));
    }
    const rightSolutionsMap = new Map<string, any[]>();
    for (const s of allRightSolutions) {
        if (!rightSolutionsMap.has(s.questionId)) rightSolutionsMap.set(s.questionId, []);
        rightSolutionsMap.get(s.questionId)!.push({
            id: s.id,
            answerPdf: s.pdf,
            answerVideo: s.video,
            answerImage: s.image,
            answerText: s.text,
        });
    }

    const mistakesByAttemptMap = new Map<string, any[]>();
    allMistakes.forEach(m => {
        if (!mistakesByAttemptMap.has(m.attemptId)) mistakesByAttemptMap.set(m.attemptId, []);

        const qOptions = optionsMap.get(m.questionId) || [];
        const correctOption = qOptions.find(o => o.isCorrect);
        const studentOption = qOptions.find(o => o.id === m.studentAnswerId);
        const rightSolution = rightSolutionsMap.get(m.questionId) ?? [];
        const lessonDetail = m.lessonId ? lessonsMap.get(m.lessonId) || null : null;
        const attendedLesson = m.lessonId ? attendedLessonIds.has(m.lessonId) : false;

        mistakesByAttemptMap.get(m.attemptId)!.push({
            questionId: m.questionId,
            questionText: m.questionText,
            questionImage: m.questionImage,
            answerType: m.answerType,
            studentSelectedOptionId: m.studentAnswerId,
            studentGridInAnswer: m.studentGridInAnswer,
            correctOption: correctOption ? correctOption.answer : null,
            studentOption: studentOption ? studentOption.answer : null,
            options: qOptions.map(({ questionId, isCorrect, ...rest }) => rest),
            answers: rightSolution,
            lesson: lessonDetail ? {
                id: lessonDetail.id,
                name: lessonDetail.name,
                description: lessonDetail.description
            } : null,
            attendedLesson
        });
    });

    // 6. Map and build final reportData
    const reportData = allDiagnosticExams.map(exam => {
        const attempt = studentAttempts.find(a => a.diagnosticExamId === exam.id);

        let status = "absent";
        let attemptId = null;
        let score = null;
        let date = null;
        let mistakes: any[] = [];
        let mistakesCount = 0;
        let lessonsToRecap: any[] = [];

        if (attempt) {
            if (attempt.isCompleted) {
                status = "attend";
                attemptId = attempt.id;
                score = attempt.score;
                date = attempt.endedAt;
                mistakes = mistakesByAttemptMap.get(attempt.id) || [];
                mistakesCount = mistakes.length;
                lessonsToRecap = getLessonsToRecap(mistakes);
            } else {
                status = "waiting";
                attemptId = attempt.id;
            }
        }

        return {
            diagnosticExamId: exam.id,
            diagnosticExamName: exam.title,
            courseId: exam.courseId,
            courseName: exam.courseName,
            totalScore: exam.totalScore,
            passScore: exam.passScore,
            duration: exam.duration,
            numberOfQuestions: exam.numberOfQuestions,
            isActive: exam.isActive,
            status,
            attemptId,
            score,
            date,
            mistakesCount,
            mistakes,
            lessonsToRecap
        };
    });

    return SuccessResponse(res, {
        message: "Diagnostic exam reports retrieved successfully",
        data: reportData
    });
};

