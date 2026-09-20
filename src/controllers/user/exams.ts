import { Request, Response } from "express";
import { db } from "../../models/connection";
import { Exams, ExamSections, SectionQuestions } from "../../models/schema/admin/exams";
import { examAttempts, sectionAttempts } from "../../models/schema/admin/examAttempts";
import { studentAnswers } from "../../models/schema/admin/studentAnswers";
import { Student } from "../../models/schema/admin/Student";
import { courses } from "../../models/schema/admin/courses";
import { category } from "../../models/schema/admin/category";
import { Sections } from "../../models/schema/admin/sections";
import { questions, questionOptions, questionAnswers, ParallelQuestion, ParallelQuestionOptions } from "../../models/schema/admin/questions";
import { lessons } from "../../models/schema/admin/lessons";
import { examCodes } from "../../models/schema/admin/examCodes";
import { studentParallelAttempts } from "../../models/schema/admin/studentParallelAttempts";
import { studentParallelAnswers } from "../../models/schema/admin/studentParallelAnswers";
import { payment } from "../../models/schema/admin/payment";
import { eq, and, inArray, sql, desc, isNull } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";
import { randomUUID } from "crypto";
import { isEquivalentGridInAnswer } from "../../utils/checkGridInAnswer";

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

// ===================== GET ALL EXAMS (filtered by student's category) =====================
export const getExams = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);

    // 1. Get student's category and balance
    const [student] = await db
        .select({ categoryId: Student.category, examBalance: Student.exambalance })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new NotFound("Student not found");

    if (student.examBalance <= 0) {
        throw new BadRequest("You do not have balance, please try to purchase an exam package.");
    }

    // 2. Build Category Hierarchy (Upwards & Downwards)
    const categoryIds: string[] = [];

    // -- Upwards: Get current category + all ancestors (Parents)
    let currentId: string | null = student.categoryId;
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

    // -- Downwards: Get direct children (Sub-categories / Grades)
    // This ensures if the exam is on a sub-level, it still appears
    const children = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.parentCategoryId, student.categoryId));

    children.forEach(child => {
        if (!categoryIds.includes(child.id)) {
            categoryIds.push(child.id);
        }
    });

    // 3. Get courses that belong to any of these categories
    const studentCourses = await db
        .select({
            id: courses.id,
            name: courses.name,
            categoryId: courses.categoryId,
            description: courses.description,
            image: courses.image,
            preRequisition: courses.preRequisition,
            whatYouGain: courses.whatYouGain,
            isHaveSemester: courses.isHaveSemester,
            createdAt: courses.createdAt,
            updatedAt: courses.updatedAt,
        })
        .from(courses)
        .where(inArray(courses.categoryId, categoryIds));

    const courseIds = studentCourses.map(c => c.id);

    // If no courses found, return early with empty courses
    if (courseIds.length === 0) {
        return SuccessResponse(res, {
            examBalance: student.examBalance,
            courses: [],
            debugInfo: { checkedCategories: categoryIds } // Optional for debugging
        });
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
            courseId: Exams.courseId,
            courseName: courses.name,
            codeName: examCodes.code,
            calculators: Exams.calculators,
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

    // 5. Get attempts for status mapping
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
            ))
            .orderBy(examAttempts.startedAt);

        for (const attempt of attempts) {
            attemptsMap.set(attempt.examId, {
                status: attempt.status,
                score: attempt.score,
                isPassed: attempt.isPassed,
            });
        }
    }

    // Map attempts back to exams
    const examsWithStatus = exams.map(exam => ({
        ...exam,
        attempt: attemptsMap.get(exam.id) ?? null,
    }));

    // Group exams by courseId
    const examsByCourse = new Map<string, typeof examsWithStatus>();
    for (const exam of examsWithStatus) {
        if (exam.courseId) {
            const list = examsByCourse.get(exam.courseId) ?? [];
            list.push(exam);
            examsByCourse.set(exam.courseId, list);
        }
    }

    // Nest exams inside their corresponding courses
    const coursesWithExams = studentCourses.map(course => ({
        ...course,
        exams: examsByCourse.get(course.id) ?? [],
    }));

    return SuccessResponse(res, {
        examBalance: student.examBalance,
        courses: coursesWithExams
    });
};

// ===================== GET EXAM BY ID =====================
export const getExamById = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;

    // 1. Get student's category and balance
    const [student] = await db
        .select({ categoryId: Student.category, examBalance: Student.exambalance })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new NotFound("Student not found");

    if (student.examBalance <= 0) {
        throw new BadRequest("You do not have balance, please try to purchase an exam package.");
    }

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
            calculators: Exams.calculators,
        })
        .from(Exams)
        .leftJoin(courses, eq(Exams.courseId, courses.id))
        .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
        .where(eq(Exams.id, examId));

    if (!exam) throw new NotFound("Exam not found");
    if (!exam.isActive) throw new BadRequest("Exam is not active");

    // 3. Verify student's category hierarchy (Parents & Children)
    const categoryIds: string[] = [];
    let currentCategoryId: string | null = student.categoryId;

    // Get Ancestors (Parents)
    while (currentCategoryId) {
        if (!categoryIds.includes(currentCategoryId)) categoryIds.push(currentCategoryId);
        const [cat]: any = await db
            .select({ parentCategoryId: category.parentCategoryId })
            .from(category)
            .where(eq(category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }

    // Get Direct Children
    const children = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.parentCategoryId, student.categoryId));

    children.forEach(c => {
        if (!categoryIds.includes(c.id)) categoryIds.push(c.id);
    });

    if (!categoryIds.includes(exam.courseCategoryId!)) {
        throw new BadRequest("This exam is not available for your category");
    }

    // 4. Fetch sections
    const sections = await db
        .select({
            id: ExamSections.id,
            sectionOrder: ExamSections.sectionOrder,
            sectionName: Sections.sectionName,
            sectionDescription: Sections.sectionDescription,
            sectionTime: Sections.sectionTime,
            durationOverride: ExamSections.duration,
            breakLimited: ExamSections.breakLimited,
            maxBreakDuration: ExamSections.maxBreakDuration,
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

        const questionIds = sectionQuestions.map(q => q.questionId);
        let optionsMap = new Map<string, any[]>();

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

            options.forEach(opt => {
                const existing = optionsMap.get(opt.questionId) || [];
                existing.push(opt);
                optionsMap.set(opt.questionId, existing);
            });
        }

        formattedSections = sections.map(section => {
            const { sectionTime, durationOverride, ...sectionRest } = section;
            return {
                ...sectionRest,
                effectiveDuration: durationOverride ?? sectionTime,
                questions: sectionQuestions
                    .filter(sq => sq.sectionId === section.id)
                    .map(sq => ({
                        ...sq,
                        options: optionsMap.get(sq.questionId) ?? [],
                    })),
            };
        });
    }

    // 5. Check for existing attempt
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
        ))
        .orderBy(desc(examAttempts.startedAt));

    return SuccessResponse(res, {
        exam: {
            ...exam,
            sections: formattedSections,
        },
        attempt: existingAttempt ?? null,
    });
};

