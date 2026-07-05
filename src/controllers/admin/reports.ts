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

    if (attempts.length === 0) {
        return SuccessResponse(res, { message: "No quiz reports found", data: [] });
    }

    const attemptIds = attempts.map(a => a.attemptId);

    // 2. جلب كل الأخطاء لجميع المحاولات دفعة واحدة (Query #2)
    const allMistakes = await db
        .select({
            attemptId: studentQuizAnswers.attemptId, // مضاف للربط البرمجي
            questionId: questions.id,
            questionText: questions.question,
            studentSelectedOptionId: studentQuizAnswers.selectedOptionId,
            studentGridInAnswer: studentQuizAnswers.gridInAnswer,
        })
        .from(studentQuizAnswers)
        .innerJoin(questions, eq(studentQuizAnswers.questionId, questions.id))
        .where(
            and(
                inArray(studentQuizAnswers.attemptId, attemptIds),
                eq(studentQuizAnswers.isCorrect, false)
            )
        );

    const questionIds = Array.from(new Set(allMistakes.map(m => m.questionId)));
    let allOptions: any[] = [];

    // 3. جلب كل الخيارات للأسئلة المطلوبة دفعة واحدة (Query #3)
    if (questionIds.length > 0) {
        allOptions = await db
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

    // 4. بناء خريطة (Map) لتجميع البيانات بسرعة O(1) بدلاً من الـ filter المستمر
    const optionsMap = new Map<string, any[]>();
    allOptions.forEach(o => {
        if (!optionsMap.has(o.questionId)) optionsMap.set(o.questionId, []);
        optionsMap.get(o.questionId)!.push(o);
    });

    const mistakesByAttemptMap = new Map<string, any[]>();
    allMistakes.forEach(m => {
        if (!mistakesByAttemptMap.has(m.attemptId)) mistakesByAttemptMap.set(m.attemptId, []);
        
        const qOptions = optionsMap.get(m.questionId) || [];
        const correctOption = qOptions.find(o => o.isCorrect);
        const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);

        mistakesByAttemptMap.get(m.attemptId)!.push({
            questionId: m.questionId,
            questionText: m.questionText,
            studentSelectedOptionId: m.studentSelectedOptionId,
            studentGridInAnswer: m.studentGridInAnswer,
            correctOption: correctOption ? correctOption.answer : null,
            studentOption: studentOption ? studentOption.answer : null,
            options: qOptions.map(({ questionId, isCorrect, ...rest }) => rest)
        });
    });

    // 5. تركيب النتيجة النهائية
    const reportData = attempts.map(attempt => ({
        ...attempt,
        mistakes: mistakesByAttemptMap.get(attempt.attemptId) || []
    }));

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
