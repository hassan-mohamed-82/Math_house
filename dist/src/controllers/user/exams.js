"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBreak = exports.submitSection = exports.startSection = exports.getExamAttemptsHistory = exports.showQuestionAnswer = exports.getExamAttemptAnswers = exports.submitParallelAnswers = exports.getParallelQuestions = exports.submitExam = exports.startExam = exports.getExamById = exports.getExams = void 0;
const connection_1 = require("../../models/connection");
const exams_1 = require("../../models/schema/admin/exams");
const examAttempts_1 = require("../../models/schema/admin/examAttempts");
const studentAnswers_1 = require("../../models/schema/admin/studentAnswers");
const Student_1 = require("../../models/schema/admin/Student");
const courses_1 = require("../../models/schema/admin/courses");
const category_1 = require("../../models/schema/admin/category");
const sections_1 = require("../../models/schema/admin/sections");
const questions_1 = require("../../models/schema/admin/questions");
const lessons_1 = require("../../models/schema/admin/lessons");
const examCodes_1 = require("../../models/schema/admin/examCodes");
const studentParallelAttempts_1 = require("../../models/schema/admin/studentParallelAttempts");
const studentParallelAnswers_1 = require("../../models/schema/admin/studentParallelAnswers");
const payment_1 = require("../../models/schema/admin/payment");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const crypto_1 = require("crypto");
const checkGridInAnswer_1 = require("../../utils/checkGridInAnswer");
const getStudentId = (req) => {
    if (!req.user?.id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return req.user.id;
};
// ===================== GET ALL EXAMS (filtered by student's category) =====================
const getExams = async (req, res) => {
    const studentId = getStudentId(req);
    // 1. Get student's category and balance
    const [student] = await connection_1.db
        .select({ categoryId: Student_1.Student.category, examBalance: Student_1.Student.exambalance })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (!student)
        throw new Errors_1.NotFound("Student not found");
    if (student.examBalance <= 0) {
        throw new Errors_1.BadRequest("You do not have balance, please try to purchase an exam package.");
    }
    // 2. Build Category Hierarchy (Upwards & Downwards)
    const categoryIds = [];
    // -- Upwards: Get current category + all ancestors (Parents)
    let currentId = student.categoryId;
    while (currentId) {
        if (!categoryIds.includes(currentId)) {
            categoryIds.push(currentId);
        }
        const [cat] = await connection_1.db
            .select({ parentCategoryId: category_1.category.parentCategoryId })
            .from(category_1.category)
            .where((0, drizzle_orm_1.eq)(category_1.category.id, currentId));
        currentId = cat?.parentCategoryId ?? null;
    }
    // -- Downwards: Get direct children (Sub-categories / Grades)
    // This ensures if the exam is on a sub-level, it still appears
    const children = await connection_1.db
        .select({ id: category_1.category.id })
        .from(category_1.category)
        .where((0, drizzle_orm_1.eq)(category_1.category.parentCategoryId, student.categoryId));
    children.forEach(child => {
        if (!categoryIds.includes(child.id)) {
            categoryIds.push(child.id);
        }
    });
    // 3. Get courses that belong to any of these categories
    const studentCourses = await connection_1.db
        .select({
        id: courses_1.courses.id,
        name: courses_1.courses.name,
        categoryId: courses_1.courses.categoryId,
        description: courses_1.courses.description,
        image: courses_1.courses.image,
        preRequisition: courses_1.courses.preRequisition,
        whatYouGain: courses_1.courses.whatYouGain,
        isHaveSemester: courses_1.courses.isHaveSemester,
        createdAt: courses_1.courses.createdAt,
        updatedAt: courses_1.courses.updatedAt,
    })
        .from(courses_1.courses)
        .where((0, drizzle_orm_1.inArray)(courses_1.courses.categoryId, categoryIds));
    const courseIds = studentCourses.map(c => c.id);
    // If no courses found, return early with empty courses
    if (courseIds.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
            examBalance: student.examBalance,
            courses: [],
            debugInfo: { checkedCategories: categoryIds } // Optional for debugging
        });
    }
    // 4. Get active exams for those courses
    const exams = await connection_1.db
        .select({
        id: exams_1.Exams.id,
        title: exams_1.Exams.title,
        description: exams_1.Exams.description,
        duration: exams_1.Exams.duration,
        totalScore: exams_1.Exams.totalScore,
        passScore: exams_1.Exams.passScore,
        examType: exams_1.Exams.examType,
        year: exams_1.Exams.year,
        month: exams_1.Exams.Month,
        courseId: exams_1.Exams.courseId,
        courseName: courses_1.courses.name,
        codeName: examCodes_1.examCodes.code,
        calculators: exams_1.Exams.calculators,
        createdAt: exams_1.Exams.createdAt,
    })
        .from(exams_1.Exams)
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(exams_1.Exams.courseId, courses_1.courses.id))
        .leftJoin(examCodes_1.examCodes, (0, drizzle_orm_1.eq)(exams_1.Exams.codeId, examCodes_1.examCodes.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(exams_1.Exams.courseId, courseIds), (0, drizzle_orm_1.eq)(exams_1.Exams.isActive, true)))
        .orderBy(exams_1.Exams.createdAt);
    // 5. Get attempts for status mapping
    const examIds = exams.map(e => e.id);
    let attemptsMap = new Map();
    if (examIds.length > 0) {
        const attempts = await connection_1.db
            .select({
            examId: examAttempts_1.examAttempts.examId,
            status: examAttempts_1.examAttempts.status,
            score: examAttempts_1.examAttempts.score,
            isPassed: examAttempts_1.examAttempts.isPassed,
        })
            .from(examAttempts_1.examAttempts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.inArray)(examAttempts_1.examAttempts.examId, examIds)))
            .orderBy(examAttempts_1.examAttempts.startedAt);
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
    const examsByCourse = new Map();
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
    return (0, response_1.SuccessResponse)(res, {
        examBalance: student.examBalance,
        courses: coursesWithExams
    });
};
exports.getExams = getExams;
// ===================== GET EXAM BY ID =====================
const getExamById = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;
    // 1. Get student's category and balance
    const [student] = await connection_1.db
        .select({ categoryId: Student_1.Student.category, examBalance: Student_1.Student.exambalance })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (!student)
        throw new Errors_1.NotFound("Student not found");
    if (student.examBalance <= 0) {
        throw new Errors_1.BadRequest("You do not have balance, please try to purchase an exam package.");
    }
    // 2. Fetch exam with course info
    const [exam] = await connection_1.db
        .select({
        id: exams_1.Exams.id,
        title: exams_1.Exams.title,
        description: exams_1.Exams.description,
        duration: exams_1.Exams.duration,
        totalScore: exams_1.Exams.totalScore,
        passScore: exams_1.Exams.passScore,
        examType: exams_1.Exams.examType,
        year: exams_1.Exams.year,
        month: exams_1.Exams.Month,
        isActive: exams_1.Exams.isActive,
        courseId: exams_1.Exams.courseId,
        courseName: courses_1.courses.name,
        courseCategoryId: courses_1.courses.categoryId,
        codeName: examCodes_1.examCodes.code,
        calculators: exams_1.Exams.calculators,
    })
        .from(exams_1.Exams)
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(exams_1.Exams.courseId, courses_1.courses.id))
        .leftJoin(examCodes_1.examCodes, (0, drizzle_orm_1.eq)(exams_1.Exams.codeId, examCodes_1.examCodes.id))
        .where((0, drizzle_orm_1.eq)(exams_1.Exams.id, examId));
    if (!exam)
        throw new Errors_1.NotFound("Exam not found");
    if (!exam.isActive)
        throw new Errors_1.BadRequest("Exam is not active");
    // 3. Verify student's category hierarchy (Parents & Children)
    const categoryIds = [];
    let currentCategoryId = student.categoryId;
    // Get Ancestors (Parents)
    while (currentCategoryId) {
        if (!categoryIds.includes(currentCategoryId))
            categoryIds.push(currentCategoryId);
        const [cat] = await connection_1.db
            .select({ parentCategoryId: category_1.category.parentCategoryId })
            .from(category_1.category)
            .where((0, drizzle_orm_1.eq)(category_1.category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }
    // Get Direct Children
    const children = await connection_1.db
        .select({ id: category_1.category.id })
        .from(category_1.category)
        .where((0, drizzle_orm_1.eq)(category_1.category.parentCategoryId, student.categoryId));
    children.forEach(c => {
        if (!categoryIds.includes(c.id))
            categoryIds.push(c.id);
    });
    if (!categoryIds.includes(exam.courseCategoryId)) {
        throw new Errors_1.BadRequest("This exam is not available for your category");
    }
    // 4. Fetch sections
    const sections = await connection_1.db
        .select({
        id: exams_1.ExamSections.id,
        sectionOrder: exams_1.ExamSections.sectionOrder,
        sectionName: sections_1.Sections.sectionName,
        sectionDescription: sections_1.Sections.sectionDescription,
        sectionTime: sections_1.Sections.sectionTime,
        durationOverride: exams_1.ExamSections.duration,
        breakLimited: exams_1.ExamSections.breakLimited,
        maxBreakDuration: exams_1.ExamSections.maxBreakDuration,
    })
        .from(exams_1.ExamSections)
        .leftJoin(sections_1.Sections, (0, drizzle_orm_1.eq)(exams_1.ExamSections.sectionId, sections_1.Sections.id))
        .where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, examId))
        .orderBy(exams_1.ExamSections.sectionOrder);
    const sectionIds = sections.map(s => s.id);
    let formattedSections = [];
    if (sectionIds.length > 0) {
        const sectionQuestions = await connection_1.db
            .select({
            id: exams_1.SectionQuestions.id,
            sectionId: exams_1.SectionQuestions.sectionId,
            questionId: exams_1.SectionQuestions.questionId,
            questionOrder: exams_1.SectionQuestions.questionOrder,
            score: exams_1.SectionQuestions.score,
            questionText: questions_1.questions.question,
            questionImage: questions_1.questions.image,
            answerType: questions_1.questions.answerType,
            difficulty: questions_1.questions.difficulty,
        })
            .from(exams_1.SectionQuestions)
            .leftJoin(questions_1.questions, (0, drizzle_orm_1.eq)(exams_1.SectionQuestions.questionId, questions_1.questions.id))
            .where((0, drizzle_orm_1.inArray)(exams_1.SectionQuestions.sectionId, sectionIds))
            .orderBy(exams_1.SectionQuestions.questionOrder);
        const questionIds = sectionQuestions.map(q => q.questionId);
        let optionsMap = new Map();
        if (questionIds.length > 0) {
            const options = await connection_1.db
                .select({
                id: questions_1.questionOptions.id,
                questionId: questions_1.questionOptions.questionId,
                answer: questions_1.questionOptions.answer,
                order: questions_1.questionOptions.order,
            })
                .from(questions_1.questionOptions)
                .where((0, drizzle_orm_1.inArray)(questions_1.questionOptions.questionId, questionIds));
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
    const [existingAttempt] = await connection_1.db
        .select({
        id: examAttempts_1.examAttempts.id,
        status: examAttempts_1.examAttempts.status,
        startedAt: examAttempts_1.examAttempts.startedAt,
        score: examAttempts_1.examAttempts.score,
        isPassed: examAttempts_1.examAttempts.isPassed,
    })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId)))
        .orderBy((0, drizzle_orm_1.desc)(examAttempts_1.examAttempts.startedAt));
    return (0, response_1.SuccessResponse)(res, {
        exam: {
            ...exam,
            sections: formattedSections,
        },
        attempt: existingAttempt ?? null,
    });
};
exports.getExamById = getExamById;
// ===================== START EXAM =====================
const startExam = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;
    // 1. Fetch exam with its course category in one query
    const [exam] = await connection_1.db
        .select({
        id: exams_1.Exams.id,
        isActive: exams_1.Exams.isActive,
        duration: exams_1.Exams.duration,
        courseCategoryId: courses_1.courses.categoryId,
    })
        .from(exams_1.Exams)
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(exams_1.Exams.courseId, courses_1.courses.id))
        .where((0, drizzle_orm_1.eq)(exams_1.Exams.id, examId));
    if (!exam)
        throw new Errors_1.NotFound("Exam not found");
    if (!exam.isActive)
        throw new Errors_1.BadRequest("Exam is not active");
    // 2. Check student info and balance
    const [student] = await connection_1.db
        .select({ examBalance: Student_1.Student.exambalance, categoryId: Student_1.Student.category })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (!student)
        throw new Errors_1.NotFound("Student not found");
    // 3. Verify category access (Ancestors + Children)
    const categoryIds = [];
    let currentCategoryId = student.categoryId;
    while (currentCategoryId) {
        if (!categoryIds.includes(currentCategoryId))
            categoryIds.push(currentCategoryId);
        const [cat] = await connection_1.db
            .select({ parentCategoryId: category_1.category.parentCategoryId })
            .from(category_1.category)
            .where((0, drizzle_orm_1.eq)(category_1.category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }
    const children = await connection_1.db
        .select({ id: category_1.category.id })
        .from(category_1.category)
        .where((0, drizzle_orm_1.eq)(category_1.category.parentCategoryId, student.categoryId));
    children.forEach(c => {
        if (!categoryIds.includes(c.id))
            categoryIds.push(c.id);
    });
    if (!categoryIds.includes(exam.courseCategoryId)) {
        throw new Errors_1.BadRequest("This exam is not available for your category");
    }
    // 4. Check for existing in-progress attempt
    const [existingAttempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id, startedAt: examAttempts_1.examAttempts.startedAt })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.status, "in_progress")));
    if (existingAttempt) {
        return (0, response_1.SuccessResponse)(res, {
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
    const [passedAttempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.inArray)(examAttempts_1.examAttempts.status, ["completed", "timed_out"]), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.isPassed, true)));
    if (passedAttempt) {
        throw new Errors_1.BadRequest("You have already passed this exam. You cannot take it again.");
    }
    // Check balance only for new attempts
    if (student.examBalance <= 0)
        throw new Errors_1.BadRequest("You do not have balance, please try to purchase an exam package.");
    // 6. Create attempt and deduct balance in a transaction
    const attemptId = (0, crypto_1.randomUUID)();
    const startTime = new Date();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(examAttempts_1.examAttempts).values({
            id: attemptId,
            studentId,
            examId,
            status: "in_progress",
            startedAt: startTime,
        });
        await tx
            .update(Student_1.Student)
            .set({ exambalance: (0, drizzle_orm_1.sql) `${Student_1.Student.exambalance} - 1` })
            .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Exam started successfully",
        attempt: { id: attemptId, examId, duration: exam.duration, startedAt: startTime },
    }, 201);
};
exports.startExam = startExam;
// ===================== SUBMIT / END EXAM =====================
const submitExam = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;
    const { answers } = req.body;
    const [attempt] = await connection_1.db.select().from(examAttempts_1.examAttempts).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.status, "in_progress")));
    if (!attempt)
        throw new Errors_1.NotFound("No active attempt");
    const [exam] = await connection_1.db.select({ duration: exams_1.Exams.duration, passScore: exams_1.Exams.passScore, totalScore: exams_1.Exams.totalScore }).from(exams_1.Exams).where((0, drizzle_orm_1.eq)(exams_1.Exams.id, examId));
    const isTimedOut = (Date.now() - new Date(attempt.startedAt).getTime()) > (exam.duration * 60 * 1000);
    const sectionQs = await connection_1.db.select({ qId: exams_1.SectionQuestions.questionId, score: exams_1.SectionQuestions.score, type: questions_1.questions.answerType })
        .from(exams_1.SectionQuestions).innerJoin(exams_1.ExamSections, (0, drizzle_orm_1.eq)(exams_1.SectionQuestions.sectionId, exams_1.ExamSections.id))
        .leftJoin(questions_1.questions, (0, drizzle_orm_1.eq)(exams_1.SectionQuestions.questionId, questions_1.questions.id)).where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, examId));
    const correctOpts = await connection_1.db.select().from(questions_1.questionOptions).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(questions_1.questionOptions.questionId, sectionQs.map(s => s.qId)), (0, drizzle_orm_1.eq)(questions_1.questionOptions.isCorrect, true)));
    const correctMap = new Map(correctOpts.map(o => [o.questionId, o]));
    let totalAchievedScore = 0;
    const answersToInsert = answers.map((ans) => {
        const info = sectionQs.find(q => q.qId === ans.questionId);
        if (!info)
            return null;
        const correct = correctMap.get(ans.questionId);
        //TODO: for now we will use exact match or mathematical approximation
        //const isCorrect = info.type === "MCQ" ? ans.selectedOptionId === correct?.id : ans.gridInAnswer?.trim().toLowerCase() === correct?.answer.trim().toLowerCase();
        const isCorrect = info.type === "MCQ" ? ans.selectedOptionId === correct?.id : (ans.gridInAnswer && correct?.answer ? (0, checkGridInAnswer_1.isEquivalentGridInAnswer)(ans.gridInAnswer, correct.answer) : false);
        if (isCorrect)
            totalAchievedScore += info.score;
        return { id: (0, crypto_1.randomUUID)(), attemptId: attempt.id, questionId: ans.questionId, isCorrect, score: isCorrect ? info.score : 0, selectedOptionId: ans.selectedOptionId, gridInAnswer: ans.gridInAnswer };
    }).filter(Boolean);
    const isPassed = totalAchievedScore >= exam.passScore;
    const finalStatus = isTimedOut ? "timed_out" : "completed";
    await connection_1.db.transaction(async (tx) => {
        if (answersToInsert.length > 0)
            await tx.insert(studentAnswers_1.studentAnswers).values(answersToInsert);
        await tx.update(examAttempts_1.examAttempts).set({ endedAt: new Date(), score: totalAchievedScore, isPassed, status: finalStatus }).where((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.id, attempt.id));
    });
    // ── Fetch wrong questions + enrich with hasParallel ──────────────────────────
    const wrongIds = answersToInsert.filter((a) => !a.isCorrect).map((a) => a.questionId);
    let mistakes = [];
    if (wrongIds.length > 0) {
        const qs = await connection_1.db.select().from(questions_1.questions).where((0, drizzle_orm_1.inArray)(questions_1.questions.id, wrongIds));
        const opts = await connection_1.db.select().from(questions_1.questionOptions).where((0, drizzle_orm_1.inArray)(questions_1.questionOptions.questionId, wrongIds));
        const allMedia = await connection_1.db.select().from(questions_1.questionAnswers).where((0, drizzle_orm_1.inArray)(questions_1.questionAnswers.questionId, wrongIds));
        // Group answers by questionId as an array
        const mediaMap = new Map();
        for (const m of allMedia) {
            if (!mediaMap.has(m.questionId))
                mediaMap.set(m.questionId, []);
            mediaMap.get(m.questionId).push({
                id: m.id,
                answerPdf: m.pdf,
                answerVideo: m.video,
                answerImage: m.image,
                answerText: m.text,
            });
        }
        // Check which wrong questions have at least one parallel question
        const parallelRows = await connection_1.db
            .select({ originalQuestionId: questions_1.ParallelQuestion.origianlQuestionId })
            .from(questions_1.ParallelQuestion)
            .where((0, drizzle_orm_1.inArray)(questions_1.ParallelQuestion.origianlQuestionId, wrongIds));
        const parallelQuestionIds = new Set(parallelRows.map(r => r.originalQuestionId));
        mistakes = qs.map(q => ({
            ...q,
            options: opts.filter(o => o.questionId === q.id),
            answers: mediaMap.get(q.id) ?? [],
            hasParallel: parallelQuestionIds.has(q.id),
        }));
    }
    // ── Student balances ──────────────────────────────────────────────────────────
    const [updatedStudent] = await connection_1.db
        .select({ questionBalance: Student_1.Student.questionbalance, examBalance: Student_1.Student.exambalance })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    // ── Check if this student's exam purchase included answers ────────────────────
    const [answersPayment] = await connection_1.db
        .select({ id: payment_1.payment.id })
        .from(payment_1.payment)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payment_1.payment.studentId, studentId), (0, drizzle_orm_1.eq)(payment_1.payment.purpose, "purchase"), (0, drizzle_orm_1.eq)(payment_1.payment.status, "completed"), (0, drizzle_orm_1.eq)(payment_1.payment.includedAnswers, true), (0, drizzle_orm_1.eq)(payment_1.payment.isDeleted, false)))
        .limit(1);
    return (0, response_1.SuccessResponse)(res, {
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
exports.submitExam = submitExam;
// ===================== GET PARALLEL QUESTIONS =====================
// POST /exams/parallel/questions
// Body: { questionIds: string[], attemptId: string }
const getParallelQuestions = async (req, res) => {
    const studentId = getStudentId(req);
    const { questionIds, attemptId } = req.body;
    if (!attemptId || !Array.isArray(questionIds) || questionIds.length === 0) {
        throw new Errors_1.BadRequest("attemptId and a non-empty questionIds array are required");
    }
    // 1. Validate the attempt belongs to this student and is completed/timed_out
    const [attempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id, status: examAttempts_1.examAttempts.status })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.id, attemptId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.inArray)(examAttempts_1.examAttempts.status, ["completed", "timed_out"])))
        .limit(1);
    if (!attempt)
        throw new Errors_1.NotFound("No completed exam attempt found with that ID");
    // 2. Validate all requested questionIds were actually answered wrong in this attempt
    const wrongAnswers = await connection_1.db
        .select({ questionId: studentAnswers_1.studentAnswers.questionId })
        .from(studentAnswers_1.studentAnswers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(studentAnswers_1.studentAnswers.attemptId, attemptId), (0, drizzle_orm_1.eq)(studentAnswers_1.studentAnswers.isCorrect, false), (0, drizzle_orm_1.inArray)(studentAnswers_1.studentAnswers.questionId, questionIds)));
    const validWrongIds = new Set(wrongAnswers.map(a => a.questionId));
    const invalidIds = questionIds.filter((id) => !validWrongIds.has(id));
    if (invalidIds.length > 0) {
        throw new Errors_1.BadRequest(`The following question IDs are not wrong answers from this attempt: ${invalidIds.join(", ")}`);
    }
    // 3. Find the latest parallel question for each requested original question
    const allParallels = await connection_1.db
        .select({
        id: questions_1.ParallelQuestion.id,
        originalQuestionId: questions_1.ParallelQuestion.origianlQuestionId,
        question: questions_1.ParallelQuestion.question,
        answerType: questions_1.ParallelQuestion.answerType,
        difficulty: questions_1.ParallelQuestion.difficulty,
        lessonId: questions_1.ParallelQuestion.lessonId,
        createdAt: questions_1.ParallelQuestion.createdAt,
    })
        .from(questions_1.ParallelQuestion)
        .where((0, drizzle_orm_1.inArray)(questions_1.ParallelQuestion.origianlQuestionId, questionIds))
        .orderBy((0, drizzle_orm_1.desc)(questions_1.ParallelQuestion.createdAt));
    // Pick the most recent parallel per original question
    const parallelMap = new Map();
    for (const p of allParallels) {
        if (!parallelMap.has(p.originalQuestionId)) {
            parallelMap.set(p.originalQuestionId, p);
        }
    }
    const selectedParallels = Array.from(parallelMap.values());
    const chargeableCount = selectedParallels.length;
    if (chargeableCount === 0) {
        throw new Errors_1.BadRequest("None of the requested questions have parallel questions available");
    }
    // 4. Check question balance
    const [student] = await connection_1.db
        .select({ questionBalance: Student_1.Student.questionbalance })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (!student)
        throw new Errors_1.NotFound("Student not found");
    if ((student.questionBalance ?? 0) < chargeableCount) {
        throw new Errors_1.BadRequest(`Insufficient question balance. You need ${chargeableCount} but have ${student.questionBalance ?? 0}. Please purchase a question package.`);
    }
    // 5. Fetch options for chosen parallels (no isCorrect revealed)
    const parallelIds = selectedParallels.map(p => p.id);
    const parallelOptions = await connection_1.db
        .select({
        id: questions_1.ParallelQuestionOptions.id,
        questionId: questions_1.ParallelQuestionOptions.questionId,
        answer: questions_1.ParallelQuestionOptions.answer,
        order: questions_1.ParallelQuestionOptions.order,
    })
        .from(questions_1.ParallelQuestionOptions)
        .where((0, drizzle_orm_1.inArray)(questions_1.ParallelQuestionOptions.questionId, parallelIds));
    const optionsMap = new Map();
    for (const opt of parallelOptions) {
        const list = optionsMap.get(opt.questionId) ?? [];
        list.push(opt);
        optionsMap.set(opt.questionId, list);
    }
    // 6. Deduct balance + create parallel attempt in a transaction
    const parallelAttemptId = (0, crypto_1.randomUUID)();
    await connection_1.db.transaction(async (tx) => {
        await tx
            .update(Student_1.Student)
            .set({ questionbalance: (0, drizzle_orm_1.sql) `${Student_1.Student.questionbalance} - ${chargeableCount}` })
            .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
        await tx.insert(studentParallelAttempts_1.studentParallelAttempts).values({
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
    return (0, response_1.SuccessResponse)(res, {
        message: "Parallel questions fetched successfully",
        parallelAttemptId,
        balanceDeducted: chargeableCount,
        remainingQuestionBalance: (student.questionBalance ?? 0) - chargeableCount,
        parallelQuestions,
    }, 201);
};
exports.getParallelQuestions = getParallelQuestions;
// ===================== SUBMIT PARALLEL ANSWERS =====================
// POST /exams/parallel/:parallelAttemptId/submit
// Body: { answers: [{ parallelQuestionId, selectedOptionId?, gridInAnswer? }] }
const submitParallelAnswers = async (req, res) => {
    const studentId = getStudentId(req);
    const { parallelAttemptId } = req.params;
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
        throw new Errors_1.BadRequest("answers array is required");
    }
    // 1. Validate the parallel attempt belongs to this student and is in_progress
    const [parallelAttempt] = await connection_1.db
        .select({ id: studentParallelAttempts_1.studentParallelAttempts.id, status: studentParallelAttempts_1.studentParallelAttempts.status })
        .from(studentParallelAttempts_1.studentParallelAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(studentParallelAttempts_1.studentParallelAttempts.id, parallelAttemptId), (0, drizzle_orm_1.eq)(studentParallelAttempts_1.studentParallelAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(studentParallelAttempts_1.studentParallelAttempts.status, "in_progress")))
        .limit(1);
    if (!parallelAttempt)
        throw new Errors_1.NotFound("No active parallel attempt found with that ID");
    // 2. Fetch all parallel questions being answered (with their correct options)
    const parallelQuestionIds = answers.map((a) => a.parallelQuestionId);
    const parallelQs = await connection_1.db
        .select({
        id: questions_1.ParallelQuestion.id,
        originalQuestionId: questions_1.ParallelQuestion.origianlQuestionId,
        question: questions_1.ParallelQuestion.question,
        answerType: questions_1.ParallelQuestion.answerType,
    })
        .from(questions_1.ParallelQuestion)
        .where((0, drizzle_orm_1.inArray)(questions_1.ParallelQuestion.id, parallelQuestionIds));
    const correctParallelOpts = await connection_1.db
        .select({
        id: questions_1.ParallelQuestionOptions.id,
        questionId: questions_1.ParallelQuestionOptions.questionId,
        answer: questions_1.ParallelQuestionOptions.answer,
        order: questions_1.ParallelQuestionOptions.order,
    })
        .from(questions_1.ParallelQuestionOptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(questions_1.ParallelQuestionOptions.questionId, parallelQuestionIds), (0, drizzle_orm_1.eq)(questions_1.ParallelQuestionOptions.isCorrect, true)));
    // Fetch all options (for returning full options list in results)
    const allParallelOpts = await connection_1.db
        .select({
        id: questions_1.ParallelQuestionOptions.id,
        questionId: questions_1.ParallelQuestionOptions.questionId,
        answer: questions_1.ParallelQuestionOptions.answer,
        order: questions_1.ParallelQuestionOptions.order,
        isCorrect: questions_1.ParallelQuestionOptions.isCorrect,
    })
        .from(questions_1.ParallelQuestionOptions)
        .where((0, drizzle_orm_1.inArray)(questions_1.ParallelQuestionOptions.questionId, parallelQuestionIds));
    const correctOptMap = new Map(correctParallelOpts.map(o => [o.questionId, o]));
    const allOptsMap = new Map();
    for (const opt of allParallelOpts) {
        const list = allOptsMap.get(opt.questionId) ?? [];
        list.push(opt);
        allOptsMap.set(opt.questionId, list);
    }
    // 3. Grade each answer
    let totalCorrect = 0;
    const answersToInsert = [];
    const results = [];
    for (const ans of answers) {
        const pq = parallelQs.find(q => q.id === ans.parallelQuestionId);
        if (!pq)
            continue;
        const correct = correctOptMap.get(ans.parallelQuestionId);
        const isCorrect = pq.answerType === "MCQ"
            ? ans.selectedOptionId === correct?.id
            : (ans.gridInAnswer && correct?.answer ? (0, checkGridInAnswer_1.isEquivalentGridInAnswer)(ans.gridInAnswer, correct.answer) : false);
        if (isCorrect)
            totalCorrect++;
        answersToInsert.push({
            id: (0, crypto_1.randomUUID)(),
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
    await connection_1.db.transaction(async (tx) => {
        if (answersToInsert.length > 0) {
            await tx.insert(studentParallelAnswers_1.studentParallelAnswers).values(answersToInsert);
        }
        await tx
            .update(studentParallelAttempts_1.studentParallelAttempts)
            .set({ status: "completed" })
            .where((0, drizzle_orm_1.eq)(studentParallelAttempts_1.studentParallelAttempts.id, parallelAttemptId));
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Parallel answers submitted successfully",
        parallelAttemptId,
        totalQuestions: results.length,
        totalCorrect,
        totalWrong: results.length - totalCorrect,
        results,
    });
};
exports.submitParallelAnswers = submitParallelAnswers;
// ===================== GET EXAM ATTEMPT ANSWERS =====================
// GET /exams/:examId/attempts/:attemptId/answers
const getExamAttemptAnswers = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId, attemptId } = req.params;
    // 1. Validate the attempt belongs to this student and is completed
    const [attempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id, status: examAttempts_1.examAttempts.status })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.id, attemptId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.inArray)(examAttempts_1.examAttempts.status, ["completed", "timed_out"])))
        .limit(1);
    if (!attempt)
        throw new Errors_1.NotFound("No completed exam attempt found");
    // 2. Check the student has a completed exam purchase with includedAnswers = true
    const [answersPayment] = await connection_1.db
        .select({ id: payment_1.payment.id, includedAnswers: payment_1.payment.includedAnswers })
        .from(payment_1.payment)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payment_1.payment.studentId, studentId), (0, drizzle_orm_1.eq)(payment_1.payment.purpose, "purchase"), (0, drizzle_orm_1.eq)(payment_1.payment.status, "completed"), (0, drizzle_orm_1.eq)(payment_1.payment.includedAnswers, true), (0, drizzle_orm_1.eq)(payment_1.payment.isDeleted, false)))
        .limit(1);
    if (!answersPayment) {
        throw new Errors_1.BadRequest("Your exam package does not include answers. Please purchase a package with answers to access this feature.");
    }
    // 3. Fetch all section questions for this exam (with their lesson info)
    const sectionQs = await connection_1.db
        .select({
        questionId: exams_1.SectionQuestions.questionId,
        questionOrder: exams_1.SectionQuestions.questionOrder,
        score: exams_1.SectionQuestions.score,
        sectionId: exams_1.SectionQuestions.sectionId,
        questionText: questions_1.questions.question,
        questionImage: questions_1.questions.image,
        answerType: questions_1.questions.answerType,
        difficulty: questions_1.questions.difficulty,
        lessonId: questions_1.questions.lessonId,
        lessonName: lessons_1.lessons.name,
    })
        .from(exams_1.SectionQuestions)
        .innerJoin(exams_1.ExamSections, (0, drizzle_orm_1.eq)(exams_1.SectionQuestions.sectionId, exams_1.ExamSections.id))
        .leftJoin(questions_1.questions, (0, drizzle_orm_1.eq)(exams_1.SectionQuestions.questionId, questions_1.questions.id))
        .leftJoin(lessons_1.lessons, (0, drizzle_orm_1.eq)(questions_1.questions.lessonId, lessons_1.lessons.id))
        .where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, examId))
        .orderBy(exams_1.SectionQuestions.questionOrder);
    const allQuestionIds = sectionQs.map(q => q.questionId);
    if (allQuestionIds.length === 0) {
        return (0, response_1.SuccessResponse)(res, { message: "No questions found for this exam", questions: [] });
    }
    // 4. Fetch correct options + all options + explanations
    const [allOptions, correctOptions, explanations] = await Promise.all([
        connection_1.db.select({
            id: questions_1.questionOptions.id,
            questionId: questions_1.questionOptions.questionId,
            answer: questions_1.questionOptions.answer,
            order: questions_1.questionOptions.order,
            isCorrect: questions_1.questionOptions.isCorrect,
        }).from(questions_1.questionOptions).where((0, drizzle_orm_1.inArray)(questions_1.questionOptions.questionId, allQuestionIds)),
        connection_1.db.select({
            id: questions_1.questionOptions.id,
            questionId: questions_1.questionOptions.questionId,
            answer: questions_1.questionOptions.answer,
            order: questions_1.questionOptions.order,
        }).from(questions_1.questionOptions).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(questions_1.questionOptions.questionId, allQuestionIds), (0, drizzle_orm_1.eq)(questions_1.questionOptions.isCorrect, true))),
        connection_1.db.select({
            id: questions_1.questionAnswers.id,
            questionId: questions_1.questionAnswers.questionId,
            answerPdf: questions_1.questionAnswers.pdf,
            answerVideo: questions_1.questionAnswers.video,
            answerImage: questions_1.questionAnswers.image,
            answerText: questions_1.questionAnswers.text,
        }).from(questions_1.questionAnswers).where((0, drizzle_orm_1.inArray)(questions_1.questionAnswers.questionId, allQuestionIds)),
    ]);
    // 5. Fetch this student's submitted answers for the attempt
    const submittedAnswers = await connection_1.db
        .select({
        questionId: studentAnswers_1.studentAnswers.questionId,
        selectedOptionId: studentAnswers_1.studentAnswers.selectedOptionId,
        gridInAnswer: studentAnswers_1.studentAnswers.gridInAnswer,
        isCorrect: studentAnswers_1.studentAnswers.isCorrect,
        score: studentAnswers_1.studentAnswers.score,
    })
        .from(studentAnswers_1.studentAnswers)
        .where((0, drizzle_orm_1.eq)(studentAnswers_1.studentAnswers.attemptId, attemptId));
    // 6. Build lookup maps
    const allOptsMap = new Map();
    for (const opt of allOptions) {
        const list = allOptsMap.get(opt.questionId) ?? [];
        list.push(opt);
        allOptsMap.set(opt.questionId, list);
    }
    const correctOptMap = new Map(correctOptions.map(o => [o.questionId, o]));
    const explanationsMap = new Map();
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
    const seenLessonIds = new Set();
    const recommendedLessonsToStudy = [];
    for (const q of sectionQs) {
        if (!q.lessonId || !q.lessonName)
            continue;
        if (seenLessonIds.has(q.lessonId))
            continue;
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
    return (0, response_1.SuccessResponse)(res, {
        message: "Exam answers retrieved successfully",
        attemptId,
        examId,
        questions: questionsWithAnswers,
        recommendedLessonsToStudy,
    });
};
exports.getExamAttemptAnswers = getExamAttemptAnswers;
// ===================== SHOW QUESTION ANSWER =====================
const showQuestionAnswer = async (req, res) => {
    const studentId = getStudentId(req);
    const { questionId } = req.params;
    // 1. خصم الرصيد داخل Transaction
    await connection_1.db.transaction(async (tx) => {
        const [student] = await tx
            .select({ questionBalance: Student_1.Student.questionbalance })
            .from(Student_1.Student)
            .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
        if (!student || (student.questionBalance ?? 0) <= 0) {
            throw new Errors_1.BadRequest("Insufficient question balance");
        }
        await tx.update(Student_1.Student)
            .set({ questionbalance: (0, drizzle_orm_1.sql) `${Student_1.Student.questionbalance} - 1` })
            .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    });
    // 2. جلب الخيار الصحيح (لـ MCQ والـ Grid in)
    const correctOptions = await connection_1.db
        .select({
        id: questions_1.questionOptions.id,
        answer: questions_1.questionOptions.answer,
    })
        .from(questions_1.questionOptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(questions_1.questionOptions.questionId, questionId), (0, drizzle_orm_1.eq)(questions_1.questionOptions.isCorrect, true)));
    // 3. Fetch all answer objects as an array for this question
    const answers = await connection_1.db
        .select({
        id: questions_1.questionAnswers.id,
        answerPdf: questions_1.questionAnswers.pdf,
        answerVideo: questions_1.questionAnswers.video,
        answerImage: questions_1.questionAnswers.image,
        answerText: questions_1.questionAnswers.text,
    })
        .from(questions_1.questionAnswers)
        .where((0, drizzle_orm_1.eq)(questions_1.questionAnswers.questionId, questionId));
    // 4. جلب إجابة الطالب (إن وجدت)
    const [latestStudentAnswer] = await connection_1.db
        .select({
        selectedOptionId: studentAnswers_1.studentAnswers.selectedOptionId,
        gridInAnswer: studentAnswers_1.studentAnswers.gridInAnswer,
    })
        .from(studentAnswers_1.studentAnswers)
        .innerJoin(examAttempts_1.examAttempts, (0, drizzle_orm_1.eq)(studentAnswers_1.studentAnswers.attemptId, examAttempts_1.examAttempts.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(studentAnswers_1.studentAnswers.questionId, questionId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId)))
        .orderBy((0, drizzle_orm_1.desc)(studentAnswers_1.studentAnswers.createdAt))
        .limit(1);
    (0, response_1.SuccessResponse)(res, {
        message: "Answer and explanations revealed",
        result: {
            correctOptions,
            studentAnswer: latestStudentAnswer ?? req.body.studentAnswer ?? null,
            explanation: answers ?? [] // array of answer objects: [{ id, answerPdf, answerVideo, answerImage, answerText }]
        },
    });
};
exports.showQuestionAnswer = showQuestionAnswer;
// ===================== GET EXAM ATTEMPTS HISTORY =====================
// GET /exams/attempts
const getExamAttemptsHistory = async (req, res) => {
    const studentId = getStudentId(req);
    const examId = req.query.examId;
    const whereCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), examId ? (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId) : undefined);
    const attempts = await connection_1.db
        .select({
        id: examAttempts_1.examAttempts.id,
        examId: examAttempts_1.examAttempts.examId,
        score: examAttempts_1.examAttempts.score,
        isPassed: examAttempts_1.examAttempts.isPassed,
        status: examAttempts_1.examAttempts.status,
        startedAt: examAttempts_1.examAttempts.startedAt,
        endedAt: examAttempts_1.examAttempts.endedAt,
        createdAt: examAttempts_1.examAttempts.createdAt,
        exam: {
            id: exams_1.Exams.id,
            title: exams_1.Exams.title,
            description: exams_1.Exams.description,
            duration: exams_1.Exams.duration,
            totalScore: exams_1.Exams.totalScore,
            passScore: exams_1.Exams.passScore,
            examType: exams_1.Exams.examType,
            year: exams_1.Exams.year,
            month: exams_1.Exams.Month,
            courseId: exams_1.Exams.courseId,
            courseName: courses_1.courses.name,
            codeName: examCodes_1.examCodes.code,
        },
    })
        .from(examAttempts_1.examAttempts)
        .leftJoin(exams_1.Exams, (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, exams_1.Exams.id))
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(exams_1.Exams.courseId, courses_1.courses.id))
        .leftJoin(examCodes_1.examCodes, (0, drizzle_orm_1.eq)(exams_1.Exams.codeId, examCodes_1.examCodes.id))
        .where(whereCondition)
        .orderBy((0, drizzle_orm_1.desc)(examAttempts_1.examAttempts.startedAt));
    return (0, response_1.SuccessResponse)(res, {
        message: "Exam attempts history retrieved successfully",
        attempts,
    });
};
exports.getExamAttemptsHistory = getExamAttemptsHistory;
// ===================== helper: duplicate-key detection =====================
// MySQL duplicate-key errors carry code 'ER_DUP_ENTRY' (errno 1062).
const isDuplicateKeyError = (err) => err?.code === "ER_DUP_ENTRY" || err?.errno === 1062;
const finalizeExamAttempt = async (tx, { attemptId, examId }) => {
    const [exam] = await tx
        .select({ passScore: exams_1.Exams.passScore, totalScore: exams_1.Exams.totalScore })
        .from(exams_1.Exams)
        .where((0, drizzle_orm_1.eq)(exams_1.Exams.id, examId))
        .limit(1);
    if (!exam)
        throw new Errors_1.NotFound("Exam not found");
    const allSectionAttempts = await tx
        .select({ score: examAttempts_1.sectionAttempts.score, status: examAttempts_1.sectionAttempts.status })
        .from(examAttempts_1.sectionAttempts)
        .where((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.attemptId, attemptId));
    const totalScore = allSectionAttempts.reduce((sum, s) => sum + (s.score ?? 0), 0);
    const anyTimedOut = allSectionAttempts.some(s => s.status === "timed_out");
    const examFinalStatus = anyTimedOut ? "timed_out" : "completed";
    const isPassed = totalScore >= exam.passScore;
    const endedAt = new Date();
    await tx
        .update(examAttempts_1.examAttempts)
        .set({ status: examFinalStatus, score: totalScore, isPassed, endedAt })
        .where((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.id, attemptId));
    return { exam, totalScore, isPassed, examFinalStatus, endedAt };
};
// ===================== START SECTION =====================
// POST /exams/:examId/attempts/:attemptId/sections/:examSectionId/start
const startSection = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId, attemptId, examSectionId } = req.params;
    // 1. Verify the exam attempt belongs to this student and is in_progress
    const [attempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id, status: examAttempts_1.examAttempts.status })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.id, attemptId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.status, "in_progress")))
        .limit(1);
    if (!attempt)
        throw new Errors_1.NotFound("No active exam attempt found");
    // 2. Verify the section belongs to this exam; fetch effective duration + break config
    const [examSection] = await connection_1.db
        .select({
        id: exams_1.ExamSections.id,
        duration: exams_1.ExamSections.duration,
        sectionTime: sections_1.Sections.sectionTime,
        breakLimited: exams_1.ExamSections.breakLimited,
        maxBreakDuration: exams_1.ExamSections.maxBreakDuration,
    })
        .from(exams_1.ExamSections)
        .leftJoin(sections_1.Sections, (0, drizzle_orm_1.eq)(exams_1.ExamSections.sectionId, sections_1.Sections.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(exams_1.ExamSections.id, examSectionId), (0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, examId)))
        .limit(1);
    if (!examSection)
        throw new Errors_1.NotFound("Section not found in this exam");
    const effectiveDuration = examSection.duration ?? examSection.sectionTime; // minutes
    // 3. Check for an existing section attempt
    const [existingSectionAttempt] = await connection_1.db
        .select()
        .from(examAttempts_1.sectionAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.attemptId, attemptId), (0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.examSectionId, examSectionId)))
        .limit(1);
    if (existingSectionAttempt) {
        if (existingSectionAttempt.status === "in_progress") {
            const elapsedMs = existingSectionAttempt.startedAt
                ? Date.now() - new Date(existingSectionAttempt.startedAt).getTime()
                : 0;
            const remainingMs = (effectiveDuration * 60 * 1000) - elapsedMs;
            if (remainingMs <= 0) {
                await connection_1.db.update(examAttempts_1.sectionAttempts)
                    .set({ status: "timed_out", endedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.id, existingSectionAttempt.id));
                throw new Errors_1.BadRequest("Section time has expired");
            }
            return (0, response_1.SuccessResponse)(res, {
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
                    await connection_1.db.update(examAttempts_1.sectionAttempts)
                        .set({ status: "timed_out", endedAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.id, existingSectionAttempt.id));
                    throw new Errors_1.BadRequest("Break time exceeded. This section has been marked as timed out.");
                }
            }
            await connection_1.db.update(examAttempts_1.sectionAttempts)
                .set({ status: "in_progress", breakStartedAt: null })
                .where((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.id, existingSectionAttempt.id));
            const elapsedMs = existingSectionAttempt.startedAt
                ? Date.now() - new Date(existingSectionAttempt.startedAt).getTime()
                : 0;
            const remainingMs = (effectiveDuration * 60 * 1000) - elapsedMs;
            return (0, response_1.SuccessResponse)(res, {
                message: "Section resumed after break",
                sectionAttempt: {
                    id: existingSectionAttempt.id,
                    startedAt: existingSectionAttempt.startedAt,
                    effectiveDuration,
                    remainingSeconds: Math.floor(remainingMs / 1000),
                },
            });
        }
        throw new Errors_1.BadRequest(`Cannot enter this section. Current status: ${existingSectionAttempt.status}`);
    }
    // 4. Enforce section ordering — student must complete sections in order
    const allExamSections = await connection_1.db
        .select({ id: exams_1.ExamSections.id, sectionOrder: exams_1.ExamSections.sectionOrder })
        .from(exams_1.ExamSections)
        .where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, examId))
        .orderBy(exams_1.ExamSections.sectionOrder);
    const completedSectionAttempts = await connection_1.db
        .select({ examSectionId: examAttempts_1.sectionAttempts.examSectionId })
        .from(examAttempts_1.sectionAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.attemptId, attemptId), (0, drizzle_orm_1.inArray)(examAttempts_1.sectionAttempts.status, ["completed", "timed_out"])));
    const completedSectionIds = new Set(completedSectionAttempts.map(s => s.examSectionId));
    const firstIncomplete = allExamSections.find(s => !completedSectionIds.has(s.id));
    if (firstIncomplete && firstIncomplete.id !== examSectionId) {
        throw new Errors_1.BadRequest("You must complete previous sections first");
    }
    // 5. Create a fresh section attempt (guarded against race duplicates by the unique index)
    const sectionAttemptId = (0, crypto_1.randomUUID)();
    const now = new Date();
    try {
        await connection_1.db.insert(examAttempts_1.sectionAttempts).values({
            id: sectionAttemptId,
            attemptId,
            examSectionId,
            startedAt: now,
            status: "in_progress",
        });
    }
    catch (err) {
        if (isDuplicateKeyError(err)) {
            throw new Errors_1.BadRequest("This section has already been started. Please refresh and try again.");
        }
        throw err;
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Section started successfully",
        sectionAttempt: {
            id: sectionAttemptId,
            startedAt: now,
            effectiveDuration,
            remainingSeconds: effectiveDuration * 60,
            breakLimited: examSection.breakLimited,
            maxBreakDuration: examSection.maxBreakDuration,
        },
    }, 201);
};
exports.startSection = startSection;
// ===================== SUBMIT SECTION =====================
// POST /exams/:examId/attempts/:attemptId/sections/:examSectionId/submit
// Body: { answers: [{ questionId, selectedOptionId?, gridInAnswer? }] }
const submitSection = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId, attemptId, examSectionId } = req.params;
    const { answers } = req.body;
    if (!Array.isArray(answers))
        throw new Errors_1.BadRequest("answers array is required");
    // 1. Verify exam attempt
    const [attempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.id, attemptId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.status, "in_progress")))
        .limit(1);
    if (!attempt)
        throw new Errors_1.NotFound("No active exam attempt found");
    // 2. Find the active section attempt (in_progress or on_break)
    const [sectionAttempt] = await connection_1.db
        .select()
        .from(examAttempts_1.sectionAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.attemptId, attemptId), (0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.examSectionId, examSectionId), (0, drizzle_orm_1.inArray)(examAttempts_1.sectionAttempts.status, ["in_progress", "on_break"])))
        .limit(1);
    if (!sectionAttempt)
        throw new Errors_1.NotFound("No active section attempt found");
    // 3. Fetch effective duration to determine if timed out
    const [examSection] = await connection_1.db
        .select({
        duration: exams_1.ExamSections.duration,
        sectionTime: sections_1.Sections.sectionTime,
    })
        .from(exams_1.ExamSections)
        .leftJoin(sections_1.Sections, (0, drizzle_orm_1.eq)(exams_1.ExamSections.sectionId, sections_1.Sections.id))
        .where((0, drizzle_orm_1.eq)(exams_1.ExamSections.id, examSectionId))
        .limit(1);
    const effectiveDuration = (examSection?.duration ?? examSection?.sectionTime) ?? 0;
    const elapsedMs = sectionAttempt.startedAt
        ? Date.now() - new Date(sectionAttempt.startedAt).getTime()
        : 0;
    const isTimedOut = elapsedMs > effectiveDuration * 60 * 1000;
    // 4. Fetch questions for this exam section
    const sectionQs = await connection_1.db
        .select({ qId: exams_1.SectionQuestions.questionId, score: exams_1.SectionQuestions.score, type: questions_1.questions.answerType })
        .from(exams_1.SectionQuestions)
        .leftJoin(questions_1.questions, (0, drizzle_orm_1.eq)(exams_1.SectionQuestions.questionId, questions_1.questions.id))
        .where((0, drizzle_orm_1.eq)(exams_1.SectionQuestions.sectionId, examSectionId));
    const questionIds = sectionQs.map(q => q.qId);
    const correctOpts = await connection_1.db
        .select()
        .from(questions_1.questionOptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(questions_1.questionOptions.questionId, questionIds), (0, drizzle_orm_1.eq)(questions_1.questionOptions.isCorrect, true)));
    const correctMap = new Map(correctOpts.map(o => [o.questionId, o]));
    // 5. Grade answers
    let sectionScore = 0;
    const answersToInsert = answers.map((ans) => {
        const info = sectionQs.find(q => q.qId === ans.questionId);
        if (!info)
            return null;
        const correct = correctMap.get(ans.questionId);
        const isCorrect = info.type === "MCQ"
            ? ans.selectedOptionId === correct?.id
            : (ans.gridInAnswer && correct?.answer ? (0, checkGridInAnswer_1.isEquivalentGridInAnswer)(ans.gridInAnswer, correct.answer) : false);
        if (isCorrect)
            sectionScore += info.score;
        return {
            id: (0, crypto_1.randomUUID)(),
            attemptId,
            questionId: ans.questionId,
            isCorrect,
            score: isCorrect ? info.score : 0,
            selectedOptionId: ans.selectedOptionId ?? null,
            gridInAnswer: ans.gridInAnswer ?? null,
        };
    }).filter((x) => x !== null);
    const sectionFinalStatus = isTimedOut ? "timed_out" : "completed";
    const now = new Date();
    // 6-8. SINGLE transaction: persist answers → close section → check allDone → finalize exam if last section
    let examFinalizeResult = null;
    try {
        examFinalizeResult = await connection_1.db.transaction(async (tx) => {
            if (answersToInsert.length > 0) {
                await tx.insert(studentAnswers_1.studentAnswers).values(answersToInsert);
            }
            await tx.update(examAttempts_1.sectionAttempts)
                .set({ status: sectionFinalStatus, score: sectionScore, endedAt: now, breakStartedAt: null })
                .where((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.id, sectionAttempt.id));
            // Check whether ALL exam sections now have a completed/timed_out row — inside the same tx
            const allExamSections = await tx
                .select({ id: exams_1.ExamSections.id })
                .from(exams_1.ExamSections)
                .where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, examId));
            const doneSectionAttempts = await tx
                .select({ examSectionId: examAttempts_1.sectionAttempts.examSectionId })
                .from(examAttempts_1.sectionAttempts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.attemptId, attemptId), (0, drizzle_orm_1.inArray)(examAttempts_1.sectionAttempts.status, ["completed", "timed_out"])));
            const doneIds = new Set(doneSectionAttempts.map(s => s.examSectionId));
            const allDone = allExamSections.every(s => doneIds.has(s.id));
            if (allDone) {
                return await finalizeExamAttempt(tx, { attemptId, examId });
            }
            return null;
        });
    }
    catch (err) {
        if (isDuplicateKeyError(err)) {
            throw new Errors_1.BadRequest("This section was already submitted.");
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
        return (0, response_1.SuccessResponse)(res, {
            message: `Section ${sectionFinalStatus === "completed" ? "submitted" : "timed out"} successfully`,
            sectionResult,
        });
    }
    // 9. Last section was closed — exam is now finalized. Enrich the response with mistakes/balances.
    const { exam, totalScore, isPassed, examFinalStatus, endedAt: examEndedAt } = examFinalizeResult;
    const allWrongAnswers = await connection_1.db
        .select({ questionId: studentAnswers_1.studentAnswers.questionId })
        .from(studentAnswers_1.studentAnswers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(studentAnswers_1.studentAnswers.attemptId, attemptId), (0, drizzle_orm_1.eq)(studentAnswers_1.studentAnswers.isCorrect, false)));
    const wrongIds = allWrongAnswers.map(a => a.questionId);
    let mistakes = [];
    if (wrongIds.length > 0) {
        const qs = await connection_1.db.select().from(questions_1.questions).where((0, drizzle_orm_1.inArray)(questions_1.questions.id, wrongIds));
        const opts = await connection_1.db.select().from(questions_1.questionOptions).where((0, drizzle_orm_1.inArray)(questions_1.questionOptions.questionId, wrongIds));
        const allMedia = await connection_1.db.select().from(questions_1.questionAnswers).where((0, drizzle_orm_1.inArray)(questions_1.questionAnswers.questionId, wrongIds));
        const mediaMap = new Map();
        for (const m of allMedia) {
            if (!mediaMap.has(m.questionId))
                mediaMap.set(m.questionId, []);
            mediaMap.get(m.questionId).push({
                id: m.id,
                answerPdf: m.pdf,
                answerVideo: m.video,
                answerImage: m.image,
                answerText: m.text,
            });
        }
        const parallelRows = await connection_1.db
            .select({ originalQuestionId: questions_1.ParallelQuestion.origianlQuestionId })
            .from(questions_1.ParallelQuestion)
            .where((0, drizzle_orm_1.inArray)(questions_1.ParallelQuestion.origianlQuestionId, wrongIds));
        const parallelQuestionIds = new Set(parallelRows.map(r => r.originalQuestionId));
        mistakes = qs.map(q => ({
            ...q,
            options: opts.filter(o => o.questionId === q.id),
            answers: mediaMap.get(q.id) ?? [],
            hasParallel: parallelQuestionIds.has(q.id),
        }));
    }
    const [updatedStudent] = await connection_1.db
        .select({ questionBalance: Student_1.Student.questionbalance, examBalance: Student_1.Student.exambalance })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    const [answersPayment] = await connection_1.db
        .select({ id: payment_1.payment.id })
        .from(payment_1.payment)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payment_1.payment.studentId, studentId), (0, drizzle_orm_1.eq)(payment_1.payment.purpose, "purchase"), (0, drizzle_orm_1.eq)(payment_1.payment.status, "completed"), (0, drizzle_orm_1.eq)(payment_1.payment.includedAnswers, true), (0, drizzle_orm_1.eq)(payment_1.payment.isDeleted, false)))
        .limit(1);
    return (0, response_1.SuccessResponse)(res, {
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
exports.submitSection = submitSection;
// ===================== START BREAK =====================
// POST /exams/:examId/attempts/:attemptId/sections/:examSectionId/break
// Called when the student wants to pause the currently in-progress section
// and resume it later (via startSection, which clears breakStartedAt).
const startBreak = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId, attemptId, examSectionId } = req.params;
    // 1. Verify exam attempt belongs to this student and is in_progress
    const [attempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.id, attemptId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.status, "in_progress")))
        .limit(1);
    if (!attempt)
        throw new Errors_1.NotFound("No active exam attempt found");
    // 2. Fetch the section attempt + break config together
    const [row] = await connection_1.db
        .select({
        sectionAttemptId: examAttempts_1.sectionAttempts.id,
        sectionAttemptStatus: examAttempts_1.sectionAttempts.status,
        startedAt: examAttempts_1.sectionAttempts.startedAt,
        duration: exams_1.ExamSections.duration,
        sectionTime: sections_1.Sections.sectionTime,
        breakLimited: exams_1.ExamSections.breakLimited,
        maxBreakDuration: exams_1.ExamSections.maxBreakDuration,
    })
        .from(examAttempts_1.sectionAttempts)
        .innerJoin(exams_1.ExamSections, (0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.examSectionId, exams_1.ExamSections.id))
        .leftJoin(sections_1.Sections, (0, drizzle_orm_1.eq)(exams_1.ExamSections.sectionId, sections_1.Sections.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.attemptId, attemptId), (0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.examSectionId, examSectionId), (0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, examId)))
        .limit(1);
    if (!row)
        throw new Errors_1.NotFound("No section attempt found for this section");
    if (row.sectionAttemptStatus !== "in_progress") {
        throw new Errors_1.BadRequest(`Cannot start a break. Current section status: ${row.sectionAttemptStatus}`);
    }
    // 3. Guard: don't allow a break if the section's own time has already run out —
    //    force a proper timeout instead of letting the student "hide" in a break.
    const effectiveDuration = row.duration ?? row.sectionTime ?? 0;
    const elapsedMs = row.startedAt ? Date.now() - new Date(row.startedAt).getTime() : 0;
    if (elapsedMs > effectiveDuration * 60 * 1000) {
        await connection_1.db.update(examAttempts_1.sectionAttempts)
            .set({ status: "timed_out", endedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.id, row.sectionAttemptId), (0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.status, "in_progress")));
        throw new Errors_1.BadRequest("Section time has already expired; cannot start a break.");
    }
    // 4. Flip to on_break atomically — the status condition in WHERE prevents
    //    a race where two concurrent requests both think they started the break.
    const now = new Date();
    const updateResult = await connection_1.db.update(examAttempts_1.sectionAttempts)
        .set({ status: "on_break", breakStartedAt: now })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.id, row.sectionAttemptId), (0, drizzle_orm_1.eq)(examAttempts_1.sectionAttempts.status, "in_progress")));
    // Drizzle's mysql2 driver returns affectedRows on the result; if another
    // request won the race and already changed the status, treat as a conflict.
    const affectedRows = updateResult?.[0]?.affectedRows ?? updateResult?.affectedRows;
    if (affectedRows === 0) {
        throw new Errors_1.BadRequest("Could not start break — section state changed. Please refresh and try again.");
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Break started",
        breakStartedAt: now,
        breakLimited: row.breakLimited ?? false,
        maxBreakDurationMinutes: row.maxBreakDuration ?? null,
    });
};
exports.startBreak = startBreak;