// ===================== START EXAM =====================
export const startExam = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;

    // 1. Fetch exam with its course category in one query
    const [exam] = await db
        .select({
            id: Exams.id,
            isActive: Exams.isActive,
            duration: Exams.duration,
            courseCategoryId: courses.categoryId,
        })
        .from(Exams)
        .leftJoin(courses, eq(Exams.courseId, courses.id))
        .where(eq(Exams.id, examId));

    if (!exam) throw new NotFound("Exam not found");
    if (!exam.isActive) throw new BadRequest("Exam is not active");

    // 2. Check student info and balance
    const [student] = await db
        .select({ examBalance: Student.exambalance, categoryId: Student.category })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new NotFound("Student not found");

    // 3. Verify category access (Ancestors + Children)
    const categoryIds: string[] = [];
    let currentCategoryId: string | null = student.categoryId;

    while (currentCategoryId) {
        if (!categoryIds.includes(currentCategoryId)) categoryIds.push(currentCategoryId);
        const [cat]: any = await db
            .select({ parentCategoryId: category.parentCategoryId })
            .from(category)
            .where(eq(category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }

    const children = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.parentCategoryId, student.categoryId));

    children.forEach(c => {
        if (!categoryIds.includes(c.id)) categoryIds.push(c.id);
    });

    if (!categoryIds.includes(exam.courseCategoryId!)) {
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
        return SuccessResponse(res, {
            message: "Exam already in progress",
            attempt: {
                id: existingAttempt.id,
                examId,
                duration: exam.duration,
                startedAt: existingAttempt.startedAt
            },
        });
    }

    // 5. Check if already passed
    const [passedAttempt] = await db
        .select({ id: examAttempts.id })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
            inArray(examAttempts.status, ["completed", "timed_out"]),
            eq(examAttempts.isPassed, true)
        ));

    if (passedAttempt) {
        throw new BadRequest("You have already passed this exam. You cannot take it again.");
    }

    // Check balance only for new attempts
    if (student.examBalance <= 0) throw new BadRequest("You do not have balance, please try to purchase an exam package.");

    // 6. Create attempt and deduct balance in a transaction
    const attemptId = randomUUID();
    const startTime = new Date();

    await db.transaction(async (tx) => {
        await tx.insert(examAttempts).values({
            id: attemptId,
            studentId,
            examId,
            status: "in_progress",
            startedAt: startTime,
        });

        await tx
            .update(Student)
            .set({ exambalance: sql`${Student.exambalance} - 1` })
            .where(eq(Student.id, studentId));
    });

    return SuccessResponse(res, {
        message: "Exam started successfully",
        attempt: { id: attemptId, examId, duration: exam.duration, startedAt: startTime },
    }, 201);
};

// ===================== SUBMIT / END EXAM =====================
export const submitExam = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;
    const { answers } = req.body;

    const [attempt] = await db.select().from(examAttempts).where(and(eq(examAttempts.studentId, studentId), eq(examAttempts.examId, examId), eq(examAttempts.status, "in_progress")));
    if (!attempt) throw new NotFound("No active attempt");

    const [exam] = await db.select({ duration: Exams.duration, passScore: Exams.passScore, totalScore: Exams.totalScore }).from(Exams).where(eq(Exams.id, examId));

    const isTimedOut = (Date.now() - new Date(attempt.startedAt).getTime()) > (exam.duration * 60 * 1000);
    const sectionQs = await db.select({ qId: SectionQuestions.questionId, score: SectionQuestions.score, type: questions.answerType })
        .from(SectionQuestions).innerJoin(ExamSections, eq(SectionQuestions.sectionId, ExamSections.id))
        .leftJoin(questions, eq(SectionQuestions.questionId, questions.id)).where(eq(ExamSections.examId, examId));

    const correctOpts = await db.select().from(questionOptions).where(and(inArray(questionOptions.questionId, sectionQs.map(s => s.qId)), eq(questionOptions.isCorrect, true)));
    const correctMap = new Map(correctOpts.map(o => [o.questionId, o]));

    let totalAchievedScore = 0;
    const answersToInsert = answers.map((ans: any) => {
        const info = sectionQs.find(q => q.qId === ans.questionId);
        if (!info) return null;
        const correct = correctMap.get(ans.questionId);
        //TODO: for now we will use exact match or mathematical approximation
        //const isCorrect = info.type === "MCQ" ? ans.selectedOptionId === correct?.id : ans.gridInAnswer?.trim().toLowerCase() === correct?.answer.trim().toLowerCase();

        const isCorrect = info.type === "MCQ" ? ans.selectedOptionId === correct?.id : (ans.gridInAnswer && correct?.answer ? isEquivalentGridInAnswer(ans.gridInAnswer, correct.answer) : false);
        if (isCorrect) totalAchievedScore += info.score;
        return { id: randomUUID(), attemptId: attempt.id, questionId: ans.questionId, isCorrect, score: isCorrect ? info.score : 0, selectedOptionId: ans.selectedOptionId, gridInAnswer: ans.gridInAnswer };
    }).filter(Boolean);

    const isPassed = totalAchievedScore >= exam.passScore;
    const finalStatus = isTimedOut ? "timed_out" : "completed";

    await db.transaction(async (tx) => {
        if (answersToInsert.length > 0) await tx.insert(studentAnswers).values(answersToInsert);
        await tx.update(examAttempts).set({ endedAt: new Date(), score: totalAchievedScore, isPassed, status: finalStatus }).where(eq(examAttempts.id, attempt.id));
    });

    // ── Fetch wrong questions + enrich with hasParallel ──────────────────────────
    const wrongIds = answersToInsert.filter((a: any) => !a.isCorrect).map((a: any) => a.questionId);
    let mistakes: any[] = [];
    if (wrongIds.length > 0) {
        const qs = await db.select().from(questions).where(inArray(questions.id, wrongIds));
        const opts = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, wrongIds));
        const allMedia = await db.select().from(questionAnswers).where(inArray(questionAnswers.questionId, wrongIds));
        // Group answers by questionId as an array
        const mediaMap = new Map<string, any[]>();
        for (const m of allMedia) {
            if (!mediaMap.has(m.questionId)) mediaMap.set(m.questionId, []);
            mediaMap.get(m.questionId)!.push({
                id: m.id,
                answerPdf: m.pdf,
                answerVideo: m.video,
                answerImage: m.image,
                answerText: m.text,
            });
        }

        // Check which wrong questions have at least one parallel question
        const parallelRows = await db
            .select({ originalQuestionId: ParallelQuestion.origianlQuestionId })
            .from(ParallelQuestion)
            .where(inArray(ParallelQuestion.origianlQuestionId, wrongIds));

        const parallelQuestionIds = new Set(parallelRows.map(r => r.originalQuestionId));

        mistakes = qs.map(q => ({
            ...q,
            options: opts.filter(o => o.questionId === q.id),
            answers: mediaMap.get(q.id) ?? [],
            hasParallel: parallelQuestionIds.has(q.id),
        }));
    }

    // ── Student balances ──────────────────────────────────────────────────────────
    const [updatedStudent] = await db
        .select({ questionBalance: Student.questionbalance, examBalance: Student.exambalance })
        .from(Student)
        .where(eq(Student.id, studentId));

    // ── Check if this student's exam purchase included answers ────────────────────
    const [answersPayment] = await db
        .select({ id: payment.id })
        .from(payment)
        .where(and(
            eq(payment.studentId, studentId),
            eq(payment.purpose, "purchase"),
            eq(payment.status, "completed"),
            eq(payment.includedAnswers, true),
            eq(payment.isDeleted, false),
        ))
        .limit(1);

    return SuccessResponse(res, {
        result: {
            attemptId: attempt.id,
            score: totalAchievedScore,
            totalScore: exam.totalScore,
            passScore: exam.passScore,
            isPassed,
            status: finalStatus,
            mistakes,
            studentBalances: {
                questionBalance: updatedStudent?.questionBalance ?? 0,
                examBalance: updatedStudent?.examBalance ?? 0,
            },
            examHasAnswers: !!answersPayment,
        },
    });
};

