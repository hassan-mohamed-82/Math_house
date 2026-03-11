"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitExam = exports.startExam = exports.getExamById = exports.getExams = void 0;
const connection_1 = require("../../models/connection");
const exams_1 = require("../../models/schema/admin/exams");
const examAttempts_1 = require("../../models/schema/admin/examAttempts");
const studentAnswers_1 = require("../../models/schema/admin/studentAnswers");
const Student_1 = require("../../models/schema/admin/Student");
const courses_1 = require("../../models/schema/admin/courses");
const category_1 = require("../../models/schema/admin/category");
const sections_1 = require("../../models/schema/admin/sections");
const questions_1 = require("../../models/schema/admin/questions");
const examCodes_1 = require("../../models/schema/admin/examCodes");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const crypto_1 = require("crypto");
const getStudentId = (req) => {
    if (!req.user?.id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return req.user.id;
};
// ===================== GET ALL EXAMS (filtered by student's category) =====================
const getExams = async (req, res) => {
    const studentId = getStudentId(req);
    // 1. Get student's category
    const [student] = await connection_1.db
        .select({ categoryId: Student_1.Student.category, examBalance: Student_1.Student.exambalance })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (!student)
        throw new Errors_1.NotFound("Student not found");
    // 2. Get all ancestor categories (student's category + all parents)
    const categoryIds = [];
    let currentCategoryId = student.categoryId;
    while (currentCategoryId) {
        categoryIds.push(currentCategoryId);
        const [cat] = await connection_1.db
            .select({ parentCategoryId: category_1.category.parentCategoryId })
            .from(category_1.category)
            .where((0, drizzle_orm_1.eq)(category_1.category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }
    // 3. Get courses that belong to the student's category hierarchy
    const studentCourses = await connection_1.db
        .select({ id: courses_1.courses.id })
        .from(courses_1.courses)
        .where((0, drizzle_orm_1.inArray)(courses_1.courses.categoryId, categoryIds));
    const courseIds = studentCourses.map(c => c.id);
    if (courseIds.length === 0) {
        return (0, response_1.SuccessResponse)(res, { examBalance: student.examBalance, exams: [] });
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
        courseName: courses_1.courses.name,
        codeName: examCodes_1.examCodes.code,
        createdAt: exams_1.Exams.createdAt,
    })
        .from(exams_1.Exams)
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(exams_1.Exams.courseId, courses_1.courses.id))
        .leftJoin(examCodes_1.examCodes, (0, drizzle_orm_1.eq)(exams_1.Exams.codeId, examCodes_1.examCodes.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(exams_1.Exams.courseId, courseIds), (0, drizzle_orm_1.eq)(exams_1.Exams.isActive, true)))
        .orderBy(exams_1.Exams.createdAt);
    // 5. Get attempts for these exams to show status
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.inArray)(examAttempts_1.examAttempts.examId, examIds)));
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
    (0, response_1.SuccessResponse)(res, { examBalance: student.examBalance, exams: examsWithStatus });
};
exports.getExams = getExams;
// ===================== GET EXAM BY ID =====================
const getExamById = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;
    // 1. Get student's category
    const [student] = await connection_1.db
        .select({ categoryId: Student_1.Student.category })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (!student)
        throw new Errors_1.NotFound("Student not found");
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
    })
        .from(exams_1.Exams)
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(exams_1.Exams.courseId, courses_1.courses.id))
        .leftJoin(examCodes_1.examCodes, (0, drizzle_orm_1.eq)(exams_1.Exams.codeId, examCodes_1.examCodes.id))
        .where((0, drizzle_orm_1.eq)(exams_1.Exams.id, examId));
    if (!exam)
        throw new Errors_1.NotFound("Exam not found");
    if (!exam.isActive)
        throw new Errors_1.BadRequest("Exam is not active");
    // 3. Verify student's category matches the exam's course category
    const categoryIds = [];
    let currentCategoryId = student.categoryId;
    while (currentCategoryId) {
        categoryIds.push(currentCategoryId);
        const [cat] = await connection_1.db
            .select({ parentCategoryId: category_1.category.parentCategoryId })
            .from(category_1.category)
            .where((0, drizzle_orm_1.eq)(category_1.category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }
    if (!categoryIds.includes(exam.courseCategoryId)) {
        throw new Errors_1.BadRequest("This exam is not available for your category");
    }
    // 4. Fetch sections with questions
    const sections = await connection_1.db
        .select({
        id: exams_1.ExamSections.id,
        sectionOrder: exams_1.ExamSections.sectionOrder,
        sectionName: sections_1.Sections.sectionName,
        sectionDescription: sections_1.Sections.sectionDescription,
        sectionTime: sections_1.Sections.sectionTime,
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
        // Get options for all questions
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
    const [existingAttempt] = await connection_1.db
        .select({
        id: examAttempts_1.examAttempts.id,
        status: examAttempts_1.examAttempts.status,
        startedAt: examAttempts_1.examAttempts.startedAt,
        score: examAttempts_1.examAttempts.score,
        isPassed: examAttempts_1.examAttempts.isPassed,
    })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId)));
    (0, response_1.SuccessResponse)(res, {
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
exports.getExamById = getExamById;
// ===================== START EXAM =====================
const startExam = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;
    // 1. Verify exam exists and is active
    const [exam] = await connection_1.db
        .select({
        id: exams_1.Exams.id,
        isActive: exams_1.Exams.isActive,
        courseId: exams_1.Exams.courseId,
        duration: exams_1.Exams.duration,
    })
        .from(exams_1.Exams)
        .where((0, drizzle_orm_1.eq)(exams_1.Exams.id, examId));
    if (!exam)
        throw new Errors_1.NotFound("Exam not found");
    if (!exam.isActive)
        throw new Errors_1.BadRequest("Exam is not active");
    // 2. Check student balance
    const [student] = await connection_1.db
        .select({ examBalance: Student_1.Student.exambalance, categoryId: Student_1.Student.category })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (!student)
        throw new Errors_1.NotFound("Student not found");
    if (student.examBalance <= 0)
        throw new Errors_1.BadRequest("Insufficient exam balance");
    // 3. Verify category access
    const [course] = await connection_1.db
        .select({ categoryId: courses_1.courses.categoryId })
        .from(courses_1.courses)
        .where((0, drizzle_orm_1.eq)(courses_1.courses.id, exam.courseId));
    if (!course)
        throw new Errors_1.NotFound("Course not found");
    const categoryIds = [];
    let currentCategoryId = student.categoryId;
    while (currentCategoryId) {
        categoryIds.push(currentCategoryId);
        const [cat] = await connection_1.db
            .select({ parentCategoryId: category_1.category.parentCategoryId })
            .from(category_1.category)
            .where((0, drizzle_orm_1.eq)(category_1.category.id, currentCategoryId));
        currentCategoryId = cat?.parentCategoryId ?? null;
    }
    if (!categoryIds.includes(course.categoryId)) {
        throw new Errors_1.BadRequest("This exam is not available for your category");
    }
    // 4. Check for existing in-progress attempt
    const [existingAttempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id, startedAt: examAttempts_1.examAttempts.startedAt })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.status, "in_progress")));
    if (existingAttempt) {
        // Return the existing attempt instead of creating a new one
        return (0, response_1.SuccessResponse)(res, {
            message: "Exam already in progress",
            attempt: existingAttempt,
        });
    }
    // 5. Check if already completed
    const [completedAttempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.status, "completed")));
    if (completedAttempt) {
        throw new Errors_1.BadRequest("You have already completed this exam");
    }
    // 6. Create attempt and deduct balance in a transaction
    const attemptId = (0, crypto_1.randomUUID)();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(examAttempts_1.examAttempts).values({
            id: attemptId,
            studentId,
            examId,
            status: "in_progress",
        });
        await tx
            .update(Student_1.Student)
            .set({ exambalance: (0, drizzle_orm_1.sql) `${Student_1.Student.exambalance} - 1` })
            .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Exam started successfully",
        attempt: { id: attemptId, examId, duration: exam.duration },
    }, 201);
};
exports.startExam = startExam;
// ===================== SUBMIT / END EXAM =====================
const submitExam = async (req, res) => {
    const studentId = getStudentId(req);
    const { examId } = req.params;
    const { answers } = req.body;
    // answers: { questionId: string, selectedOptionId?: string, gridInAnswer?: string }[]
    if (!Array.isArray(answers)) {
        throw new Errors_1.BadRequest("Answers must be an array");
    }
    // 1. Get in-progress attempt
    const [attempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id, startedAt: examAttempts_1.examAttempts.startedAt })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.status, "in_progress")));
    if (!attempt)
        throw new Errors_1.NotFound("No in-progress exam attempt found");
    // 2. Get exam details for scoring
    const [exam] = await connection_1.db
        .select({ duration: exams_1.Exams.duration, totalScore: exams_1.Exams.totalScore, passScore: exams_1.Exams.passScore })
        .from(exams_1.Exams)
        .where((0, drizzle_orm_1.eq)(exams_1.Exams.id, examId));
    if (!exam)
        throw new Errors_1.NotFound("Exam not found");
    // 3. Check if exam time has expired
    const startedAt = new Date(attempt.startedAt).getTime();
    const now = Date.now();
    const durationMs = exam.duration * 60 * 1000;
    const isTimedOut = (now - startedAt) > durationMs;
    // 4. Get all section questions with their scores and correct answers
    const examSections = await connection_1.db
        .select({ id: exams_1.ExamSections.id })
        .from(exams_1.ExamSections)
        .where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, examId));
    const examSectionIds = examSections.map(s => s.id);
    const sectionQuestionsData = await connection_1.db
        .select({
        questionId: exams_1.SectionQuestions.questionId,
        score: exams_1.SectionQuestions.score,
        answerType: questions_1.questions.answerType,
    })
        .from(exams_1.SectionQuestions)
        .leftJoin(questions_1.questions, (0, drizzle_orm_1.eq)(exams_1.SectionQuestions.questionId, questions_1.questions.id))
        .where((0, drizzle_orm_1.inArray)(exams_1.SectionQuestions.sectionId, examSectionIds));
    // Build a map: questionId -> { score, answerType }
    const questionScoreMap = new Map(sectionQuestionsData.map(sq => [sq.questionId, { score: sq.score, answerType: sq.answerType }]));
    // 5. Get correct options for MCQ questions
    const questionIds = sectionQuestionsData.map(sq => sq.questionId);
    const correctOptions = await connection_1.db
        .select({
        id: questions_1.questionOptions.id,
        questionId: questions_1.questionOptions.questionId,
    })
        .from(questions_1.questionOptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(questions_1.questionOptions.questionId, questionIds), (0, drizzle_orm_1.eq)(questions_1.questionOptions.isCorrect, true)));
    const correctOptionMap = new Map(correctOptions.map(opt => [opt.questionId, opt.id]));
    // 6. Score each answer
    let totalAchievedScore = 0;
    const answersToInsert = [];
    for (const answer of answers) {
        const { questionId, selectedOptionId, gridInAnswer } = answer;
        const questionInfo = questionScoreMap.get(questionId);
        if (!questionInfo)
            continue; // Skip answers for questions not in this exam
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
            id: (0, crypto_1.randomUUID)(),
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
    await connection_1.db.transaction(async (tx) => {
        if (answersToInsert.length > 0) {
            await tx.insert(studentAnswers_1.studentAnswers).values(answersToInsert);
        }
        await tx
            .update(examAttempts_1.examAttempts)
            .set({
            endedAt: new Date(),
            score: totalAchievedScore,
            isPassed,
            status: finalStatus,
        })
            .where((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.id, attempt.id));
    });
    (0, response_1.SuccessResponse)(res, {
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
exports.submitExam = submitExam;
