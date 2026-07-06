// import { Request, Response } from "express";
// import { db } from "../../models/connection";
// import { quizAttempts, studentQuizAnswers, quizzes, questions, questionOptions, Student, examAttempts, studentAnswers, Exams } from "../../models/schema";
// import { eq, and, inArray } from "drizzle-orm";
// import { SuccessResponse } from "../../utils/response";
// import { NotFound } from "../../Errors";

// export const getStudentQuizReports = async (req: Request, res: Response) => {
//     const { studentId } = req.params;

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

//     if (attempts.length === 0) {
//         return SuccessResponse(res, { message: "No quiz reports found", data: [] });
//     }

//     const attemptIds = attempts.map(a => a.attemptId);

//     // 2. جلب كل الأخطاء لجميع المحاولات دفعة واحدة (Query #2)
//     const allMistakes = await db
//         .select({
//             attemptId: studentQuizAnswers.attemptId, // مضاف للربط البرمجي
//             questionId: questions.id,
//             questionText: questions.question,
//             studentSelectedOptionId: studentQuizAnswers.selectedOptionId,
//             studentGridInAnswer: studentQuizAnswers.gridInAnswer,
//         })
//         .from(studentQuizAnswers)
//         .innerJoin(questions, eq(studentQuizAnswers.questionId, questions.id))
//         .where(
//             and(
//                 inArray(studentQuizAnswers.attemptId, attemptIds),
//                 eq(studentQuizAnswers.isCorrect, false)
//             )
//         );

//     const questionIds = Array.from(new Set(allMistakes.map(m => m.questionId)));
//     let allOptions: any[] = [];

//     // 3. جلب كل الخيارات للأسئلة المطلوبة دفعة واحدة (Query #3)
//     if (questionIds.length > 0) {
//         allOptions = await db
//             .select({
//                 id: questionOptions.id,
//                 questionId: questionOptions.questionId,
//                 answer: questionOptions.answer,
//                 isCorrect: questionOptions.isCorrect,
//                 order: questionOptions.order
//             })
//             .from(questionOptions)
//             .where(inArray(questionOptions.questionId, questionIds));
//     }

//     // 4. بناء خريطة (Map) لتجميع البيانات بسرعة O(1) بدلاً من الـ filter المستمر
//     const optionsMap = new Map<string, any[]>();
//     allOptions.forEach(o => {
//         if (!optionsMap.has(o.questionId)) optionsMap.set(o.questionId, []);
//         optionsMap.get(o.questionId)!.push(o);
//     });

//     const mistakesByAttemptMap = new Map<string, any[]>();
//     allMistakes.forEach(m => {
//         if (!mistakesByAttemptMap.has(m.attemptId)) mistakesByAttemptMap.set(m.attemptId, []);

//         const qOptions = optionsMap.get(m.questionId) || [];
//         const correctOption = qOptions.find(o => o.isCorrect);
//         const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);

//         mistakesByAttemptMap.get(m.attemptId)!.push({
//             questionId: m.questionId,
//             questionText: m.questionText,
//             studentSelectedOptionId: m.studentSelectedOptionId,
//             studentGridInAnswer: m.studentGridInAnswer,
//             correctOption: correctOption ? correctOption.answer : null,
//             studentOption: studentOption ? studentOption.answer : null,
//             options: qOptions.map(({ questionId, isCorrect, ...rest }) => rest)
//         });
//     });

//     // 5. تركيب النتيجة النهائية
//     const reportData = attempts.map(attempt => ({
//         ...attempt,
//         mistakes: mistakesByAttemptMap.get(attempt.attemptId) || []
//     }));

//     return SuccessResponse(res, {
//         message: "Student quiz reports retrieved successfully",
//         data: reportData
//     });
// };

// export const getStudentExamReports = async (req: Request, res: Response) => {
//     const { studentId } = req.params;

//     const existingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
//     if (existingStudent.length === 0) {
//         throw new NotFound("Student not found");
//     }

//     const attempts = await db
//         .select({
//             attemptId: examAttempts.id,
//             score: examAttempts.score,
//             date: examAttempts.endedAt,
//             examId: Exams.id,
//             examName: Exams.title,
//             totalScore: Exams.totalScore,
//             passScore: Exams.passScore
//         })
//         .from(examAttempts)
//         .innerJoin(Exams, eq(examAttempts.examId, Exams.id))
//         .where(
//             and(
//                 eq(examAttempts.studentId, studentId),
//                 eq(examAttempts.status, "completed")
//             )
//         );