// ===================== GET PARALLEL QUESTIONS =====================
// POST /exams/parallel/questions
// Body: { questionIds: string[], attemptId: string }
export const getParallelQuestions = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { questionIds, attemptId } = req.body;

    if (!attemptId || !Array.isArray(questionIds) || questionIds.length === 0) {
        throw new BadRequest("attemptId and a non-empty questionIds array are required");
    }

    // 1. Validate the attempt belongs to this student and is completed/timed_out
    const [attempt] = await db
        .select({ id: examAttempts.id, status: examAttempts.status })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.id, attemptId),
            eq(examAttempts.studentId, studentId),
            inArray(examAttempts.status, ["completed", "timed_out"]),
        ))
        .limit(1);

    if (!attempt) throw new NotFound("No completed exam attempt found with that ID");

    // 2. Validate all requested questionIds were actually answered wrong in this attempt
    const wrongAnswers = await db
        .select({ questionId: studentAnswers.questionId })
        .from(studentAnswers)
        .where(and(
            eq(studentAnswers.attemptId, attemptId),
            eq(studentAnswers.isCorrect, false),
            inArray(studentAnswers.questionId, questionIds),
        ));

    const validWrongIds = new Set(wrongAnswers.map(a => a.questionId));
    const invalidIds = questionIds.filter((id: string) => !validWrongIds.has(id));
    if (invalidIds.length > 0) {
        throw new BadRequest(`The following question IDs are not wrong answers from this attempt: ${invalidIds.join(", ")}`);
    }

    // 3. Find the latest parallel question for each requested original question
    const allParallels = await db
        .select({
            id: ParallelQuestion.id,
            originalQuestionId: ParallelQuestion.origianlQuestionId,
            question: ParallelQuestion.question,
            answerType: ParallelQuestion.answerType,
            difficulty: ParallelQuestion.difficulty,
            lessonId: ParallelQuestion.lessonId,
            createdAt: ParallelQuestion.createdAt,
        })
        .from(ParallelQuestion)
        .where(inArray(ParallelQuestion.origianlQuestionId, questionIds))
        .orderBy(desc(ParallelQuestion.createdAt));

    // Pick the most recent parallel per original question
    const parallelMap = new Map<string, typeof allParallels[0]>();
    for (const p of allParallels) {
        if (!parallelMap.has(p.originalQuestionId)) {
            parallelMap.set(p.originalQuestionId, p);
        }
    }

    const selectedParallels = Array.from(parallelMap.values());
    const chargeableCount = selectedParallels.length;

    if (chargeableCount === 0) {
        throw new BadRequest("None of the requested questions have parallel questions available");
    }

    // 4. Check question balance
    const [student] = await db
        .select({ questionBalance: Student.questionbalance })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new NotFound("Student not found");
    if ((student.questionBalance ?? 0) < chargeableCount) {
        throw new BadRequest(
            `Insufficient question balance. You need ${chargeableCount} but have ${student.questionBalance ?? 0}. Please purchase a question package.`
        );
    }

    // 5. Fetch options for chosen parallels (no isCorrect revealed)
    const parallelIds = selectedParallels.map(p => p.id);
    const parallelOptions = await db
        .select({
            id: ParallelQuestionOptions.id,
            questionId: ParallelQuestionOptions.questionId,
            answer: ParallelQuestionOptions.answer,
            order: ParallelQuestionOptions.order,
        })
        .from(ParallelQuestionOptions)
        .where(inArray(ParallelQuestionOptions.questionId, parallelIds));

    const optionsMap = new Map<string, typeof parallelOptions>();
    for (const opt of parallelOptions) {
        const list = optionsMap.get(opt.questionId) ?? [];
        list.push(opt);
        optionsMap.set(opt.questionId, list);
    }

    // 6. Deduct balance + create parallel attempt in a transaction
    const parallelAttemptId = randomUUID();

    await db.transaction(async (tx) => {
        await tx
            .update(Student)
            .set({ questionbalance: sql`${Student.questionbalance} - ${chargeableCount}` })
            .where(eq(Student.id, studentId));

        await tx.insert(studentParallelAttempts).values({
            id: parallelAttemptId,
            studentId,
            examAttemptId: attemptId,
            status: "in_progress",
        });
    });

    const parallelQuestions = selectedParallels.map(p => ({
        id: p.id,
        originalQuestionId: p.originalQuestionId,
        question: p.question,
        answerType: p.answerType,
        difficulty: p.difficulty,
        options: optionsMap.get(p.id) ?? [],
    }));

    return SuccessResponse(res, {
        message: "Parallel questions fetched successfully",
        parallelAttemptId,
        balanceDeducted: chargeableCount,
        remainingQuestionBalance: (student.questionBalance ?? 0) - chargeableCount,
        parallelQuestions,
    }, 201);
};

