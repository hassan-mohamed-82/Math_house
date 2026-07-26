// import { Request, Response } from "express";
// import { db } from "../../models/connection";
// import { quizAttempts, studentQuizAnswers, quizzes, questions, questionOptions, Student } from "../../models/schema";
// import { eq, and, inArray } from "drizzle-orm";
// import { SuccessResponse } from "../../utils/response";
// import { NotFound, UnauthorizedError } from "../../Errors";

// const getStudentId = (req: Request): string => {
//     if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
//     return req.user.id;
// };

// export const getStudentQuizReports = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);

//     const existingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
//     if (existingStudent.length === 0) {
//         throw new NotFound("Student not found");
//     }

//     const attempts = await db
//         .select({
//             attemptId: quizAttempts.id,
//             score: quizAttempts.score,
//             date: quizAttempts.endedAt,
//             quizId: quizzes.id,
//             quizName: quizzes.title,
//             totalScore: quizzes.totalScore,
//             passScore: quizzes.passScore
//         })
//         .from(quizAttempts)
//         .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
//         .where(
//             and(
//                 eq(quizAttempts.studentId, studentId),
//                 eq(quizAttempts.status, "completed")
//             )
//         );

//     const reportData = await Promise.all(
//         attempts.map(async (attempt) => {
//             const mistakes = await db
//                 .select({
//                     questionId: questions.id,
//                     questionText: questions.question,
//                     studentSelectedOptionId: studentQuizAnswers.selectedOptionId,
//                     studentGridInAnswer: studentQuizAnswers.gridInAnswer,
//                 })
//                 .from(studentQuizAnswers)
//                 .innerJoin(questions, eq(studentQuizAnswers.questionId, questions.id))
//                 .where(
//                     and(
//                         eq(studentQuizAnswers.attemptId, attempt.attemptId),
//                         eq(studentQuizAnswers.isCorrect, false)
//                     )
//                 );

//             const questionIds = mistakes.map(m => m.questionId);
//             let options: any[] = [];

//             if (questionIds.length > 0) {
//                 options = await db
//                     .select({
//                         id: questionOptions.id,
//                         questionId: questionOptions.questionId,
//                         answer: questionOptions.answer,
//                         isCorrect: questionOptions.isCorrect,
//                         order: questionOptions.order
//                     })
//                     .from(questionOptions)
//                     .where(inArray(questionOptions.questionId, questionIds));
//             }

//             const mistakesWithDetails = mistakes.map(m => {
//                 const qOptions = options.filter(o => o.questionId === m.questionId);
//                 const correctOption = qOptions.find(o => o.isCorrect);
//                 const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);

//                 return {
//                     ...m,
//                     correctOption: correctOption ? correctOption.answer : null,
//                     studentOption: studentOption ? studentOption.answer : null,
//                     options: qOptions.map(({questionId, isCorrect, ...rest}) => rest)
//                 };
//             });

//             return {
//                 ...attempt,
//                 mistakes: mistakesWithDetails
//             };
//         })
//     );

//     return SuccessResponse(res, {
//         message: "Quiz reports retrieved successfully",
//         data: reportData
//     });
// };



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
    courses
} from "../../models/schema";
import { eq, and, inArray, or } from "drizzle-orm";
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

