import { Request, Response } from "express";
import { db } from "../../models/connection";
import { Exams, ExamSections, SectionQuestions } from "../../models/schema/admin/exams";
import { examAttempts } from "../../models/schema/admin/examAttempts";
import { studentAnswers } from "../../models/schema/admin/studentAnswers";
import { Student } from "../../models/schema/admin/Student";
import { courses } from "../../models/schema/admin/courses";
import { category } from "../../models/schema/admin/category";
import { Sections } from "../../models/schema/admin/sections";
import { questions, questionOptions } from "../../models/schema/admin/questions";
import { examCodes } from "../../models/schema/admin/examCodes";
import { eq, and, inArray, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";
import { randomUUID } from "crypto";

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

// ===================== GET ALL EXAMS (filtered by student's category) =====================
export const getExams = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);

    // 1. Get student's category
    const [student] = await db
        .select({ categoryId: Student.category, examBalance: Student.exambalance })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new NotFound("Student not found");

    // 2. Get all ancestor categories (student's category + all parents)
    const categoryIds: string[] = [];
    let currentCategoryId: string | null = student.categoryId;

    while (currentCategoryId) {
        categoryIds.push(currentCategoryId);
        const [cat] = await db
            .select({ parentCategoryId: category.parentCategoryId })
            .from(category)
            .where(eq(category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }

    // 3. Get courses that belong to the student's category hierarchy
    const studentCourses = await db
        .select({ id: courses.id })
        .from(courses)
        .where(inArray(courses.categoryId, categoryIds));

    const courseIds = studentCourses.map(c => c.id);

    if (courseIds.length === 0) {
        return SuccessResponse(res, { examBalance: student.examBalance, exams: [] });
    }

    // 4. Get active exams for those courses
    const exams = await db
        .select({
            id: Exams.id,
            title: Exams.title,
            description: Exams.description,
            duration: Exams.duration,
            totalScore: Exams.totalScore,
            passScore: Exams.passScore,
            examType: Exams.examType,
            year: Exams.year,
            month: Exams.Month,
            courseName: courses.name,
            codeName: examCodes.code,
            createdAt: Exams.createdAt,
        })
        .from(Exams)
        .leftJoin(courses, eq(Exams.courseId, courses.id))
        .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
        .where(and(
            inArray(Exams.courseId, courseIds),
            eq(Exams.isActive, true),
        ))
        .orderBy(Exams.createdAt);

    // 5. Get attempts for these exams to show status
    const examIds = exams.map(e => e.id);
    let attemptsMap = new Map<string, { status: string; score: number | null; isPassed: boolean | null }>();

    if (examIds.length > 0) {
        const attempts = await db
            .select({
                examId: examAttempts.examId,
                status: examAttempts.status,
                score: examAttempts.score,
                isPassed: examAttempts.isPassed,
            })
            .from(examAttempts)
            .where(and(
                eq(examAttempts.studentId, studentId),
                inArray(examAttempts.examId, examIds),
            ));

        for (const attempt of attempts) {
            attemptsMap.set(attempt.examId, {
                status: attempt.status,
                score: attempt.score,
                isPassed: attempt.isPassed,
            });
        }
    }

    const examsWithStatus = exams.map(exam => ({
        ...exam,
        attempt: attemptsMap.get(exam.id) ?? null,
    }));

    SuccessResponse(res, { examBalance: student.examBalance, exams: examsWithStatus });
};

// ===================== GET EXAM BY ID =====================
export const getExamById = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;

    // 1. Get student's category
    const [student] = await db
        .select({ categoryId: Student.category })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new NotFound("Student not found");

    // 2. Fetch exam with course info
    const [exam] = await db
        .select({
            id: Exams.id,
            title: Exams.title,
            description: Exams.description,
            duration: Exams.duration,
            totalScore: Exams.totalScore,
            passScore: Exams.passScore,
            examType: Exams.examType,
            year: Exams.year,
            month: Exams.Month,
            isActive: Exams.isActive,
            courseId: Exams.courseId,
            courseName: courses.name,
            courseCategoryId: courses.categoryId,
            codeName: examCodes.code,
        })
        .from(Exams)
        .leftJoin(courses, eq(Exams.courseId, courses.id))
        .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
        .where(eq(Exams.id, examId));

    if (!exam) throw new NotFound("Exam not found");
    if (!exam.isActive) throw new BadRequest("Exam is not active");

    // 3. Verify student's category matches the exam's course category
    const categoryIds: string[] = [];
    let currentCategoryId: string | null = student.categoryId;

    while (currentCategoryId) {
        categoryIds.push(currentCategoryId);
        const [cat] = await db
            .select({ parentCategoryId: category.parentCategoryId })
            .from(category)
            .where(eq(category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }

    if (!categoryIds.includes(exam.courseCategoryId!)) {
        throw new BadRequest("This exam is not available for your category");
    }

    // 4. Fetch sections with questions
    const sections = await db
        .select({
            id: ExamSections.id,
            sectionOrder: ExamSections.sectionOrder,
            sectionName: Sections.sectionName,
            sectionDescription: Sections.sectionDescription,
            sectionTime: Sections.sectionTime,
        })
        .from(ExamSections)
        .leftJoin(Sections, eq(ExamSections.sectionId, Sections.id))
        .where(eq(ExamSections.examId, examId))
        .orderBy(ExamSections.sectionOrder);

    const sectionIds = sections.map(s => s.id);

    let formattedSections: any[] = [];

    if (sectionIds.length > 0) {
        const sectionQuestions = await db
            .select({
                id: SectionQuestions.id,
                sectionId: SectionQuestions.sectionId,
                questionId: SectionQuestions.questionId,
                questionOrder: SectionQuestions.questionOrder,
                score: SectionQuestions.score,
                questionText: questions.question,
                questionImage: questions.image,
                answerType: questions.answerType,
                difficulty: questions.difficulty,
            })
            .from(SectionQuestions)
            .leftJoin(questions, eq(SectionQuestions.questionId, questions.id))
            .where(inArray(SectionQuestions.sectionId, sectionIds))
            .orderBy(SectionQuestions.questionOrder);

        // Get options for all questions
        const questionIds = sectionQuestions.map(q => q.questionId);

        let optionsMap = new Map<string, { id: string; answer: string; order: string | null }[]>();

        if (questionIds.length > 0) {
            const options = await db
                .select({
                    id: questionOptions.id,
                    questionId: questionOptions.questionId,
                    answer: questionOptions.answer,
                    order: questionOptions.order,
                })
                .from(questionOptions)
                .where(inArray(questionOptions.questionId, questionIds));

            for (const opt of options) {
                const existing = optionsMap.get(opt.questionId) ?? [];
                existing.push({ id: opt.id, answer: opt.answer, order: opt.order });
                optionsMap.set(opt.questionId, existing);
            }
        }

        formattedSections = sections.map(section => {
            const sectionQs = sectionQuestions
                .filter(sq => sq.sectionId === section.id)
                .map(sq => ({
                    ...sq,
                    options: optionsMap.get(sq.questionId) ?? [],
                }));
            return { ...section, questions: sectionQs };
        });
    }

    // 5. Check if student has an existing attempt
    const [existingAttempt] = await db
        .select({
            id: examAttempts.id,
            status: examAttempts.status,
            startedAt: examAttempts.startedAt,
            score: examAttempts.score,
            isPassed: examAttempts.isPassed,
        })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
        ));

    SuccessResponse(res, {
        exam: {
            id: exam.id,
            title: exam.title,
            description: exam.description,
            duration: exam.duration,
            totalScore: exam.totalScore,
            passScore: exam.passScore,
            examType: exam.examType,
            year: exam.year,
            month: exam.month,
            courseName: exam.courseName,
            codeName: exam.codeName,
            sections: formattedSections,
        },
        attempt: existingAttempt ?? null,
    });
};