// ===================== SUBMIT PARALLEL ANSWERS =====================
// POST /exams/parallel/:parallelAttemptId/submit
// Body: { answers: [{ parallelQuestionId, selectedOptionId?, gridInAnswer? }] }
export const submitParallelAnswers = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { parallelAttemptId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
        throw new BadRequest("answers array is required");
    }

    // 1. Validate the parallel attempt belongs to this student and is in_progress
    const [parallelAttempt] = await db
        .select({ id: studentParallelAttempts.id, status: studentParallelAttempts.status })
        .from(studentParallelAttempts)
        .where(and(
            eq(studentParallelAttempts.id, parallelAttemptId),
            eq(studentParallelAttempts.studentId, studentId),
            eq(studentParallelAttempts.status, "in_progress"),
        ))
        .limit(1);

    if (!parallelAttempt) throw new NotFound("No active parallel attempt found with that ID");

    // 2. Fetch all parallel questions being answered (with their correct options)
    const parallelQuestionIds = answers.map((a: any) => a.parallelQuestionId);

    const parallelQs = await db
        .select({
            id: ParallelQuestion.id,
            originalQuestionId: ParallelQuestion.origianlQuestionId,
            question: ParallelQuestion.question,
            answerType: ParallelQuestion.answerType,
        })
        .from(ParallelQuestion)
        .where(inArray(ParallelQuestion.id, parallelQuestionIds));

    const correctParallelOpts = await db
        .select({
            id: ParallelQuestionOptions.id,
            questionId: ParallelQuestionOptions.questionId,
            answer: ParallelQuestionOptions.answer,
            order: ParallelQuestionOptions.order,
        })
        .from(ParallelQuestionOptions)
        .where(and(
            inArray(ParallelQuestionOptions.questionId, parallelQuestionIds),
            eq(ParallelQuestionOptions.isCorrect, true),
        ));

    // Fetch all options (for returning full options list in results)
    const allParallelOpts = await db
        .select({
            id: ParallelQuestionOptions.id,
            questionId: ParallelQuestionOptions.questionId,
            answer: ParallelQuestionOptions.answer,
            order: ParallelQuestionOptions.order,
            isCorrect: ParallelQuestionOptions.isCorrect,
        })
        .from(ParallelQuestionOptions)
        .where(inArray(ParallelQuestionOptions.questionId, parallelQuestionIds));

    const correctOptMap = new Map(correctParallelOpts.map(o => [o.questionId, o]));
    const allOptsMap = new Map<string, typeof allParallelOpts>();
    for (const opt of allParallelOpts) {
        const list = allOptsMap.get(opt.questionId) ?? [];
        list.push(opt);
        allOptsMap.set(opt.questionId, list);
    }

    // 3. Grade each answer
    let totalCorrect = 0;
    const answersToInsert: any[] = [];
    const results: any[] = [];

    for (const ans of answers) {
        const pq = parallelQs.find(q => q.id === ans.parallelQuestionId);
        if (!pq) continue;

        const correct = correctOptMap.get(ans.parallelQuestionId);
        const isCorrect = pq.answerType === "MCQ"
            ? ans.selectedOptionId === correct?.id
            : (ans.gridInAnswer && correct?.answer ? isEquivalentGridInAnswer(ans.gridInAnswer, correct.answer) : false);

        if (isCorrect) totalCorrect++;

        answersToInsert.push({
            id: randomUUID(),
            parallelAttemptId,
            parallelQuestionId: ans.parallelQuestionId,
            selectedOptionId: ans.selectedOptionId ?? null,
            gridInAnswer: ans.gridInAnswer ?? null,
            isCorrect,
            score: isCorrect ? 1 : 0,
        });

        const selectedOpt = ans.selectedOptionId
            ? (allOptsMap.get(pq.id) ?? []).find(o => o.id === ans.selectedOptionId)
            : null;

        results.push({
            parallelQuestionId: pq.id,
            originalQuestionId: pq.originalQuestionId,
            question: pq.question,
            answerType: pq.answerType,
            isCorrect,
            yourAnswer: pq.answerType === "MCQ"
                ? (selectedOpt ? { id: selectedOpt.id, answer: selectedOpt.answer, order: selectedOpt.order } : null)
                : (ans.gridInAnswer ?? null),
            correctAnswer: correct ? { id: correct.id, answer: correct.answer, order: correct.order } : null,
            options: allOptsMap.get(pq.id) ?? [],
        });
    }

    // 4. Persist answers + mark parallel attempt as completed
    await db.transaction(async (tx) => {
        if (answersToInsert.length > 0) {
            await tx.insert(studentParallelAnswers).values(answersToInsert);
        }
        await tx
            .update(studentParallelAttempts)
            .set({ status: "completed" })
            .where(eq(studentParallelAttempts.id, parallelAttemptId));
    });

    return SuccessResponse(res, {
        message: "Parallel answers submitted successfully",
        parallelAttemptId,
        totalQuestions: results.length,
        totalCorrect,
        totalWrong: results.length - totalCorrect,
        results,
    });
};

