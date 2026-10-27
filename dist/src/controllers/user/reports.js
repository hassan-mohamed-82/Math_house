"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentDiagnosticExamReports = exports.getStudentExamReports = exports.getStudentQuizReports = void 0;
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
            id: schema_1.questionAnswers.id,
            pdf: schema_1.questionAnswers.pdf,
            video: schema_1.questionAnswers.video,
            image: schema_1.questionAnswers.image,
            text: schema_1.questionAnswers.text
        })
            .from(schema_1.questionAnswers)
            .where((0, drizzle_orm_1.inArray)(schema_1.questionAnswers.questionId, mistakenQuestionIds));
    }
    // Group answers by questionId as an array
    const rightSolutionsMap = new Map();
    for (const s of allRightSolutions) {
        if (!rightSolutionsMap.has(s.questionId))
            rightSolutionsMap.set(s.questionId, []);
        rightSolutionsMap.get(s.questionId).push({
            id: s.id,
            answerPdf: s.pdf,
            answerVideo: s.video,
            answerImage: s.image,
            answerText: s.text,
        });
    }
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
        const rightSolution = rightSolutionsMap.get(m.questionId) ?? [];
        const lessonDetail = m.lessonId ? lessonsMap.get(m.lessonId) || null : null;
        mistakesByAttemptMap.get(m.attemptId).push({
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
const getCategoryHierarchy = async (studentCategory) => {
    if (!studentCategory)
        return [];
    const categoryIds = [];
    let currentId = studentCategory;
    while (currentId) {
        if (!categoryIds.includes(currentId)) {
            categoryIds.push(currentId);
        }
        const [cat] = await connection_1.db
            .select({ parentCategoryId: schema_1.category.parentCategoryId })
            .from(schema_1.category)
            .where((0, drizzle_orm_1.eq)(schema_1.category.id, currentId));
        currentId = cat?.parentCategoryId ?? null;
    }
    const children = await connection_1.db
        .select({ id: schema_1.category.id })
        .from(schema_1.category)
        .where((0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, studentCategory));
    children.forEach(child => {
        if (!categoryIds.includes(child.id)) {
            categoryIds.push(child.id);
        }
    });
    return categoryIds;
};
const getLessonsToRecap = (attemptMistakes) => {
    const recapMap = new Map();
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
            recapMap.get(lessonId).count += 1;
        }
    });
    return Array.from(recapMap.values()).map(r => ({
        ...r.lesson,
        mistakesCount: r.count,
        attendedLesson: r.attendedLesson
    }));
};
// ===================== GET STUDENT EXAM REPORTS =====================
const getStudentExamReports = async (req, res) => {
    const studentId = getStudentId(req);
    const existingStudent = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new Errors_1.NotFound("Student not found");
    }
    const studentCategory = existingStudent[0].category;
    // 1. Fetch all attempts of the student for exams
    const studentAttempts = await connection_1.db
        .select()
        .from(schema_1.examAttempts)
        .where((0, drizzle_orm_1.eq)(schema_1.examAttempts.studentId, studentId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.examAttempts.startedAt));
    const attemptExamIds = studentAttempts.map(a => a.examId);
    // 2. Build Category Hierarchy
    const categoryIds = await getCategoryHierarchy(studentCategory);
    // 3. Fetch all exams in student's category hierarchy OR exams that the student has attempted
    const whereConditions = [];
    if (categoryIds.length > 0) {
        whereConditions.push((0, drizzle_orm_1.inArray)(schema_1.courses.categoryId, categoryIds));
    }
    else if (studentCategory) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.courses.categoryId, studentCategory));
    }
    if (attemptExamIds.length > 0) {
        whereConditions.push((0, drizzle_orm_1.inArray)(schema_1.Exams.id, attemptExamIds));
    }
    const allExams = whereConditions.length > 0
        ? await connection_1.db
            .select({
            id: schema_1.Exams.id,
            title: schema_1.Exams.title,
            description: schema_1.Exams.description,
            totalScore: schema_1.Exams.totalScore,
            passScore: schema_1.Exams.passScore,
            isActive: schema_1.Exams.isActive,
            courseId: schema_1.Exams.courseId,
            courseName: schema_1.courses.name,
        })
            .from(schema_1.Exams)
            .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.Exams.courseId, schema_1.courses.id))
            .where((0, drizzle_orm_1.or)(...whereConditions))
        : [];
    // 4. Gather completed attempt IDs to fetch mistakes
    const completedAttemptIds = studentAttempts
        .filter(a => a.status === "completed" || a.status === "timed_out")
        .map(a => a.id);
    let allMistakes = [];
    if (completedAttemptIds.length > 0) {
        allMistakes = await connection_1.db
            .select({
            attemptId: schema_1.studentAnswers.attemptId,
            questionId: schema_1.questions.id,
            questionText: schema_1.questions.question,
            questionImage: schema_1.questions.image,
            answerType: schema_1.questions.answerType,
            lessonId: schema_1.questions.lessonId,
            studentSelectedOptionId: schema_1.studentAnswers.selectedOptionId,
            studentGridInAnswer: schema_1.studentAnswers.gridInAnswer,
        })
            .from(schema_1.studentAnswers)
            .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.studentAnswers.questionId, schema_1.questions.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.studentAnswers.attemptId, completedAttemptIds), (0, drizzle_orm_1.eq)(schema_1.studentAnswers.isCorrect, false)));
    }
    // 5. Fetch details for mistaken questions: options, right solutions, lessons, and session attendance
    const mistakenQuestionIds = Array.from(new Set(allMistakes.map(m => m.questionId)));
    const lessonIds = Array.from(new Set(allMistakes.map(m => m.lessonId).filter((id) => !!id)));
    let lessonsList = [];
    if (lessonIds.length > 0) {
        lessonsList = await connection_1.db
            .select()
            .from(schema_1.lessons)
            .where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds));
    }
    const lessonsMap = new Map(lessonsList.map(l => [l.id, l]));
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
            id: schema_1.questionAnswers.id,
            pdf: schema_1.questionAnswers.pdf,
            video: schema_1.questionAnswers.video,
            image: schema_1.questionAnswers.image,
            text: schema_1.questionAnswers.text
        })
            .from(schema_1.questionAnswers)
            .where((0, drizzle_orm_1.inArray)(schema_1.questionAnswers.questionId, mistakenQuestionIds));
    }
    const rightSolutionsMap = new Map();
    for (const s of allRightSolutions) {
        if (!rightSolutionsMap.has(s.questionId))
            rightSolutionsMap.set(s.questionId, []);
        rightSolutionsMap.get(s.questionId).push({
            id: s.id,
            answerPdf: s.pdf,
            answerVideo: s.video,
            answerImage: s.image,
            answerText: s.text,
        });
    }
    const mistakesByAttemptMap = new Map();
    allMistakes.forEach(m => {
        if (!mistakesByAttemptMap.has(m.attemptId))
            mistakesByAttemptMap.set(m.attemptId, []);
        const qOptions = optionsMap.get(m.questionId) || [];
        const correctOption = qOptions.find(o => o.isCorrect);
        const studentOption = qOptions.find(o => o.id === m.studentSelectedOptionId);
        const rightSolution = rightSolutionsMap.get(m.questionId) ?? [];
        const lessonDetail = m.lessonId ? lessonsMap.get(m.lessonId) || null : null;
        const attendedLesson = m.lessonId ? attendedLessonIds.has(m.lessonId) : false;
        mistakesByAttemptMap.get(m.attemptId).push({
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
        let mistakes = [];
        let mistakesCount = 0;
        let lessonsToRecap = [];
        if (attempt) {
            if (attempt.status === "completed" || attempt.status === "timed_out") {
                status = "attend";
                attemptId = attempt.id;
                score = attempt.score;
                date = attempt.endedAt;
                mistakes = mistakesByAttemptMap.get(attempt.id) || [];
                mistakesCount = mistakes.length;
                lessonsToRecap = getLessonsToRecap(mistakes);
            }
            else if (attempt.status === "in_progress") {
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
    return (0, response_1.SuccessResponse)(res, {
        message: "Exam reports retrieved successfully",
        data: reportData
    });
};
exports.getStudentExamReports = getStudentExamReports;
// ===================== GET STUDENT DIAGNOSTIC EXAM REPORTS =====================
const getStudentDiagnosticExamReports = async (req, res) => {
    const studentId = getStudentId(req);
    const existingStudent = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new Errors_1.NotFound("Student not found");
    }
    const studentCategory = existingStudent[0].category;
    // 1. Fetch all attempts of the student for diagnostic exams
    const studentAttempts = await connection_1.db
        .select()
        .from(schema_1.diagnosticExamAttempt)
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamAttempt.studentId, studentId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.diagnosticExamAttempt.startedAt));
    const attemptExamIds = studentAttempts.map(a => a.diagnosticExamId);
    // 2. Build Category Hierarchy
    const categoryIds = await getCategoryHierarchy(studentCategory);
    // 3. Fetch all diagnostic exams in student's category hierarchy OR exams that the student has attempted
    const whereConditions = [];
    if (categoryIds.length > 0) {
        whereConditions.push((0, drizzle_orm_1.inArray)(schema_1.courses.categoryId, categoryIds));
    }
    else if (studentCategory) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.courses.categoryId, studentCategory));
    }
    if (attemptExamIds.length > 0) {
        whereConditions.push((0, drizzle_orm_1.inArray)(schema_1.diagnosticExam.id, attemptExamIds));
    }
    const allDiagnosticExams = whereConditions.length > 0
        ? await connection_1.db
            .select({
            id: schema_1.diagnosticExam.id,
            title: schema_1.diagnosticExam.title,
            description: schema_1.diagnosticExam.description,
            totalScore: schema_1.diagnosticExam.totalScore,
            passScore: schema_1.diagnosticExam.passScore,
            duration: schema_1.diagnosticExam.duration,
            numberOfQuestions: schema_1.diagnosticExam.numberOfQuestions,
            isActive: schema_1.diagnosticExam.isActive,
            courseId: schema_1.diagnosticExam.courseId,
            courseName: schema_1.courses.name,
        })
            .from(schema_1.diagnosticExam)
            .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.diagnosticExam.courseId, schema_1.courses.id))
            .where((0, drizzle_orm_1.or)(...whereConditions))
        : [];
    // 4. Gather completed attempt IDs to fetch mistakes
    const completedAttemptIds = studentAttempts
        .filter(a => a.isCompleted)
        .map(a => a.id);
    let allMistakes = [];
    if (completedAttemptIds.length > 0) {
        allMistakes = await connection_1.db
            .select({
            attemptId: schema_1.studentDiagnosticAnswers.attemptId,
            questionId: schema_1.questions.id,
            questionText: schema_1.questions.question,
            questionImage: schema_1.questions.image,
            answerType: schema_1.questions.answerType,
            lessonId: schema_1.questions.lessonId,
            studentAnswerId: schema_1.studentDiagnosticAnswers.studentAnswerId,
            studentGridInAnswer: schema_1.studentDiagnosticAnswers.studentGridInAnswer,
        })
            .from(schema_1.studentDiagnosticAnswers)
            .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.studentDiagnosticAnswers.questionId, schema_1.questions.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.studentDiagnosticAnswers.attemptId, completedAttemptIds), (0, drizzle_orm_1.eq)(schema_1.studentDiagnosticAnswers.isCorrect, false)));
    }
    // 5. Fetch details for mistaken questions: options, right solutions, lessons, and session attendance
    const mistakenQuestionIds = Array.from(new Set(allMistakes.map(m => m.questionId)));
    const lessonIds = Array.from(new Set(allMistakes.map(m => m.lessonId).filter((id) => !!id)));
    let lessonsList = [];
    if (lessonIds.length > 0) {
        lessonsList = await connection_1.db
            .select()
            .from(schema_1.lessons)
            .where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds));
    }
    const lessonsMap = new Map(lessonsList.map(l => [l.id, l]));
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
            id: schema_1.questionAnswers.id,
            pdf: schema_1.questionAnswers.pdf,
            video: schema_1.questionAnswers.video,
            image: schema_1.questionAnswers.image,
            text: schema_1.questionAnswers.text
        })
            .from(schema_1.questionAnswers)
            .where((0, drizzle_orm_1.inArray)(schema_1.questionAnswers.questionId, mistakenQuestionIds));
    }
    const rightSolutionsMap = new Map();
    for (const s of allRightSolutions) {
        if (!rightSolutionsMap.has(s.questionId))
            rightSolutionsMap.set(s.questionId, []);
        rightSolutionsMap.get(s.questionId).push({
            id: s.id,
            answerPdf: s.pdf,
            answerVideo: s.video,
            answerImage: s.image,
            answerText: s.text,
        });
    }
    const mistakesByAttemptMap = new Map();
    allMistakes.forEach(m => {
        if (!mistakesByAttemptMap.has(m.attemptId))
            mistakesByAttemptMap.set(m.attemptId, []);
        const qOptions = optionsMap.get(m.questionId) || [];
        const correctOption = qOptions.find(o => o.isCorrect);
        const studentOption = qOptions.find(o => o.id === m.studentAnswerId);
        const rightSolution = rightSolutionsMap.get(m.questionId) ?? [];
        const lessonDetail = m.lessonId ? lessonsMap.get(m.lessonId) || null : null;
        const attendedLesson = m.lessonId ? attendedLessonIds.has(m.lessonId) : false;
        mistakesByAttemptMap.get(m.attemptId).push({
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
        let mistakes = [];
        let mistakesCount = 0;
        let lessonsToRecap = [];
        if (attempt) {
            if (attempt.isCompleted) {
                status = "attend";
                attemptId = attempt.id;
                score = attempt.score;
                date = attempt.endedAt;
                mistakes = mistakesByAttemptMap.get(attempt.id) || [];
                mistakesCount = mistakes.length;
                lessonsToRecap = getLessonsToRecap(mistakes);
            }
            else {
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
    return (0, response_1.SuccessResponse)(res, {
        message: "Diagnostic exam reports retrieved successfully",
        data: reportData
    });
};
exports.getStudentDiagnosticExamReports = getStudentDiagnosticExamReports;
