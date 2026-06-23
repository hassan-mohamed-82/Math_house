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

// const getStudentId = (req: Request): string => {
//     if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
//     return req.user.id;
// };

// // ===================== GET ALL EXAMS (filtered by student's category) =====================
// export const getExams = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);

//     // 1. Get student's category
//     const [student] = await db
//         .select({ categoryId: Student.category, examBalance: Student.exambalance })
//         .from(Student)
//         .where(eq(Student.id, studentId));

//     if (!student) throw new NotFound("Student not found");

//     // 2. Get all ancestor categories (student's category + all parents)
//     const categoryIds: string[] = [];
//     let currentCategoryId: string | null = student.categoryId;

//     while (currentCategoryId) {
//         categoryIds.push(currentCategoryId);
//         const [cat] = await db
//             .select({ parentCategoryId: category.parentCategoryId })
//             .from(category)
//             .where(eq(category.id, currentCategoryId));
//         currentCategoryId = cat?.parentCategoryId ?? null;
//     }

//     // 3. Get courses that belong to the student's category hierarchy
//     const studentCourses = await db
//         .select({ id: courses.id })
//         .from(courses)
//         .where(inArray(courses.categoryId, categoryIds));

//     const courseIds = studentCourses.map(c => c.id);

//     if (courseIds.length === 0) {
//         return SuccessResponse(res, { examBalance: student.examBalance, exams: [] });
//     }

//     // 4. Get active exams for those courses
//     const exams = await db
//         .select({
//             id: Exams.id,
//             title: Exams.title,
//             description: Exams.description,
//             duration: Exams.duration,
//             totalScore: Exams.totalScore,
//             passScore: Exams.passScore,
//             examType: Exams.examType,
//             year: Exams.year,
//             month: Exams.Month,
//             courseName: courses.name,
//             codeName: examCodes.code,
//             createdAt: Exams.createdAt,
//         })
//         .from(Exams)
//         .leftJoin(courses, eq(Exams.courseId, courses.id))
//         .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
//         .where(and(
//             inArray(Exams.courseId, courseIds),
//             eq(Exams.isActive, true),
//         ))
//         .orderBy(Exams.createdAt);

//     // 5. Get attempts for these exams to show status
//     const examIds = exams.map(e => e.id);
//     let attemptsMap = new Map<string, { status: string; score: number | null; isPassed: boolean | null }>();

//     if (examIds.length > 0) {
//         const attempts = await db
//             .select({
//                 examId: examAttempts.examId,
//                 status: examAttempts.status,
//                 score: examAttempts.score,
//                 isPassed: examAttempts.isPassed,
//             })
//             .from(examAttempts)
//             .where(and(
//                 eq(examAttempts.studentId, studentId),
//                 inArray(examAttempts.examId, examIds),
//             ));

//         for (const attempt of attempts) {
//             attemptsMap.set(attempt.examId, {
//                 status: attempt.status,
//                 score: attempt.score,
//                 isPassed: attempt.isPassed,
//             });
//         }
//     }

//     const examsWithStatus = exams.map(exam => ({
//         ...exam,
//         attempt: attemptsMap.get(exam.id) ?? null,
//     }));

//     SuccessResponse(res, { examBalance: student.examBalance, exams: examsWithStatus });
// };

// // ===================== GET EXAM BY ID =====================
// export const getExamById = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);
//     const { examId } = req.params;

//     // 1. Get student's category
//     const [student] = await db
//         .select({ categoryId: Student.category })
//         .from(Student)
//         .where(eq(Student.id, studentId));

//     if (!student) throw new NotFound("Student not found");

//     // 2. Fetch exam with course info
//     const [exam] = await db
//         .select({
//             id: Exams.id,
//             title: Exams.title,
//             description: Exams.description,
//             duration: Exams.duration,
//             totalScore: Exams.totalScore,
//             passScore: Exams.passScore,
//             examType: Exams.examType,
//             year: Exams.year,
//             month: Exams.Month,
//             isActive: Exams.isActive,
//             courseId: Exams.courseId,
//             courseName: courses.name,
//             courseCategoryId: courses.categoryId,
//             codeName: examCodes.code,
//         })
//         .from(Exams)
//         .leftJoin(courses, eq(Exams.courseId, courses.id))
//         .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
//         .where(eq(Exams.id, examId));

//     if (!exam) throw new NotFound("Exam not found");
//     if (!exam.isActive) throw new BadRequest("Exam is not active");