// ===================== GET EXAM ATTEMPT ANSWERS =====================
// GET /exams/:examId/attempts/:attemptId/answers
export const getExamAttemptAnswers = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId, attemptId } = req.params;

    // 1. Validate the attempt belongs to this student and is completed
    const [attempt] = await db
        .select({ id: examAttempts.id, status: examAttempts.status })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.id, attemptId),
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
            inArray(examAttempts.status, ["completed", "timed_out"]),
        ))
        .limit(1);

    if (!attempt) throw new NotFound("No completed exam attempt found");

    // 2. Check the student has a completed exam purchase with includedAnswers = true
    const [answersPayment] = await db
        .select({ id: payment.id, includedAnswers: payment.includedAnswers })
        .from(payment)
        .where(and(
            eq(payment.studentId, studentId),
            eq(payment.purpose, "purchase"),
            eq(payment.status, "completed"),
            eq(payment.includedAnswers, true),
            eq(payment.isDeleted, false),
        ))
        .limit(1);

    if (!answersPayment) {
        throw new BadRequest(
            "Your exam package does not include answers. Please purchase a package with answers to access this feature."
        );
    }

    // 3. Fetch all section questions for this exam (with their lesson info)
    const sectionQs = await db
        .select({
            questionId: SectionQuestions.questionId,
            questionOrder: SectionQuestions.questionOrder,
            score: SectionQuestions.score,
            sectionId: SectionQuestions.sectionId,
            questionText: questions.question,
            questionImage: questions.image,
            answerType: questions.answerType,
            difficulty: questions.difficulty,
            lessonId: questions.lessonId,
            lessonName: lessons.name,
        })
        .from(SectionQuestions)
        .innerJoin(ExamSections, eq(SectionQuestions.sectionId, ExamSections.id))
        .leftJoin(questions, eq(SectionQuestions.questionId, questions.id))
        .leftJoin(lessons, eq(questions.lessonId, lessons.id))
        .where(eq(ExamSections.examId, examId))
        .orderBy(SectionQuestions.questionOrder);

    const allQuestionIds = sectionQs.map(q => q.questionId);

    if (allQuestionIds.length === 0) {
        return SuccessResponse(res, { message: "No questions found for this exam", questions: [] });
    }

    // 4. Fetch correct options + all options + explanations
    const [allOptions, correctOptions, explanations] = await Promise.all([
        db.select({
            id: questionOptions.id,
            questionId: questionOptions.questionId,
            answer: questionOptions.answer,
            order: questionOptions.order,
            isCorrect: questionOptions.isCorrect,
        }).from(questionOptions).where(inArray(questionOptions.questionId, allQuestionIds)),

        db.select({
            id: questionOptions.id,
            questionId: questionOptions.questionId,
            answer: questionOptions.answer,
            order: questionOptions.order,
        }).from(questionOptions).where(and(
            inArray(questionOptions.questionId, allQuestionIds),
            eq(questionOptions.isCorrect, true),
        )),

        db.select({
            id: questionAnswers.id,
            questionId: questionAnswers.questionId,
            answerPdf: questionAnswers.pdf,
            answerVideo: questionAnswers.video,
            answerImage: questionAnswers.image,
            answerText: questionAnswers.text,
        }).from(questionAnswers).where(inArray(questionAnswers.questionId, allQuestionIds)),
    ]);

    // 5. Fetch this student's submitted answers for the attempt
    const submittedAnswers = await db
        .select({
            questionId: studentAnswers.questionId,
            selectedOptionId: studentAnswers.selectedOptionId,
            gridInAnswer: studentAnswers.gridInAnswer,
            isCorrect: studentAnswers.isCorrect,
            score: studentAnswers.score,
        })
        .from(studentAnswers)
        .where(eq(studentAnswers.attemptId, attemptId));

    // 6. Build lookup maps
    const allOptsMap = new Map<string, typeof allOptions>();
    for (const opt of allOptions) {
        const list = allOptsMap.get(opt.questionId) ?? [];
        list.push(opt);
        allOptsMap.set(opt.questionId, list);
    }

    const correctOptMap = new Map(correctOptions.map(o => [o.questionId, o]));

    const explanationsMap = new Map<string, typeof explanations>();
    for (const exp of explanations) {
        const list = explanationsMap.get(exp.questionId) ?? [];
        list.push(exp);
        explanationsMap.set(exp.questionId, list);
    }

    const submittedMap = new Map(submittedAnswers.map(a => [a.questionId, a]));

    // 7. Assemble final result
    const questionsWithAnswers = sectionQs.map(q => {
        const studentAnswer = submittedMap.get(q.questionId) ?? null;
        const correctOpt = correctOptMap.get(q.questionId) ?? null;

        return {
            questionId: q.questionId,
            questionOrder: q.questionOrder,
            score: q.score,
            questionText: q.questionText,
            questionImage: q.questionImage,
            answerType: q.answerType,
            difficulty: q.difficulty,
            lessonId: q.lessonId,
            lessonName: q.lessonName,
            options: allOptsMap.get(q.questionId) ?? [],
            correctAnswer: correctOpt,
            studentAnswer: studentAnswer
                ? {
                    selectedOptionId: studentAnswer.selectedOptionId,
                    gridInAnswer: studentAnswer.gridInAnswer,
                    isCorrect: studentAnswer.isCorrect,
                    scoreEarned: studentAnswer.score,
                }
                : null,
            explanation: explanationsMap.get(q.questionId) ?? [],
        };
    });

    // 8. Build recommendedLessonsToStudy from incorrectly answered questions
    const seenLessonIds = new Set<string>();
    const recommendedLessonsToStudy: { lessonId: string; lessonName: string }[] = [];

    for (const q of sectionQs) {
        if (!q.lessonId || !q.lessonName) continue;
        if (seenLessonIds.has(q.lessonId)) continue;

        const studentAnswer = submittedMap.get(q.questionId);
        const answeredIncorrectly = !studentAnswer || studentAnswer.isCorrect === false;

        if (answeredIncorrectly) {
            seenLessonIds.add(q.lessonId);
            recommendedLessonsToStudy.push({
                lessonId: q.lessonId,
                lessonName: q.lessonName,
            });
        }
    }

    return SuccessResponse(res, {
        message: "Exam answers retrieved successfully",
        attemptId,
        examId,
        questions: questionsWithAnswers,
        recommendedLessonsToStudy,
    });
};

// ===================== SHOW QUESTION ANSWER =====================
export const showQuestionAnswer = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { questionId } = req.params;

    // 1. خصم الرصيد داخل Transaction
    await db.transaction(async (tx) => {
        const [student] = await tx
            .select({ questionBalance: Student.questionbalance })
            .from(Student)
            .where(eq(Student.id, studentId));

        if (!student || (student.questionBalance ?? 0) <= 0) {
            throw new BadRequest("Insufficient question balance");
        }

        await tx.update(Student)
            .set({ questionbalance: sql`${Student.questionbalance} - 1` })
            .where(eq(Student.id, studentId));
    });

    // 2. جلب الخيار الصحيح (لـ MCQ والـ Grid in)
    const correctOptions = await db
        .select({
            id: questionOptions.id,
            answer: questionOptions.answer,
        })
        .from(questionOptions)
        .where(and(
            eq(questionOptions.questionId, questionId),
            eq(questionOptions.isCorrect, true)
        ));

    // 3. Fetch all answer objects as an array for this question
    const answers = await db
        .select({
            id: questionAnswers.id,
            answerPdf: questionAnswers.pdf,
            answerVideo: questionAnswers.video,
            answerImage: questionAnswers.image,
            answerText: questionAnswers.text,
        })
        .from(questionAnswers)
        .where(eq(questionAnswers.questionId, questionId));

    // 4. جلب إجابة الطالب (إن وجدت)
    const [latestStudentAnswer] = await db
        .select({
            selectedOptionId: studentAnswers.selectedOptionId,
            gridInAnswer: studentAnswers.gridInAnswer,
        })
        .from(studentAnswers)
        .innerJoin(examAttempts, eq(studentAnswers.attemptId, examAttempts.id))
        .where(and(
            eq(studentAnswers.questionId, questionId),
            eq(examAttempts.studentId, studentId)
        ))
        .orderBy(desc(studentAnswers.createdAt))
        .limit(1);

    SuccessResponse(res, {
        message: "Answer and explanations revealed",
        result: {
            correctOptions,
            studentAnswer: latestStudentAnswer ?? req.body.studentAnswer ?? null,
            explanation: answers ?? [] // array of answer objects: [{ id, answerPdf, answerVideo, answerImage, answerText }]
        },
    });
};

// ===================== GET EXAM ATTEMPTS HISTORY =====================
// GET /exams/attempts
export const getExamAttemptsHistory = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const examId = req.query.examId as string | undefined;

    const whereCondition = and(
        eq(examAttempts.studentId, studentId),
        examId ? eq(examAttempts.examId, examId) : undefined
    );

    const attempts = await db
        .select({
            id: examAttempts.id,
            examId: examAttempts.examId,
            score: examAttempts.score,
            isPassed: examAttempts.isPassed,
            status: examAttempts.status,
            startedAt: examAttempts.startedAt,
            endedAt: examAttempts.endedAt,
            createdAt: examAttempts.createdAt,
            exam: {
                id: Exams.id,
                title: Exams.title,
                description: Exams.description,
                duration: Exams.duration,
                totalScore: Exams.totalScore,
                passScore: Exams.passScore,
                examType: Exams.examType,
                year: Exams.year,
                month: Exams.Month,
                courseId: Exams.courseId,
                courseName: courses.name,
                codeName: examCodes.code,
            },
        })
        .from(examAttempts)
        .leftJoin(Exams, eq(examAttempts.examId, Exams.id))
        .leftJoin(courses, eq(Exams.courseId, courses.id))
        .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
        .where(whereCondition)
        .orderBy(desc(examAttempts.startedAt));

    return SuccessResponse(res, {
        message: "Exam attempts history retrieved successfully",
        attempts,
    });
};

