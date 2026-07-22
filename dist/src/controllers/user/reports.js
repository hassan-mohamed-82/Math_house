"use strict";
// import { Request, Response } from "express";
// import { db } from "../../models/connection";
// import { quizAttempts, studentQuizAnswers, quizzes, questions, questionOptions, Student } from "../../models/schema";
// import { eq, and, inArray } from "drizzle-orm";
// import { SuccessResponse } from "../../utils/response";
// import { NotFound, UnauthorizedError } from "../../Errors";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentQuizReports = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const getStudentId = (req) => {
    if (!req.user?.id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return req.user.id;
};
const getStudentQuizReports = async (req, res) => {
    const studentId = getStudentId(req);
    const existingStudent = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new Errors_1.NotFound("Student not found");
    }
    const studentCategory = existingStudent[0].category;
    // 1. Fetch all attempts of the student for quizzes
    const studentAttempts = await connection_1.db
        .select()
        .from(schema_1.quizAttempts)
        .where((0, drizzle_orm_1.eq)(schema_1.quizAttempts.studentId, studentId));
    const attemptQuizIds = studentAttempts.map(a => a.quizId);
    // 2. Fetch all quizzes in student's category OR quizzes that the student has attempted
    const whereConditions = [
        (0, drizzle_orm_1.eq)(schema_1.quizzes.categoryId, studentCategory),
        (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, studentCategory)
    ];
    if (attemptQuizIds.length > 0) {
        whereConditions.push((0, drizzle_orm_1.inArray)(schema_1.quizzes.id, attemptQuizIds));
    }
    const allQuizzes = await connection_1.db
        .select({
        id: schema_1.quizzes.id,
        title: schema_1.quizzes.title,
        description: schema_1.quizzes.description,
        durationHours: schema_1.quizzes.durationHours,
        durationMinutes: schema_1.quizzes.durationMinutes,
        totalScore: schema_1.quizzes.totalScore,
        passScore: schema_1.quizzes.passScore,
        quizOrder: schema_1.quizzes.quizOrder,
        lessonId: schema_1.quizzes.lessonId,
        isActive: schema_1.quizzes.isActive,
    })
        .from(schema_1.quizzes)
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.quizzes.courseId, schema_1.courses.id))
        .where((0, drizzle_orm_1.or)(...whereConditions));
    // 3. Gather all unique lesson IDs from quizzes
    const lessonIds = Array.from(new Set(allQuizzes.map(q => q.lessonId).filter((id) => !!id)));
    // 4. Fetch lesson details
    let lessonsList = [];
    if (lessonIds.length > 0) {
        lessonsList = await connection_1.db
            .select()
            .from(schema_1.lessons)
            .where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds));
    }
    const lessonsMap = new Map(lessonsList.map(l => [l.id, l]));
    // 5. Fetch session attendance matching student and present for those lessons
    let attendedLessonIds = new Set();
    if (lessonIds.length > 0) {
        const studentLessonAttendance = await connection_1.db
            .select({
            lessonId: schema_1.sessionLessons.lessonId
        })
            .from(schema_1.sessionLessons)
            .innerJoin(schema_1.sessionAttendance, (0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, schema_1.sessionAttendance.sessionId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionAttendance.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.sessionAttendance.status, "present"), (0, drizzle_orm_1.inArray)(schema_1.sessionLessons.lessonId, lessonIds)));
        attendedLessonIds = new Set(studentLessonAttendance.map(a => a.lessonId));
    }
    // 6. Gather completed attempt IDs to fetch mistakes
    const completedAttemptIds = studentAttempts
        .filter(a => a.status === "completed" || a.status === "timed_out")
        .map(a => a.id);
    let allMistakes = [];
    if (completedAttemptIds.length > 0) {
        allMistakes = await connection_1.db
            .select({
            attemptId: schema_1.studentQuizAnswers.attemptId,
            questionId: schema_1.questions.id,
            questionText: schema_1.questions.question,
            lessonId: schema_1.questions.lessonId,
            studentSelectedOptionId: schema_1.studentQuizAnswers.selectedOptionId,
            studentGridInAnswer: schema_1.studentQuizAnswers.gridInAnswer,
        })
            .from(schema_1.studentQuizAnswers)
            .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.studentQuizAnswers.questionId, schema_1.questions.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.studentQuizAnswers.attemptId, completedAttemptIds), (0, drizzle_orm_1.eq)(schema_1.studentQuizAnswers.isCorrect, false)));
    }
    // 7. Fetch details for mistaken questions: options and right solutions
    const mistakenQuestionIds = Array.from(new Set(allMistakes.map(m => m.questionId)));
    let allOptions = [];
    if (mistakenQuestionIds.length > 0) {
        allOptions = await connection_1.db
            .select({
            id: schema_1.questionOptions.id,
            questionId: schema_1.questionOptions.questionId,
            answer: schema_1.questionOptions.answer,
            isCorrect: schema_1.questionOptions.isCorrect,
            order: schema_1.questionOptions.order
        })
            .from(schema_1.questionOptions)
            .where((0, drizzle_orm_1.inArray)(schema_1.questionOptions.questionId, mistakenQuestionIds));
    }
    const optionsMap = new Map();
    allOptions.forEach(o => {
        if (!optionsMap.has(o.questionId))
            optionsMap.set(o.questionId, []);
        optionsMap.get(o.questionId).push(o);
    });
    let allRightSolutions = [];
    if (mistakenQuestionIds.length > 0) {
        allRightSolutions = await connection_1.db
            .select({
            questionId: schema_1.questionAnswers.questionId,
            pdf: schema_1.questionAnswers.pdf,
            video: schema_1.questionAnswers.video,
            image: schema_1.questionAnswers.image,
            text: schema_1.questionAnswers.text
        })
            .from(schema_1.questionAnswers)
            .where((0, drizzle_orm_1.inArray)(schema_1.questionAnswers.questionId, mistakenQuestionIds));
    }
    const rightSolutionsMap = new Map(allRightSolutions.map(s => [s.questionId, s]));
    // 8. Fetch missing lessons details from mistaken questions if they are not already in lessonsMap
    const mistakenQuestionLessonIds = Array.from(new Set(allMistakes.map(m => m.lessonId).filter((id) => !!id)));
    const missingLessonIds = mistakenQuestionLessonIds.filter(id => !lessonsMap.has(id));
    if (missingLessonIds.length > 0) {
        const missingLessons = await connection_1.db
            .select()
            .from(schema_1.lessons)
            .where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, missingLessonIds));
        missingLessons.forEach(l => lessonsMap.set(l.id, l));
    }
    const mistakesByAttemptMap = new Map();
    allMistakes.forEach(m => {
        if (!mistakesByAttemptMap.has(m.attemptId))
            mistakesByAttemptMap.set(m.attemptId, []);
        const qOptions = optionsMap.get(m.questionId) || [];
        const correctOption = qOptions.find(o => o.isCorrect);
        const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);
        const rightSolution = rightSolutionsMap.get(m.questionId) || null;
        const lessonDetail = m.lessonId ? lessonsMap.get(m.lessonId) || null : null;
        mistakesByAttemptMap.get(m.attemptId).push({
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
        let mistakes = [];
        let mistakesCount = 0;
        if (attempt) {
            if (attempt.status === "completed" || attempt.status === "timed_out") {
                status = "attend";
                attemptId = attempt.id;
                score = attempt.score;
                date = attempt.endedAt;
                mistakes = mistakesByAttemptMap.get(attempt.id) || [];
                mistakesCount = mistakes.length;
            }
            else if (attempt.status === "in_progress") {
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
    return (0, response_1.SuccessResponse)(res, {
        message: "Quiz reports retrieved successfully",
        data: reportData
    });
};
exports.getStudentQuizReports = getStudentQuizReports;