//     // 3. Verify student's category matches the exam's course category
//     const categoryIds: string[] = [];
//     let currentCategoryId: string | null = student.categoryId;

//     while (currentCategoryId) {
//         categoryIds.push(currentCategoryId);
//         const [cat] = await db
//             .select({ parentCategoryId: category.parentCategoryId })
//             .from(category)
//             .where(eq(category.id, currentCategoryId));
//         currentCategoryId = cat?.parentCategoryId ?? null;
//     }

//     if (!categoryIds.includes(exam.courseCategoryId!)) {
//         throw new BadRequest("This exam is not available for your category");
//     }

//     // 4. Fetch sections with questions
//     const sections = await db
//         .select({
//             id: ExamSections.id,
//             sectionOrder: ExamSections.sectionOrder,
//             sectionName: Sections.sectionName,
//             sectionDescription: Sections.sectionDescription,
//             sectionTime: Sections.sectionTime,
//         })
//         .from(ExamSections)
//         .leftJoin(Sections, eq(ExamSections.sectionId, Sections.id))
//         .where(eq(ExamSections.examId, examId))
//         .orderBy(ExamSections.sectionOrder);

//     const sectionIds = sections.map(s => s.id);

//     let formattedSections: any[] = [];

//     if (sectionIds.length > 0) {
//         const sectionQuestions = await db
//             .select({
//                 id: SectionQuestions.id,
//                 sectionId: SectionQuestions.sectionId,
//                 questionId: SectionQuestions.questionId,
//                 questionOrder: SectionQuestions.questionOrder,
//                 score: SectionQuestions.score,
//                 questionText: questions.question,
//                 questionImage: questions.image,
//                 answerType: questions.answerType,
//                 difficulty: questions.difficulty,
//             })
//             .from(SectionQuestions)
//             .leftJoin(questions, eq(SectionQuestions.questionId, questions.id))
//             .where(inArray(SectionQuestions.sectionId, sectionIds))
//             .orderBy(SectionQuestions.questionOrder);

//         // Get options for all questions
//         const questionIds = sectionQuestions.map(q => q.questionId);

//         let optionsMap = new Map<string, { id: string; answer: string; order: string | null }[]>();

//         if (questionIds.length > 0) {
//             const options = await db
//                 .select({
//                     id: questionOptions.id,
//                     questionId: questionOptions.questionId,
//                     answer: questionOptions.answer,
//                     order: questionOptions.order,
//                 })
//                 .from(questionOptions)
//                 .where(inArray(questionOptions.questionId, questionIds));

//             for (const opt of options) {
//                 const existing = optionsMap.get(opt.questionId) ?? [];
//                 existing.push({ id: opt.id, answer: opt.answer, order: opt.order });
//                 optionsMap.set(opt.questionId, existing);
//             }
//         }

//         formattedSections = sections.map(section => {
//             const sectionQs = sectionQuestions
//                 .filter(sq => sq.sectionId === section.id)
//                 .map(sq => ({
//                     ...sq,
//                     options: optionsMap.get(sq.questionId) ?? [],
//                 }));
//             return { ...section, questions: sectionQs };
//         });
//     }

//     // 5. Check if student has an existing attempt
//     const [existingAttempt] = await db
//         .select({
//             id: examAttempts.id,
//             status: examAttempts.status,
//             startedAt: examAttempts.startedAt,
//             score: examAttempts.score,
//             isPassed: examAttempts.isPassed,
//         })
//         .from(examAttempts)
//         .where(and(
//             eq(examAttempts.studentId, studentId),
//             eq(examAttempts.examId, examId),
//         ));

//     SuccessResponse(res, {
//         exam: {
//             id: exam.id,
//             title: exam.title,
//             description: exam.description,
//             duration: exam.duration,
//             totalScore: exam.totalScore,
//             passScore: exam.passScore,
//             examType: exam.examType,
//             year: exam.year,
//             month: exam.month,
//             courseName: exam.courseName,
//             codeName: exam.codeName,
//             sections: formattedSections,
//         },
//         attempt: existingAttempt ?? null,
//     });
// };

// // ===================== START EXAM =====================
// export const startExam = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);
//     const { examId } = req.params;

//     // 1. Verify exam exists and is active
//     const [exam] = await db
//         .select({
//             id: Exams.id,
//             isActive: Exams.isActive,
//             courseId: Exams.courseId,
//             duration: Exams.duration,
//         })
//         .from(Exams)
//         .where(eq(Exams.id, examId));