// ===================== helper: duplicate-key detection =====================
// MySQL duplicate-key errors carry code 'ER_DUP_ENTRY' (errno 1062).
const isDuplicateKeyError = (err: any): boolean =>
    err?.code === "ER_DUP_ENTRY" || err?.errno === 1062;

// ===================== FINALIZE EXAM ATTEMPT (private helper) =====================
// Must be called from INSIDE the same transaction as the section update that
// triggers it, so the section-close + all-done check + exam-close all commit
// or roll back together.
// Typed as `typeof db` rather than a nested Parameters<> extraction — drizzle's
// db.transaction is generic, and extracting the tx type via
// Parameters<Parameters<typeof db.transaction>[0]>[0] fails to resolve
// properly in some drizzle/TS versions, causing query results to collapse to
// `never`. `tx` shares the same query-builder surface as `db` for our purposes
// (select/insert/update), so this works cleanly.
// We use Omit<typeof db, '$client'> so the function accepts both the full db
// instance AND a MySqlTransaction (which lacks $client) without error.
type FinalizeExamResult = {
    exam: { passScore: number; totalScore: number };
    totalScore: number;
    isPassed: boolean;
    examFinalStatus: string;
    endedAt: Date;
};

const finalizeExamAttempt = async (
    tx: Omit<typeof db, "$client">,
    { attemptId, examId }: { attemptId: string; examId: string },
): Promise<FinalizeExamResult> => {
    const [exam] = await tx
        .select({ passScore: Exams.passScore, totalScore: Exams.totalScore })
        .from(Exams)
        .where(eq(Exams.id, examId))
        .limit(1);

    if (!exam) throw new NotFound("Exam not found");

    const allSectionAttempts = await tx
        .select({ score: sectionAttempts.score, status: sectionAttempts.status })
        .from(sectionAttempts)
        .where(eq(sectionAttempts.attemptId, attemptId));

    const totalScore = allSectionAttempts.reduce((sum, s) => sum + (s.score ?? 0), 0);
    const anyTimedOut = allSectionAttempts.some(s => s.status === "timed_out");
    const examFinalStatus = anyTimedOut ? "timed_out" : "completed";
    const isPassed = totalScore >= exam.passScore;
    const endedAt = new Date();

    await tx
        .update(examAttempts)
        .set({ status: examFinalStatus, score: totalScore, isPassed, endedAt })
        .where(eq(examAttempts.id, attemptId));

    return { exam, totalScore, isPassed, examFinalStatus, endedAt };
};

// ===================== START SECTION =====================
// POST /exams/:examId/attempts/:attemptId/sections/:examSectionId/start
export const startSection = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId, attemptId, examSectionId } = req.params;

    // 1. Verify the exam attempt belongs to this student and is in_progress
    const [attempt] = await db
        .select({ id: examAttempts.id, status: examAttempts.status })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.id, attemptId),
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
            eq(examAttempts.status, "in_progress"),
        ))
        .limit(1);

    if (!attempt) throw new NotFound("No active exam attempt found");

    // 2. Verify the section belongs to this exam; fetch effective duration + break config
    const [examSection] = await db
        .select({
            id: ExamSections.id,
            duration: ExamSections.duration,
            sectionTime: Sections.sectionTime,
            breakLimited: ExamSections.breakLimited,
            maxBreakDuration: ExamSections.maxBreakDuration,
        })
        .from(ExamSections)
        .leftJoin(Sections, eq(ExamSections.sectionId, Sections.id))
        .where(and(
            eq(ExamSections.id, examSectionId),
            eq(ExamSections.examId, examId),
        ))
        .limit(1);

    if (!examSection) throw new NotFound("Section not found in this exam");

    const effectiveDuration = examSection.duration ?? examSection.sectionTime; // minutes

    // 3. Check for an existing section attempt
    const [existingSectionAttempt] = await db
        .select()
        .from(sectionAttempts)
        .where(and(
            eq(sectionAttempts.attemptId, attemptId),
            eq(sectionAttempts.examSectionId, examSectionId),
        ))
        .limit(1);

    if (existingSectionAttempt) {
        if (existingSectionAttempt.status === "in_progress") {
            const elapsedMs = existingSectionAttempt.startedAt
                ? Date.now() - new Date(existingSectionAttempt.startedAt).getTime()
                : 0;
            const remainingMs = (effectiveDuration! * 60 * 1000) - elapsedMs;

            if (remainingMs <= 0) {
                await db.update(sectionAttempts)
                    .set({ status: "timed_out", endedAt: new Date() })
                    .where(eq(sectionAttempts.id, existingSectionAttempt.id));
                throw new BadRequest("Section time has expired");
            }

            return SuccessResponse(res, {
                message: "Resuming section in progress",
                sectionAttempt: {
                    id: existingSectionAttempt.id,
                    startedAt: existingSectionAttempt.startedAt,
                    effectiveDuration,
                    remainingSeconds: Math.floor(remainingMs / 1000),
                    breakLimited: examSection.breakLimited,
                    maxBreakDuration: examSection.maxBreakDuration,
                },
            });
        }

        if (existingSectionAttempt.status === "on_break") {
            if (examSection.breakLimited && examSection.maxBreakDuration && existingSectionAttempt.breakStartedAt) {
                const breakElapsedMs = Date.now() - new Date(existingSectionAttempt.breakStartedAt).getTime();
                const maxBreakMs = examSection.maxBreakDuration * 60 * 1000;
                if (breakElapsedMs > maxBreakMs) {
                    await db.update(sectionAttempts)
                        .set({ status: "timed_out", endedAt: new Date() })
                        .where(eq(sectionAttempts.id, existingSectionAttempt.id));
                    throw new BadRequest("Break time exceeded. This section has been marked as timed out.");
                }
            }

            await db.update(sectionAttempts)
                .set({ status: "in_progress", breakStartedAt: null })
                .where(eq(sectionAttempts.id, existingSectionAttempt.id));

            const elapsedMs = existingSectionAttempt.startedAt
                ? Date.now() - new Date(existingSectionAttempt.startedAt).getTime()
                : 0;
            const remainingMs = (effectiveDuration! * 60 * 1000) - elapsedMs;

            return SuccessResponse(res, {
                message: "Section resumed after break",
                sectionAttempt: {
                    id: existingSectionAttempt.id,
                    startedAt: existingSectionAttempt.startedAt,
                    effectiveDuration,
                    remainingSeconds: Math.floor(remainingMs / 1000),
                },
            });
        }

        throw new BadRequest(`Cannot enter this section. Current status: ${existingSectionAttempt.status}`);
    }

    // 4. Enforce section ordering — student must complete sections in order
    const allExamSections = await db
        .select({ id: ExamSections.id, sectionOrder: ExamSections.sectionOrder })
        .from(ExamSections)
        .where(eq(ExamSections.examId, examId))
        .orderBy(ExamSections.sectionOrder);

    const completedSectionAttempts = await db
        .select({ examSectionId: sectionAttempts.examSectionId })
        .from(sectionAttempts)
        .where(and(
            eq(sectionAttempts.attemptId, attemptId),
            inArray(sectionAttempts.status, ["completed", "timed_out"]),
        ));

    const completedSectionIds = new Set(completedSectionAttempts.map(s => s.examSectionId));
    const firstIncomplete = allExamSections.find(s => !completedSectionIds.has(s.id));

    if (firstIncomplete && firstIncomplete.id !== examSectionId) {
        throw new BadRequest("You must complete previous sections first");
    }

    // 5. Create a fresh section attempt (guarded against race duplicates by the unique index)
    const sectionAttemptId = randomUUID();
    const now = new Date();

    try {
        await db.insert(sectionAttempts).values({
            id: sectionAttemptId,
            attemptId,
            examSectionId,
            startedAt: now,
            status: "in_progress",
        });
    } catch (err) {
        if (isDuplicateKeyError(err)) {
            throw new BadRequest("This section has already been started. Please refresh and try again.");
        }
        throw err;
    }

    return SuccessResponse(res, {
        message: "Section started successfully",
        sectionAttempt: {
            id: sectionAttemptId,
            startedAt: now,
            effectiveDuration,
            remainingSeconds: effectiveDuration! * 60,
            breakLimited: examSection.breakLimited,
            maxBreakDuration: examSection.maxBreakDuration,
        },
    }, 201);
};