// ===================== START EXAM =====================
export const startExam = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;

    // 1. Verify exam exists and is active
    const [exam] = await db
        .select({
            id: Exams.id,
            isActive: Exams.isActive,
            courseId: Exams.courseId,
            duration: Exams.duration,
        })
        .from(Exams)
        .where(eq(Exams.id, examId));

    if (!exam) throw new NotFound("Exam not found");
    if (!exam.isActive) throw new BadRequest("Exam is not active");

    // 2. Check student balance
    const [student] = await db
        .select({ examBalance: Student.exambalance, categoryId: Student.category })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new NotFound("Student not found");
    if (student.examBalance <= 0) throw new BadRequest("Insufficient exam balance");

    // 3. Verify category access
    const [course] = await db
        .select({ categoryId: courses.categoryId })
        .from(courses)
        .where(eq(courses.id, exam.courseId));

    if (!course) throw new NotFound("Course not found");

    const categoryIds: string[] = [];
    let currentCategoryId: string | null = student.categoryId;

    while (currentCategoryId) {
        categoryIds.push(currentCategoryId);
        const [cat] = await db
            .select({ parentCategoryId: category.parentCategoryId })
            .from(category)
            .where(eq(category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }

    if (!categoryIds.includes(course.categoryId)) {
        throw new BadRequest("This exam is not available for your category");
    }

    // 4. Check for existing in-progress attempt
    const [existingAttempt] = await db
        .select({ id: examAttempts.id, startedAt: examAttempts.startedAt })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
            eq(examAttempts.status, "in_progress"),
        ));

    if (existingAttempt) {
        // Return the existing attempt instead of creating a new one
        return SuccessResponse(res, {
            message: "Exam already in progress",
            attempt: existingAttempt,
        });
    }

    // 5. Check if already completed
    const [completedAttempt] = await db
        .select({ id: examAttempts.id })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
            eq(examAttempts.status, "completed"),
        ));

    if (completedAttempt) {
        throw new BadRequest("You have already completed this exam");
    }

    // 6. Create attempt and deduct balance in a transaction
    const attemptId = randomUUID();

    await db.transaction(async (tx) => {
        await tx.insert(examAttempts).values({
            id: attemptId,
            studentId,
            examId,
            status: "in_progress",
        });

        await tx
            .update(Student)
            .set({ exambalance: sql`${Student.exambalance} - 1` })
            .where(eq(Student.id, studentId));
    });

    SuccessResponse(res, {
        message: "Exam started successfully",
        attempt: { id: attemptId, examId, duration: exam.duration },
    }, 201);
};