//     if (!exam) throw new NotFound("Exam not found");
//     if (!exam.isActive) throw new BadRequest("Exam is not active");

//     // 2. Check student balance
//     const [student] = await db
//         .select({ examBalance: Student.exambalance, categoryId: Student.category })
//         .from(Student)
//         .where(eq(Student.id, studentId));

//     if (!student) throw new NotFound("Student not found");
//     if (student.examBalance <= 0) throw new BadRequest("Insufficient exam balance");

//     // 3. Verify category access
//     const [course] = await db
//         .select({ categoryId: courses.categoryId })
//         .from(courses)
//         .where(eq(courses.id, exam.courseId));

//     if (!course) throw new NotFound("Course not found");

//     const categoryIds: string[] = [];
//     let currentCategoryId: string | null = student.categoryId;

//     while (currentCategoryId) {
//         categoryIds.push(currentCategoryId);
//         const [cat] = await db
//             .select({ parentCategoryId: category.parentCategoryId })
//             .from(category)
//             .where(eq(category.id, currentCategoryId));
//         currentCategoryId = cat?.parentCategoryId ?? null;
//     }

//     if (!categoryIds.includes(course.categoryId)) {
//         throw new BadRequest("This exam is not available for your category");
//     }

//     // 4. Check for existing in-progress attempt
//     const [existingAttempt] = await db
//         .select({ id: examAttempts.id, startedAt: examAttempts.startedAt })
//         .from(examAttempts)
//         .where(and(
//             eq(examAttempts.studentId, studentId),
//             eq(examAttempts.examId, examId),
//             eq(examAttempts.status, "in_progress"),
//         ));

//     if (existingAttempt) {
//         // Deduct balance even if resuming
//         // await db.update(Student)
//         //     .set({ exambalance: sql`${Student.exambalance} - 1` })
//         //     .where(eq(Student.id, studentId));

//         // Return the existing attempt instead of creating a new one
//         return SuccessResponse(res, {
//             message: "Exam already in progress",
//             attempt: existingAttempt,
//         });
//     }

//     // 5. Check if already completed
//     const [completedAttempt] = await db
//         .select({ id: examAttempts.id })
//         .from(examAttempts)
//         .where(and(
//             eq(examAttempts.studentId, studentId),
//             eq(examAttempts.examId, examId),
//             eq(examAttempts.status, "completed"),
//         ));

//     if (completedAttempt) {
//         throw new BadRequest("You have already completed this exam");
//     }

//     // 6. Create attempt and deduct balance in a transaction
//     const attemptId = randomUUID();

//     await db.transaction(async (tx) => {
//         await tx.insert(examAttempts).values({
//             id: attemptId,
//             studentId,
//             examId,
//             status: "in_progress",
//         });

//         await tx
//             .update(Student)
//             .set({ exambalance: sql`${Student.exambalance} - 1` })
//             .where(eq(Student.id, studentId));
//     });

//     SuccessResponse(res, {
//         message: "Exam started successfully",
//         attempt: { id: attemptId, examId, duration: exam.duration },
//     }, 201);
// };

// // ===================== SUBMIT / END EXAM =====================
// export const submitExam = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);
//     const { examId } = req.params;
//     const { answers } = req.body;
//     // answers: { questionId: string, selectedOptionId?: string, gridInAnswer?: string }[]

//     if (!Array.isArray(answers)) {
//         throw new BadRequest("Answers must be an array");
//     }

//     // 1. Get in-progress attempt
//     const [attempt] = await db
//         .select({ id: examAttempts.id, startedAt: examAttempts.startedAt })
//         .from(examAttempts)
//         .where(and(
//             eq(examAttempts.studentId, studentId),
//             eq(examAttempts.examId, examId),
//             eq(examAttempts.status, "in_progress"),
//         ));

//     if (!attempt) throw new NotFound("No in-progress exam attempt found");

//     // 2. Get exam details for scoring
//     const [exam] = await db
//         .select({ duration: Exams.duration, totalScore: Exams.totalScore, passScore: Exams.passScore })
//         .from(Exams)
//         .where(eq(Exams.id, examId));

//     if (!exam) throw new NotFound("Exam not found");

//     // 3. Check if exam time has expired
//     const startedAt = new Date(attempt.startedAt).getTime();
//     const now = Date.now();
//     const durationMs = exam.duration * 60 * 1000;
//     const isTimedOut = (now - startedAt) > durationMs;

