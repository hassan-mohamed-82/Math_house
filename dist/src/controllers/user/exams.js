"use strict";
// import { Request, Response } from "express";
// import { db } from "../../models/connection";
// import { Exams, ExamSections, SectionQuestions } from "../../models/schema/admin/exams";
// import { examAttempts } from "../../models/schema/admin/examAttempts";
// import { studentAnswers } from "../../models/schema/admin/studentAnswers";
// import { Student } from "../../models/schema/admin/Student";
// import { courses } from "../../models/schema/admin/courses";
// import { category } from "../../models/schema/admin/category";
// import { Sections } from "../../models/schema/admin/sections";
// import { questions, questionOptions } from "../../models/schema/admin/questions";
// import { examCodes } from "../../models/schema/admin/examCodes";
// import { eq, and, inArray, sql } from "drizzle-orm";
// import { SuccessResponse } from "../../utils/response";
// import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";
// import { randomUUID } from "crypto";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showQuestionAnswer = exports.submitExam = exports.startExam = exports.getExamById = exports.getExams = void 0;
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
    // 1. Get student's category and balance
    const [student] = await connection_1.db
        .select({ categoryId: Student_1.Student.category, examBalance: Student_1.Student.exambalance })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (!student)
        throw new Errors_1.NotFound("Student not found");
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
        .select({ id: courses_1.courses.id })
        .from(courses_1.courses)
        .where((0, drizzle_orm_1.inArray)(courses_1.courses.categoryId, categoryIds));
    const courseIds = studentCourses.map(c => c.id);
    // If no courses found, return early with empty exams
    if (courseIds.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
            examBalance: student.examBalance,
            exams: [],
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
        courseName: courses_1.courses.name,
        codeName: examCodes_1.examCodes.code,
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.inArray)(examAttempts_1.examAttempts.examId, examIds)));
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
    return (0, response_1.SuccessResponse)(res, {
        examBalance: student.examBalance,
        exams: examsWithStatus
    });
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
        formattedSections = sections.map(section => ({
            ...section,
            questions: sectionQuestions
                .filter(sq => sq.sectionId === section.id)
                .map(sq => ({
                ...sq,
                options: optionsMap.get(sq.questionId) ?? [],
            })),
        }));
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
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId)));
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
    // 5. Check if already completed
    const [completedAttempt] = await connection_1.db
        .select({ id: examAttempts_1.examAttempts.id })
        .from(examAttempts_1.examAttempts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.studentId, studentId), (0, drizzle_orm_1.eq)(examAttempts_1.examAttempts.examId, examId), (0, drizzle_orm_1.inArray)(examAttempts_1.examAttempts.status, ["completed", "timed_out"])));
    if (completedAttempt) {
        throw new Errors_1.BadRequest("You have already completed this exam");
    }
    // Check balance only for new attempts
    if (student.examBalance <= 0)
        throw new Errors_1.BadRequest("Insufficient exam balance");
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
        const isCorrect = info.type === "MCQ" ? ans.selectedOptionId === correct?.id : ans.gridInAnswer?.trim().toLowerCase() === correct?.answer.trim().toLowerCase();
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
    const wrongIds = answersToInsert.filter((a) => !a.isCorrect).map((a) => a.questionId);
    let mistakes = [];
    if (wrongIds.length > 0) {
        const qs = await connection_1.db.select().from(questions_1.questions).where((0, drizzle_orm_1.inArray)(questions_1.questions.id, wrongIds));
        const opts = await connection_1.db.select().from(questions_1.questionOptions).where((0, drizzle_orm_1.inArray)(questions_1.questionOptions.questionId, wrongIds));
        const media = await connection_1.db.select().from(questions_1.questionAnswers).where((0, drizzle_orm_1.inArray)(questions_1.questionAnswers.questionId, wrongIds));
        mistakes = qs.map(q => ({ ...q, options: opts.filter(o => o.questionId === q.id), explanation: media.find(m => m.questionId === q.id) }));
    }
    return (0, response_1.SuccessResponse)(res, { result: { attemptId: attempt.id, score: totalAchievedScore, totalScore: exam.totalScore, passScore: exam.passScore, isPassed, status: finalStatus, mistakes } });
};
exports.submitExam = submitExam;
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
    // 3. جلب الميديا (الفيديو والـ PDF) من جدول questionAnswers بناءً على الـ Schema
    const [media] = await connection_1.db
        .select({
        pdf: questions_1.questionAnswers.pdf,
        video: questions_1.questionAnswers.video,
    })
        .from(questions_1.questionAnswers)
        .where((0, drizzle_orm_1.eq)(questions_1.questionAnswers.questionId, questionId));
    (0, response_1.SuccessResponse)(res, {
        message: "Answer and explanations revealed",
        result: {
            correctOptions,
            explanation: media ?? null // سيعيد null إذا لم يكن هناك فيديو أو PDF
        },
    });
};
exports.showQuestionAnswer = showQuestionAnswer;