// ===================== SUBMIT / END EXAM =====================
export const submitExam = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;
    const { answers } = req.body;
    // answers: { questionId: string, selectedOptionId?: string, gridInAnswer?: string }[]

    if (!Array.isArray(answers)) {
        throw new BadRequest("Answers must be an array");
    }

    // 1. Get in-progress attempt
    const [attempt] = await db
        .select({ id: examAttempts.id, startedAt: examAttempts.startedAt })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
            eq(examAttempts.status, "in_progress"),
        ));

    if (!attempt) throw new NotFound("No in-progress exam attempt found");

    // 2. Get exam details for scoring
    const [exam] = await db
        .select({ duration: Exams.duration, totalScore: Exams.totalScore, passScore: Exams.passScore })
        .from(Exams)
        .where(eq(Exams.id, examId));

    if (!exam) throw new NotFound("Exam not found");

    // 3. Check if exam time has expired
    const startedAt = new Date(attempt.startedAt).getTime();
    const now = Date.now();
    const durationMs = exam.duration * 60 * 1000;
    const isTimedOut = (now - startedAt) > durationMs;

    // 4. Get all section questions with their scores and correct answers
    const examSections = await db
        .select({ id: ExamSections.id })
        .from(ExamSections)
        .where(eq(ExamSections.examId, examId));

    const examSectionIds = examSections.map(s => s.id);

    const sectionQuestionsData = await db
        .select({
            questionId: SectionQuestions.questionId,
            score: SectionQuestions.score,
            answerType: questions.answerType,
        })
        .from(SectionQuestions)
        .leftJoin(questions, eq(SectionQuestions.questionId, questions.id))
        .where(inArray(SectionQuestions.sectionId, examSectionIds));

    // Build a map: questionId -> { score, answerType }
    const questionScoreMap = new Map(
        sectionQuestionsData.map(sq => [sq.questionId, { score: sq.score, answerType: sq.answerType }])
    );

    // 5. Get correct options for MCQ questions
    const questionIds = sectionQuestionsData.map(sq => sq.questionId);
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

    const correctOptionMap = new Map(
        correctOptions.map(opt => [opt.questionId, opt.id])
    );

    // 6. Score each answer
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

        if (!questionInfo) continue; // Skip answers for questions not in this exam

        let isCorrect = false;
        let achievedScore = 0;

        if (questionInfo.answerType === "MCQ" && selectedOptionId) {
            const correctOptionId = correctOptionMap.get(questionId);
            isCorrect = selectedOptionId === correctOptionId;
        }
        // Grid-in answers would need more complex checking logic - for now mark as needing review

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

    const isPassed = totalAchievedScore >= exam.passScore;
    const finalStatus = isTimedOut ? "timed_out" : "completed";

    // 7. Save answers and update attempt
    await db.transaction(async (tx) => {
        if (answersToInsert.length > 0) {
            await tx.insert(studentAnswers).values(answersToInsert);
        }

        await tx
            .update(examAttempts)
            .set({
                endedAt: new Date(),
                score: totalAchievedScore,
                isPassed,
                status: finalStatus,
            })
            .where(eq(examAttempts.id, attempt.id));
    });

    SuccessResponse(res, {
        message: isTimedOut ? "Exam submitted (time exceeded)" : "Exam submitted successfully",
        result: {
            attemptId: attempt.id,
            score: totalAchievedScore,
            totalScore: exam.totalScore,
            passScore: exam.passScore,
            isPassed,
            status: finalStatus,
        },
    });
};