//     // 4. Get all section questions with their scores and correct answers
//     const examSections = await db
//         .select({ id: ExamSections.id })
//         .from(ExamSections)
//         .where(eq(ExamSections.examId, examId));

//     const examSectionIds = examSections.map(s => s.id);

//     const sectionQuestionsData = await db
//         .select({
//             questionId: SectionQuestions.questionId,
//             score: SectionQuestions.score,
//             answerType: questions.answerType,
//         })
//         .from(SectionQuestions)
//         .leftJoin(questions, eq(SectionQuestions.questionId, questions.id))
//         .where(inArray(SectionQuestions.sectionId, examSectionIds));

//     // Build a map: questionId -> { score, answerType }
//     const questionScoreMap = new Map(
//         sectionQuestionsData.map(sq => [sq.questionId, { score: sq.score, answerType: sq.answerType }])
//     );

//     // 5. Get correct options for MCQ questions
//     const questionIds = sectionQuestionsData.map(sq => sq.questionId);
//     const correctOptions = await db
//         .select({
//             id: questionOptions.id,
//             questionId: questionOptions.questionId,
//         })
//         .from(questionOptions)
//         .where(and(
//             inArray(questionOptions.questionId, questionIds),
//             eq(questionOptions.isCorrect, true),
//         ));

//     const correctOptionMap = new Map(
//         correctOptions.map(opt => [opt.questionId, opt.id])
//     );

//     // 6. Score each answer
//     let totalAchievedScore = 0;
//     const answersToInsert: {
//         id: string;
//         attemptId: string;
//         questionId: string;
//         selectedOptionId: string | null;
//         gridInAnswer: string | null;
//         isCorrect: boolean;
//         score: number;
//     }[] = [];

//     for (const answer of answers) {
//         const { questionId, selectedOptionId, gridInAnswer } = answer;
//         const questionInfo = questionScoreMap.get(questionId);

//         if (!questionInfo) continue; // Skip answers for questions not in this exam

//         let isCorrect = false;
//         let achievedScore = 0;

//         if (questionInfo.answerType === "MCQ" && selectedOptionId) {
//             const correctOptionId = correctOptionMap.get(questionId);
//             isCorrect = selectedOptionId === correctOptionId;
//         }
//         // Grid-in answers would need more complex checking logic - for now mark as needing review

//         if (isCorrect) {
//             achievedScore = questionInfo.score;
//             totalAchievedScore += achievedScore;
//         }

//         answersToInsert.push({
//             id: randomUUID(),
//             attemptId: attempt.id,
//             questionId,
//             selectedOptionId: selectedOptionId ?? null,
//             gridInAnswer: gridInAnswer ?? null,
//             isCorrect,
//             score: achievedScore,
//         });
//     }

//     const isPassed = totalAchievedScore >= exam.passScore;
//     const finalStatus = isTimedOut ? "timed_out" : "completed";

//     // 7. Save answers and update attempt
//     await db.transaction(async (tx) => {
//         if (answersToInsert.length > 0) {
//             await tx.insert(studentAnswers).values(answersToInsert);
//         }

//         await tx
//             .update(examAttempts)
//             .set({
//                 endedAt: new Date(),
//                 score: totalAchievedScore,
//                 isPassed,
//                 status: finalStatus,
//             })
//             .where(eq(examAttempts.id, attempt.id));
//     });

//     const wrongQuestionIds = answersToInsert.filter(a => !a.isCorrect).map(a => a.questionId);

//     let mistakes: any[] = [];
//     if (wrongQuestionIds.length > 0) {
//         const wrongQuestionsInfo = await db
//             .select({
//                 id: questions.id,
//                 question: questions.question,
//                 image: questions.image,
//                 answerType: questions.answerType,
//             })
//             .from(questions)
//             .where(inArray(questions.id, wrongQuestionIds));

//         const wrongOptions = await db
//             .select({
//                 id: questionOptions.id,
//                 questionId: questionOptions.questionId,
//                 answer: questionOptions.answer,
//                 order: questionOptions.order,
//             })
//             .from(questionOptions)
//             .where(inArray(questionOptions.questionId, wrongQuestionIds));

//         mistakes = wrongQuestionsInfo.map(q => {
//             const studentAnswerInfo = answersToInsert.find(a => a.questionId === q.id);
//             return {
//                 ...q,
//                 studentSelectedOptionId: studentAnswerInfo?.selectedOptionId,
//                 studentGridInAnswer: studentAnswerInfo?.gridInAnswer,
//                 options: wrongOptions.filter(o => o.questionId === q.id)
//             };
//         });
//     }