//     const reportData = await Promise.all(
//         attempts.map(async (attempt) => {
//             const mistakes = await db
//                 .select({
//                     questionId: questions.id,
//                     questionText: questions.question,
//                     studentSelectedOptionId: studentAnswers.selectedOptionId,
//                     studentGridInAnswer: studentAnswers.gridInAnswer,
//                 })
//                 .from(studentAnswers)
//                 .innerJoin(questions, eq(studentAnswers.questionId, questions.id))
//                 .where(
//                     and(
//                         eq(studentAnswers.attemptId, attempt.attemptId),
//                         eq(studentAnswers.isCorrect, false)
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
//         message: "Student exam reports retrieved successfully",
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
    examAttempts,
    studentAnswers,
    Exams,
    questionAnswers,
    lessons,
    sessionLessons,
    sessionAttendance,
    courses
} from "../../models/schema";
import { eq, and, inArray, or } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors";

export const getStudentQuizReports = async (req: Request, res: Response) => {
    const { studentId } = req.params;

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
                pdf: questionAnswers.pdf,
                video: questionAnswers.video,
                image: questionAnswers.image,
                text: questionAnswers.text
            })
            .from(questionAnswers)
            .where(inArray(questionAnswers.questionId, mistakenQuestionIds));
    }
    const rightSolutionsMap = new Map<string, any>(allRightSolutions.map(s => [s.questionId, s]));

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
        const rightSolution = rightSolutionsMap.get(m.questionId) || null;
        const lessonDetail = m.lessonId ? lessonsMap.get(m.lessonId) || null : null;

        mistakesByAttemptMap.get(m.attemptId)!.push({
            questionId: m.questionId,
            questionText: m.questionText,
            studentSelectedOptionId: m.studentSelectedOptionId,
            studentGridInAnswer: m.studentGridInAnswer,
            correctOption: correctOption ? correctOption.answer : null,
            studentOption: studentOption ? studentOption.answer : null,
            options: qOptions.map(({ questionId, isCorrect, ...rest }) => rest),
            rightSolution: rightSolution ? {
                pdf: rightSolution.pdf,
                video: rightSolution.video,
                image: rightSolution.image,
                text: rightSolution.text
            } : null,
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

    const studentCategory = existingStudent[0].category;

    // 1. Fetch all attempts of the student for exams
    const studentAttempts = await db
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.studentId, studentId));

    const attemptExamIds = studentAttempts.map(a => a.examId);

    // 2. Fetch all exams in student's category OR exams that the student has attempted
    const whereConditions = [
        eq(courses.categoryId, studentCategory)
    ];
    if (attemptExamIds.length > 0) {
        whereConditions.push(inArray(Exams.id, attemptExamIds));
    }

    const allExams = await db
        .select({
            id: Exams.id,
            title: Exams.title,
            description: Exams.description,
            totalScore: Exams.totalScore,
            passScore: Exams.passScore,
            isActive: Exams.isActive,
        })
        .from(Exams)
        .innerJoin(courses, eq(Exams.courseId, courses.id))
        .where(or(...whereConditions));

    // 3. Gather completed attempt IDs to fetch mistakes
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

    // 4. Fetch details for mistaken questions: options, right solutions and lesson details
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

    // 5. Check session attendance for these lessons
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
                pdf: questionAnswers.pdf,
                video: questionAnswers.video,
                image: questionAnswers.image,
                text: questionAnswers.text
            })
            .from(questionAnswers)
            .where(inArray(questionAnswers.questionId, mistakenQuestionIds));
    }
    const rightSolutionsMap = new Map<string, any>(allRightSolutions.map(s => [s.questionId, s]));

    const mistakesByAttemptMap = new Map<string, any[]>();
    allMistakes.forEach(m => {
        if (!mistakesByAttemptMap.has(m.attemptId)) mistakesByAttemptMap.set(m.attemptId, []);

        const qOptions = optionsMap.get(m.questionId) || [];
        const correctOption = qOptions.find(o => o.isCorrect);
        const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);
        const rightSolution = rightSolutionsMap.get(m.questionId) || null;
        const lessonDetail = m.lessonId ? lessonsMap.get(m.lessonId) || null : null;
        const attendedLesson = m.lessonId ? attendedLessonIds.has(m.lessonId) : false;

        mistakesByAttemptMap.get(m.attemptId)!.push({
            questionId: m.questionId,
            questionText: m.questionText,
            studentSelectedOptionId: m.studentSelectedOptionId,
            studentGridInAnswer: m.studentGridInAnswer,
            correctOption: correctOption ? correctOption.answer : null,
            studentOption: studentOption ? studentOption.answer : null,
            options: qOptions.map(({ questionId, isCorrect, ...rest }) => rest),
            rightSolution: rightSolution ? {
                pdf: rightSolution.pdf,
                video: rightSolution.video,
                image: rightSolution.image,
                text: rightSolution.text
            } : null,
            lesson: lessonDetail ? {
                id: lessonDetail.id,
                name: lessonDetail.name,
                description: lessonDetail.description
            } : null,
            attendedLesson
        });
    });

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
        message: "Student exam reports retrieved successfully",
        data: reportData
    });
};