// ===================== SUBMIT SECTION =====================
// POST /exams/:examId/attempts/:attemptId/sections/:examSectionId/submit
// Body: { answers: [{ questionId, selectedOptionId?, gridInAnswer? }] }
export const submitSection = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId, attemptId, examSectionId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) throw new BadRequest("answers array is required");

    // 1. Verify exam attempt
    const [attempt] = await db
        .select({ id: examAttempts.id })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.id, attemptId),
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
            eq(examAttempts.status, "in_progress"),
        ))
        .limit(1);

    if (!attempt) throw new NotFound("No active exam attempt found");

    // 2. Find the active section attempt (in_progress or on_break)
    const [sectionAttempt] = await db
        .select()
        .from(sectionAttempts)
        .where(and(
            eq(sectionAttempts.attemptId, attemptId),
            eq(sectionAttempts.examSectionId, examSectionId),
            inArray(sectionAttempts.status, ["in_progress", "on_break"]),
        ))
        .limit(1);

    if (!sectionAttempt) throw new NotFound("No active section attempt found");

    // 3. Fetch effective duration to determine if timed out
    const [examSection] = await db
        .select({
            duration: ExamSections.duration,
            sectionTime: Sections.sectionTime,
        })
        .from(ExamSections)
        .leftJoin(Sections, eq(ExamSections.sectionId, Sections.id))
        .where(eq(ExamSections.id, examSectionId))
        .limit(1);

    const effectiveDuration = (examSection?.duration ?? examSection?.sectionTime) ?? 0;
    const elapsedMs = sectionAttempt.startedAt
        ? Date.now() - new Date(sectionAttempt.startedAt).getTime()
        : 0;
    const isTimedOut = elapsedMs > effectiveDuration * 60 * 1000;

    // 4. Fetch questions for this exam section
    const sectionQs = await db
        .select({ qId: SectionQuestions.questionId, score: SectionQuestions.score, type: questions.answerType })
        .from(SectionQuestions)
        .leftJoin(questions, eq(SectionQuestions.questionId, questions.id))
        .where(eq(SectionQuestions.sectionId, examSectionId));

    const questionIds = sectionQs.map(q => q.qId);
    const correctOpts = await db
        .select()
        .from(questionOptions)
        .where(and(inArray(questionOptions.questionId, questionIds), eq(questionOptions.isCorrect, true)));

    const correctMap = new Map(correctOpts.map(o => [o.questionId, o]));

    // 5. Grade answers
    let sectionScore = 0;
    const answersToInsert = answers.map((ans: any) => {
        const info = sectionQs.find(q => q.qId === ans.questionId);
        if (!info) return null;
        const correct = correctMap.get(ans.questionId);
        const isCorrect = info.type === "MCQ"
            ? ans.selectedOptionId === correct?.id
            : (ans.gridInAnswer && correct?.answer ? isEquivalentGridInAnswer(ans.gridInAnswer, correct.answer) : false);
        if (isCorrect) sectionScore += info.score;
        return {
            id: randomUUID(),
            attemptId,
            questionId: ans.questionId,
            isCorrect,
            score: isCorrect ? info.score : 0,
            selectedOptionId: ans.selectedOptionId ?? null,
            gridInAnswer: ans.gridInAnswer ?? null,
        };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    const sectionFinalStatus = isTimedOut ? "timed_out" : "completed";
    const now = new Date();

    // 6-8. SINGLE transaction: persist answers → close section → check allDone → finalize exam if last section
    let examFinalizeResult: FinalizeExamResult | null = null;

    try {
        examFinalizeResult = await db.transaction(async (tx) => {
            if (answersToInsert.length > 0) {
                await tx.insert(studentAnswers).values(answersToInsert);
            }

            await tx.update(sectionAttempts)
                .set({ status: sectionFinalStatus, score: sectionScore, endedAt: now, breakStartedAt: null })
                .where(eq(sectionAttempts.id, sectionAttempt.id));

            // Check whether ALL exam sections now have a completed/timed_out row — inside the same tx
            const allExamSections = await tx
                .select({ id: ExamSections.id })
                .from(ExamSections)
                .where(eq(ExamSections.examId, examId));

            const doneSectionAttempts = await tx
                .select({ examSectionId: sectionAttempts.examSectionId })
                .from(sectionAttempts)
                .where(and(
                    eq(sectionAttempts.attemptId, attemptId),
                    inArray(sectionAttempts.status, ["completed", "timed_out"]),
                ));

            const doneIds = new Set(doneSectionAttempts.map(s => s.examSectionId));
            const allDone = allExamSections.every(s => doneIds.has(s.id));

            if (allDone) {
                return await finalizeExamAttempt(tx, { attemptId, examId });
            }
            return null;
        });
    } catch (err) {
        if (isDuplicateKeyError(err)) {
            throw new BadRequest("This section was already submitted.");
        }
        throw err;
    }

    const sectionResult = {
        sectionAttemptId: sectionAttempt.id,
        examSectionId,
        score: sectionScore,
        status: sectionFinalStatus,
        endedAt: now,
    };

    if (!examFinalizeResult) {
        // Not the last section — return per-section result only
        return SuccessResponse(res, {
            message: `Section ${sectionFinalStatus === "completed" ? "submitted" : "timed out"} successfully`,
            sectionResult,
        });
    }

    // 9. Last section was closed — exam is now finalized. Enrich the response with mistakes/balances.
    const { exam, totalScore, isPassed, examFinalStatus, endedAt: examEndedAt } = examFinalizeResult;

    const allWrongAnswers = await db
        .select({ questionId: studentAnswers.questionId })
        .from(studentAnswers)
        .where(and(
            eq(studentAnswers.attemptId, attemptId),
            eq(studentAnswers.isCorrect, false),
        ));

    const wrongIds = allWrongAnswers.map(a => a.questionId);
    let mistakes: any[] = [];

    if (wrongIds.length > 0) {
        const qs = await db.select().from(questions).where(inArray(questions.id, wrongIds));
        const opts = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, wrongIds));
        const allMedia = await db.select().from(questionAnswers).where(inArray(questionAnswers.questionId, wrongIds));

        const mediaMap = new Map<string, any[]>();
        for (const m of allMedia) {
            if (!mediaMap.has(m.questionId)) mediaMap.set(m.questionId, []);
            mediaMap.get(m.questionId)!.push({
                id: m.id,
                answerPdf: m.pdf,
                answerVideo: m.video,
                answerImage: m.image,
                answerText: m.text,
            });
        }

        const parallelRows = await db
            .select({ originalQuestionId: ParallelQuestion.origianlQuestionId })
            .from(ParallelQuestion)
            .where(inArray(ParallelQuestion.origianlQuestionId, wrongIds));

        const parallelQuestionIds = new Set(parallelRows.map(r => r.originalQuestionId));

        mistakes = qs.map(q => ({
            ...q,
            options: opts.filter(o => o.questionId === q.id),
            answers: mediaMap.get(q.id) ?? [],
            hasParallel: parallelQuestionIds.has(q.id),
        }));
    }

    const [updatedStudent] = await db
        .select({ questionBalance: Student.questionbalance, examBalance: Student.exambalance })
        .from(Student)
        .where(eq(Student.id, studentId));

    const [answersPayment] = await db
        .select({ id: payment.id })
        .from(payment)
        .where(and(
            eq(payment.studentId, studentId),
            eq(payment.purpose, "purchase"),
            eq(payment.status, "completed"),
            eq(payment.includedAnswers, true),
            eq(payment.isDeleted, false),
        ))
        .limit(1);

    return SuccessResponse(res, {
        message: "Exam completed successfully",
        sectionResult,
        examResult: {
            attemptId,
            score: totalScore,
            totalScore: exam?.totalScore ?? 0,
            passScore: exam?.passScore ?? 0,
            isPassed,
            status: examFinalStatus,
            endedAt: examEndedAt,
            mistakes,
            studentBalances: {
                questionBalance: updatedStudent?.questionBalance ?? 0,
                examBalance: updatedStudent?.examBalance ?? 0,
            },
            examHasAnswers: !!answersPayment,
        },
    });
};