//     SuccessResponse(res, {
//         message: isTimedOut ? "Exam submitted (time exceeded)" : "Exam submitted successfully",
//         result: {
//             attemptId: attempt.id,
//             score: totalAchievedScore,
//             totalScore: exam.totalScore,
//             passScore: exam.passScore,
//             isPassed,
//             status: finalStatus,
//             mistakes,
//         },
//     });
// };

// // ===================== SHOW QUESTION ANSWER =====================
// export const showQuestionAnswer = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);
//     const { questionId } = req.params;

//     // Check and deduct question balance
//     await db.transaction(async (tx) => {
//         const [student] = await tx
//             .select({ questionBalance: Student.questionbalance })
//             .from(Student)
//             .where(eq(Student.id, studentId));

//         if (!student || student.questionBalance <= 0) {
//             throw new BadRequest("Insufficient question balance");
//         }

//         await tx.update(Student)
//             .set({ questionbalance: sql`${Student.questionbalance} - 1` })
//             .where(eq(Student.id, studentId));
//     });

//     const correctOptions = await db
//         .select({
//             id: questionOptions.id,
//             answer: questionOptions.answer,
//         })
//         .from(questionOptions)
//         .where(and(
//             eq(questionOptions.questionId, questionId),
//             eq(questionOptions.isCorrect, true)
//         ));

//     SuccessResponse(res, {
//         message: "Answer revealed",
//         correctOptions,
//     });
// };




import { Request, Response } from "express";
import { db } from "../../models/connection";
import { Exams, ExamSections, SectionQuestions } from "../../models/schema/admin/exams";
import { examAttempts } from "../../models/schema/admin/examAttempts";
import { studentAnswers } from "../../models/schema/admin/studentAnswers";
import { Student } from "../../models/schema/admin/Student";
import { courses } from "../../models/schema/admin/courses";
import { category } from "../../models/schema/admin/category";
import { Sections } from "../../models/schema/admin/sections";
import { questions, questionOptions, questionAnswers } from "../../models/schema/admin/questions";
import { examCodes } from "../../models/schema/admin/examCodes";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";
import { randomUUID } from "crypto";

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};
// export const getExams = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);

//     // 1. Get student's category and balance
//     const [student] = await db
//         .select({ categoryId: Student.category, examBalance: Student.exambalance })
//         .from(Student)
//         .where(eq(Student.id, studentId));

//     if (!student) throw new NotFound("Student not found");

//     // 2. Build Category Hierarchy (Upwards & Downwards)
//     const categoryIds: string[] = [];

//     // -- Upwards: Get current category + all ancestors (Parents)
//     let currentId: string | null = student.categoryId;
//     while (currentId) {
//         if (!categoryIds.includes(currentId)) {
//             categoryIds.push(currentId);
//         }
//         const [cat]: any = await db
//             .select({ parentCategoryId: category.parentCategoryId })
//             .from(category)
//             .where(eq(category.id, currentId));

//         currentId = cat?.parentCategoryId ?? null;
//     }

//     // -- Downwards: Get direct children (Sub-categories / Grades)
//     // This ensures if the exam is on a sub-level, it still appears
//     const children = await db
//         .select({ id: category.id })
//         .from(category)
//         .where(eq(category.parentCategoryId, student.categoryId));

//     children.forEach(child => {
//         if (!categoryIds.includes(child.id)) {
//             categoryIds.push(child.id);
//         }
//     });

//     // 3. Get courses that belong to any of these categories
//     const studentCourses = await db
//         .select({ id: courses.id })
//         .from(courses)
//         .where(inArray(courses.categoryId, categoryIds));

//     const courseIds = studentCourses.map(c => c.id);

//     // If no courses found, return early with empty exams
//     if (courseIds.length === 0) {
//         return SuccessResponse(res, {
//             examBalance: student.examBalance,
//             exams: [],
//             debugInfo: { checkedCategories: categoryIds } // Optional for debugging
//         });
//     }

//     // 4. Get active exams for those courses
//     const exams = await db
//         .select({
//             id: Exams.id,
//             title: Exams.title,
//             description: Exams.description,
//             duration: Exams.duration,
//             totalScore: Exams.totalScore,
//             passScore: Exams.passScore,
//             examType: Exams.examType,
//             year: Exams.year,
//             month: Exams.Month,
//             courseName: courses.name,
//             codeName: examCodes.code,
//             createdAt: Exams.createdAt,
//         })
//         .from(Exams)
//         .leftJoin(courses, eq(Exams.courseId, courses.id))
//         .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
//         .where(and(
//             inArray(Exams.courseId, courseIds),
//             eq(Exams.isActive, true),
//         ))
//         .orderBy(Exams.createdAt);

//     // 5. Get attempts for status mapping
//     const examIds = exams.map(e => e.id);
//     let attemptsMap = new Map<string, { status: string; score: number | null; isPassed: boolean | null }>();

//     if (examIds.length > 0) {
//         const attempts = await db
//             .select({
//                 examId: examAttempts.examId,
//                 status: examAttempts.status,
//                 score: examAttempts.score,
//                 isPassed: examAttempts.isPassed,
//             })
//             .from(examAttempts)
//             .where(and(
//                 eq(examAttempts.studentId, studentId),
//                 inArray(examAttempts.examId, examIds),
//             ));

//         for (const attempt of attempts) {
//             attemptsMap.set(attempt.examId, {
//                 status: attempt.status,
//                 score: attempt.score,
//                 isPassed: attempt.isPassed,
//             });
//         }
//     }

//     // Map attempts back to exams
//     const examsWithStatus = exams.map(exam => ({
//         ...exam,
//         attempt: attemptsMap.get(exam.id) ?? null,
//     }));

//     return SuccessResponse(res, {
//         examBalance: student.examBalance,
//         exams: examsWithStatus
//     });
//};
// ===================== GET ALL EXAMS (filtered by student's category) =====================
export const getExams = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);

    // 1. Get student's category and balance
    const [student] = await db
        .select({ categoryId: Student.category, examBalance: Student.exambalance })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new NotFound("Student not found");

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
            ));

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

    // 5. Check if already completed
    const [completedAttempt] = await db
        .select({ id: examAttempts.id })
        .from(examAttempts)
        .where(and(
            eq(examAttempts.studentId, studentId),
            eq(examAttempts.examId, examId),
            inArray(examAttempts.status, ["completed", "timed_out"]),
        ));

    if (completedAttempt) {
        throw new BadRequest("You have already completed this exam");
    }

    // Check balance only for new attempts
    if (student.examBalance <= 0) throw new BadRequest("Insufficient exam balance");

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
        const isCorrect = info.type === "MCQ" ? ans.selectedOptionId === correct?.id : ans.gridInAnswer?.trim().toLowerCase() === correct?.answer.trim().toLowerCase();
        if (isCorrect) totalAchievedScore += info.score;
        return { id: randomUUID(), attemptId: attempt.id, questionId: ans.questionId, isCorrect, score: isCorrect ? info.score : 0, selectedOptionId: ans.selectedOptionId, gridInAnswer: ans.gridInAnswer };
    }).filter(Boolean);

    const isPassed = totalAchievedScore >= exam.passScore;
    const finalStatus = isTimedOut ? "timed_out" : "completed";

    await db.transaction(async (tx) => {
        if (answersToInsert.length > 0) await tx.insert(studentAnswers).values(answersToInsert);
        await tx.update(examAttempts).set({ endedAt: new Date(), score: totalAchievedScore, isPassed, status: finalStatus }).where(eq(examAttempts.id, attempt.id));
    });

    const wrongIds = answersToInsert.filter((a: any) => !a.isCorrect).map((a: any) => a.questionId);
    let mistakes: any[] = [];
    if (wrongIds.length > 0) {
        const qs = await db.select().from(questions).where(inArray(questions.id, wrongIds));
        const opts = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, wrongIds));
        const media = await db.select().from(questionAnswers).where(inArray(questionAnswers.questionId, wrongIds));
        mistakes = qs.map(q => ({ ...q, options: opts.filter(o => o.questionId === q.id), explanation: media.find(m => m.questionId === q.id) }));
    }

    return SuccessResponse(res, { result: { attemptId: attempt.id, score: totalAchievedScore, totalScore: exam.totalScore, passScore: exam.passScore, isPassed, status: finalStatus, mistakes } });
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

    // 3. جلب الميديا (الفيديو والـ PDF) من جدول questionAnswers بناءً على الـ Schema
    const [media] = await db
        .select({
            pdf: questionAnswers.pdf,
            video: questionAnswers.video,
            image: questionAnswers.image,
            text: questionAnswers.text,
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
            explanation: media ?? null // سيعيد null إذا لم يكن هناك فيديو أو PDF
        },
    });
};