// ===================== START BREAK =====================
// POST /exams/:examId/attempts/:attemptId/sections/:examSectionId/break
// Called when the student wants to pause the currently in-progress section
// and resume it later (via startSection, which clears breakStartedAt).
export const startBreak = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { examId, attemptId, examSectionId } = req.params;

    // 1. Verify exam attempt belongs to this student and is in_progress
    const [attempt] = await db
        .select({ id: examAttempts.id })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.id, attemptId),
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
            eq(examAttempts.status, "in_progress"),
        ))
        .limit(1);

    if (!attempt) throw new NotFound("No active exam attempt found");

    // 2. Fetch the section attempt + break config together
    const [row] = await db
        .select({
            sectionAttemptId: sectionAttempts.id,
            sectionAttemptStatus: sectionAttempts.status,
            startedAt: sectionAttempts.startedAt,
            duration: ExamSections.duration,
            sectionTime: Sections.sectionTime,
            breakLimited: ExamSections.breakLimited,
            maxBreakDuration: ExamSections.maxBreakDuration,
        })
        .from(sectionAttempts)
        .innerJoin(ExamSections, eq(sectionAttempts.examSectionId, ExamSections.id))
        .leftJoin(Sections, eq(ExamSections.sectionId, Sections.id))
        .where(and(
            eq(sectionAttempts.attemptId, attemptId),
            eq(sectionAttempts.examSectionId, examSectionId),
            eq(ExamSections.examId, examId),
        ))
        .limit(1);

    if (!row) throw new NotFound("No section attempt found for this section");

    if (row.sectionAttemptStatus !== "in_progress") {
        throw new BadRequest(`Cannot start a break. Current section status: ${row.sectionAttemptStatus}`);
    }

    // 3. Guard: don't allow a break if the section's own time has already run out —
    //    force a proper timeout instead of letting the student "hide" in a break.
    const effectiveDuration = row.duration ?? row.sectionTime ?? 0;
    const elapsedMs = row.startedAt ? Date.now() - new Date(row.startedAt).getTime() : 0;

    if (elapsedMs > effectiveDuration * 60 * 1000) {
        await db.update(sectionAttempts)
            .set({ status: "timed_out", endedAt: new Date() })
            .where(and(
                eq(sectionAttempts.id, row.sectionAttemptId),
                eq(sectionAttempts.status, "in_progress"), // atomic guard against a race
            ));
        throw new BadRequest("Section time has already expired; cannot start a break.");
    }

    // 4. Flip to on_break atomically — the status condition in WHERE prevents
    //    a race where two concurrent requests both think they started the break.
    const now = new Date();
    const updateResult = await db.update(sectionAttempts)
        .set({ status: "on_break", breakStartedAt: now })
        .where(and(
            eq(sectionAttempts.id, row.sectionAttemptId),
            eq(sectionAttempts.status, "in_progress"),
        ));

    // Drizzle's mysql2 driver returns affectedRows on the result; if another
    // request won the race and already changed the status, treat as a conflict.
    const affectedRows = (updateResult as any)?.[0]?.affectedRows ?? (updateResult as any)?.affectedRows;
    if (affectedRows === 0) {
        throw new BadRequest("Could not start break — section state changed. Please refresh and try again.");
    }

    return SuccessResponse(res, {
        message: "Break started",
        breakStartedAt: now,
        breakLimited: row.breakLimited ?? false,
        maxBreakDurationMinutes: row.maxBreakDuration ?? null,
    });
};