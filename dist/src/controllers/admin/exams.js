"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExamsByCourseId = exports.deleteExam = exports.getExamById = exports.getAllExams = exports.updateExam = exports.createExam = exports.selectionOptions = void 0;
const connection_1 = require("../../models/connection");
const exams_1 = require("../../models/schema/admin/exams");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const crypto_1 = require("crypto");
const schema_1 = require("../../models/schema");
const selectionOptions = async (req, res) => {
    const All_examCodes = await connection_1.db.select({ id: schema_1.examCodes.id, code: schema_1.examCodes.code }).from(schema_1.examCodes);
    const All_sections = await connection_1.db.select({ id: schema_1.Sections.id, sectionName: schema_1.Sections.sectionName }).from(schema_1.Sections);
    const All_rawScores = await connection_1.db.select({ id: schema_1.rawScore.id, score: schema_1.rawScore.score }).from(schema_1.rawScore);
    return (0, response_1.SuccessResponse)(res, { message: "Selection options fetched successfully", data: { examCodes: All_examCodes, sections: All_sections, rawScores: All_rawScores } }, 200);
};
exports.selectionOptions = selectionOptions;
const createExam = async (req, res) => {
    const { examType } = req.body;
    switch (examType) {
        case "static":
            const { title, description, duration, totalScore, passScore, courseId, year, month, codeId, sections, rawScoreId } = req.body;
            // sections structure: { sectionId: string, sectionOrder: number, questionIds: string[] }[]
            if (!title || !description || !duration || !totalScore || !passScore || !courseId || !year || !month || !codeId || !sections) {
                throw new BadRequest_1.BadRequest("All fields are required");
            }
            if (!Array.isArray(sections) || sections.length === 0) {
                throw new BadRequest_1.BadRequest("Sections must be a non-empty array");
            }
            const existingRawScore = await connection_1.db.select().from(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.id, rawScoreId)).limit(1);
            if (existingRawScore.length === 0) {
                throw new BadRequest_1.BadRequest("Invalid raw score");
            }
            // 1. Validate Code
            const examCode = await connection_1.db.select().from(schema_1.examCodes).where((0, drizzle_orm_1.eq)(schema_1.examCodes.id, codeId)).limit(1);
            if (examCode.length === 0) {
                throw new BadRequest_1.BadRequest("Invalid exam code");
            }
            // 2. Validate Sections and Questions exists and relation matches
            const uniqueSectionIds = [...new Set(sections.map((s) => s.sectionId))];
            const allQuestionIds = sections.flatMap((s) => s.questionIds);
            // Fetch all sections to ensure they exist
            const fetchedSections = await connection_1.db.select({ id: schema_1.Sections.id }).from(schema_1.Sections).where((0, drizzle_orm_1.inArray)(schema_1.Sections.id, uniqueSectionIds));
            if (fetchedSections.length !== uniqueSectionIds.length) {
                throw new BadRequest_1.BadRequest("One or more Invalid Section IDs provided");
            }
            // Fetch all questions to validate existence and section belonging
            const fetchedQuestions = await connection_1.db.select({ id: schema_1.questions.id, sectionId: schema_1.questions.sectionId })
                .from(schema_1.questions)
                .where((0, drizzle_orm_1.inArray)(schema_1.questions.id, allQuestionIds));
            if (fetchedQuestions.length !== allQuestionIds.length) {
                throw new BadRequest_1.BadRequest("One or more Invalid Question IDs provided");
            }
            // Create a map for fast lookup: QuestionID -> SectionID
            const questionSectionMap = new Map(fetchedQuestions.map(q => [q.id, q.sectionId]));
            // Validate that each question belongs to the specified section
            for (const section of sections) {
                for (const qId of section.questionIds) {
                    const actualSectionId = questionSectionMap.get(qId);
                    if (actualSectionId !== section.sectionId) {
                        throw new BadRequest_1.BadRequest(`Question ${qId} does not belong to Section ${section.sectionId}`);
                    }
                }
            }
            // 3. Prepare Bulk Insert Data
            const examId = (0, crypto_1.randomUUID)();
            const examSectionsToInsert = [];
            const sectionQuestionsToInsert = [];
            // Calculate score per question
            const totalQuestions = sections.reduce((sum, section) => sum + section.questionIds.length, 0);
            const scorePerQuestion = totalQuestions > 0 ? totalScore / totalQuestions : 0;
            // Sort sections by order to ensure processing order if needed, or just trust payload
            // Assuming payload: { sectionId: "uuid", questionIds: ["uuid", "uuid"], sectionOrder: 1 }
            sections.forEach((section) => {
                const examSectionId = (0, crypto_1.randomUUID)();
                examSectionsToInsert.push({
                    id: examSectionId,
                    examId: examId,
                    sectionId: section.sectionId,
                    sectionOrder: section.sectionOrder ?? 0 // If not provided, default or handle error
                });
                section.questionIds.forEach((qId, index) => {
                    sectionQuestionsToInsert.push({
                        id: (0, crypto_1.randomUUID)(),
                        sectionId: examSectionId, // Links to the newly created ExamSection
                        questionId: qId,
                        questionOrder: index + 1,
                        score: Math.round(scorePerQuestion)
                    });
                });
            });
            // 4. Execute Transaction
            await connection_1.db.transaction(async (tx) => {
                // Insert Exam
                await tx.insert(exams_1.Exams).values({
                    id: examId,
                    title,
                    description,
                    duration,
                    totalScore,
                    passScore,
                    courseId,
                    year,
                    Month: month,
                    codeId,
                    isActive: true, // Default
                    examType: "static",
                    rawScoreId: existingRawScore[0].id
                });
                // Bulk Insert Exam Sections
                if (examSectionsToInsert.length > 0) {
                    await tx.insert(exams_1.ExamSections).values(examSectionsToInsert);
                }
                // Bulk Insert Section Questions
                if (sectionQuestionsToInsert.length > 0) {
                    await tx.insert(exams_1.SectionQuestions).values(sectionQuestionsToInsert);
                }
            });
            return (0, response_1.SuccessResponse)(res, { message: "Static Exam created successfully", examId }, 200);
        case "adaptive":
            //TODO - AI Generates This Exam
            return (0, response_1.SuccessResponse)(res, { message: "Adaptive Exam logic not implemented yet" }, 501);
        default:
            throw new BadRequest_1.BadRequest("Invalid exam type");
    }
};
exports.createExam = createExam;
const updateExam = async (req, res) => {
    const { id } = req.params;
    const { title, description, duration, totalScore, passScore, courseId, year, month, codeId, sections, isActive, rawScoreId } = req.body;
    const existingExam = await connection_1.db.select().from(exams_1.Exams).where((0, drizzle_orm_1.eq)(exams_1.Exams.id, id));
    if (existingExam.length === 0) {
        throw new BadRequest_1.BadRequest("Exam not found");
    }
    // Prepare update data for top-level fields
    const updateData = {};
    if (title)
        updateData.title = title;
    if (description)
        updateData.description = description;
    if (duration)
        updateData.duration = duration;
    if (totalScore)
        updateData.totalScore = totalScore;
    if (passScore)
        updateData.passScore = passScore;
    if (courseId)
        updateData.courseId = courseId;
    if (year)
        updateData.year = year;
    if (month)
        updateData.Month = month;
    if (codeId)
        updateData.codeId = codeId;
    if (isActive !== undefined)
        updateData.isActive = isActive;
    if (rawScoreId)
        updateData.rawScoreId = rawScoreId;
    await connection_1.db.transaction(async (tx) => {
        // 1. Update Exam Metadata
        if (Object.keys(updateData).length > 0) {
            await tx.update(exams_1.Exams).set(updateData).where((0, drizzle_orm_1.eq)(exams_1.Exams.id, id));
        }
        // 2. Handle Structural Update (if sections are provided)
        // If sections are provided, we assume a FULL replacement of the exam structure
        if (sections && Array.isArray(sections) && sections.length > 0) {
            // A. Validate New Structure (Same as Create)
            const uniqueSectionIds = [...new Set(sections.map((s) => s.sectionId))];
            const allQuestionIds = sections.flatMap((s) => s.questionIds);
            // Fetch all sections to ensure they exist
            const fetchedSections = await tx.select({ id: schema_1.Sections.id }).from(schema_1.Sections).where((0, drizzle_orm_1.inArray)(schema_1.Sections.id, uniqueSectionIds));
            if (fetchedSections.length !== uniqueSectionIds.length) {
                throw new BadRequest_1.BadRequest("One or more Invalid Section IDs provided");
            }
            // Fetch all questions to validate existence and section belonging
            const fetchedQuestions = await tx.select({ id: schema_1.questions.id, sectionId: schema_1.questions.sectionId })
                .from(schema_1.questions)
                .where((0, drizzle_orm_1.inArray)(schema_1.questions.id, allQuestionIds));
            if (fetchedQuestions.length !== allQuestionIds.length) {
                throw new BadRequest_1.BadRequest("One or more Invalid Question IDs provided");
            }
            // Map for fast lookup
            const questionSectionMap = new Map(fetchedQuestions.map(q => [q.id, q.sectionId]));
            // Validate ownership
            for (const section of sections) {
                for (const qId of section.questionIds) {
                    const actualSectionId = questionSectionMap.get(qId);
                    if (actualSectionId !== section.sectionId) {
                        throw new BadRequest_1.BadRequest(`Question ${qId} does not belong to Section ${section.sectionId}`);
                    }
                }
            }
            // B. Delete Old Structure
            // Manual Cascade: Find ExamSections -> Delete SectionQuestions -> Delete ExamSections
            const oldExamSections = await tx.select({ id: exams_1.ExamSections.id }).from(exams_1.ExamSections).where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, id));
            const oldExamSectionIds = oldExamSections.map(es => es.id);
            if (oldExamSectionIds.length > 0) {
                await tx.delete(exams_1.SectionQuestions).where((0, drizzle_orm_1.inArray)(exams_1.SectionQuestions.sectionId, oldExamSectionIds));
                await tx.delete(exams_1.ExamSections).where((0, drizzle_orm_1.inArray)(exams_1.ExamSections.id, oldExamSectionIds));
            }
            // C. Insert New Structure
            const examSectionsToInsert = [];
            const sectionQuestionsToInsert = [];
            // Recalculate Score
            const currentTotalScore = totalScore !== undefined ? totalScore : existingExam[0].totalScore;
            const totalQuestions = sections.reduce((sum, section) => sum + section.questionIds.length, 0);
            const scorePerQuestion = totalQuestions > 0 ? currentTotalScore / totalQuestions : 0;
            sections.forEach((section) => {
                const examSectionId = (0, crypto_1.randomUUID)();
                examSectionsToInsert.push({
                    id: examSectionId,
                    examId: id,
                    sectionId: section.sectionId,
                    sectionOrder: section.sectionOrder ?? 0
                });
                section.questionIds.forEach((qId, index) => {
                    sectionQuestionsToInsert.push({
                        id: (0, crypto_1.randomUUID)(),
                        sectionId: examSectionId,
                        questionId: qId,
                        questionOrder: index + 1,
                        score: Math.round(scorePerQuestion)
                    });
                });
            });
            if (examSectionsToInsert.length > 0) {
                await tx.insert(exams_1.ExamSections).values(examSectionsToInsert);
            }
            if (sectionQuestionsToInsert.length > 0) {
                await tx.insert(exams_1.SectionQuestions).values(sectionQuestionsToInsert);
            }
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Exam updated successfully" }, 200);
};
exports.updateExam = updateExam;
const getAllExams = async (req, res) => {
    const allExams = await connection_1.db.select({
        id: exams_1.Exams.id,
        title: exams_1.Exams.title,
        description: exams_1.Exams.description,
        duration: exams_1.Exams.duration,
        totalScore: exams_1.Exams.totalScore,
        passScore: exams_1.Exams.passScore,
        examType: exams_1.Exams.examType,
        year: exams_1.Exams.year,
        Month: exams_1.Exams.Month,
        isActive: exams_1.Exams.isActive,
        createdAt: exams_1.Exams.createdAt,
        updatedAt: exams_1.Exams.updatedAt,
        // Joins
        courseName: schema_1.courses.name,
        codeName: schema_1.examCodes.code,
        rawScoreName: schema_1.rawScore.name,
        semesterName: schema_1.semesters.name,
        categoryName: schema_1.category.name,
    })
        .from(exams_1.Exams)
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(exams_1.Exams.courseId, schema_1.courses.id))
        .leftJoin(schema_1.examCodes, (0, drizzle_orm_1.eq)(exams_1.Exams.codeId, schema_1.examCodes.id))
        .leftJoin(schema_1.rawScore, (0, drizzle_orm_1.eq)(exams_1.Exams.rawScoreId, schema_1.rawScore.id))
        .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.courses.id, schema_1.semesters.courseId))
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id));
    const staticExams = allExams.filter(e => e.examType === "static");
    const adaptiveExams = allExams.filter(e => e.examType === "adaptive");
    return (0, response_1.SuccessResponse)(res, {
        message: "Exams fetched successfully",
        data: {
            static: staticExams,
            adaptive: adaptiveExams
        }
    }, 200);
};
exports.getAllExams = getAllExams;
const getExamById = async (req, res) => {
    const { id } = req.params;
    // 1. Fetch Exam Metadata
    const exam = await connection_1.db.select({
        id: exams_1.Exams.id,
        title: exams_1.Exams.title,
        description: exams_1.Exams.description,
        duration: exams_1.Exams.duration,
        totalScore: exams_1.Exams.totalScore,
        passScore: exams_1.Exams.passScore,
        examType: exams_1.Exams.examType,
        year: exams_1.Exams.year,
        Month: exams_1.Exams.Month,
        isActive: exams_1.Exams.isActive,
        createdAt: exams_1.Exams.createdAt,
        updatedAt: exams_1.Exams.updatedAt,
        courseId: exams_1.Exams.courseId,
        codeId: exams_1.Exams.codeId,
        rawScoreId: exams_1.Exams.rawScoreId,
        // Joins
        courseName: schema_1.courses.name,
        codeName: schema_1.examCodes.code,
        rawScoreName: schema_1.rawScore.name,
        semesterName: schema_1.semesters.name,
        categoryName: schema_1.category.name,
    })
        .from(exams_1.Exams)
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(exams_1.Exams.courseId, schema_1.courses.id))
        .leftJoin(schema_1.examCodes, (0, drizzle_orm_1.eq)(exams_1.Exams.codeId, schema_1.examCodes.id))
        .leftJoin(schema_1.rawScore, (0, drizzle_orm_1.eq)(exams_1.Exams.rawScoreId, schema_1.rawScore.id))
        .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.courses.id, schema_1.semesters.courseId))
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(exams_1.Exams.id, id));
    if (exam.length === 0) {
        throw new BadRequest_1.BadRequest("Exam not found");
    }
    const examData = exam[0];
    if (examData.examType === "static") {
        // 2. Fetch Sections
        const sections = await connection_1.db.select({
            id: exams_1.ExamSections.id,
            sectionId: exams_1.ExamSections.sectionId,
            sectionOrder: exams_1.ExamSections.sectionOrder,
            sectionName: schema_1.Sections.sectionName,
            sectionDescription: schema_1.Sections.sectionDescription,
            sectionTime: schema_1.Sections.sectionTime,
        })
            .from(exams_1.ExamSections)
            .leftJoin(schema_1.Sections, (0, drizzle_orm_1.eq)(exams_1.ExamSections.sectionId, schema_1.Sections.id))
            .where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, id))
            .orderBy(exams_1.ExamSections.sectionOrder);
        const sectionIds = sections.map(s => s.id);
        if (sectionIds.length > 0) {
            // 3. Fetch Questions for these sections
            const sectionQuestions = await connection_1.db.select({
                id: exams_1.SectionQuestions.id,
                sectionId: exams_1.SectionQuestions.sectionId,
                questionId: exams_1.SectionQuestions.questionId,
                questionOrder: exams_1.SectionQuestions.questionOrder,
                score: exams_1.SectionQuestions.score,
                // Question Details
                questionText: schema_1.questions.question,
                questionImage: schema_1.questions.image,
                questionType: schema_1.questions.questionType,
                difficulty: schema_1.questions.difficulty,
                answerType: schema_1.questions.answerType,
            })
                .from(exams_1.SectionQuestions)
                .leftJoin(schema_1.questions, (0, drizzle_orm_1.eq)(exams_1.SectionQuestions.questionId, schema_1.questions.id))
                .where((0, drizzle_orm_1.inArray)(exams_1.SectionQuestions.sectionId, sectionIds))
                .orderBy(exams_1.SectionQuestions.questionOrder);
            // 4. Structure the Response
            const formattedSections = sections.map(section => {
                const sectionQs = sectionQuestions.filter(sq => sq.sectionId === section.id);
                return {
                    ...section,
                    questions: sectionQs
                };
            });
            return (0, response_1.SuccessResponse)(res, {
                message: "Exam fetched successfully",
                data: { ...examData, sections: formattedSections }
            }, 200);
        }
        return (0, response_1.SuccessResponse)(res, {
            message: "Exam fetched successfully",
            data: { ...examData, sections: [] }
        }, 200);
    }
    else {
        // Adaptive logic (placeholder)
        return (0, response_1.SuccessResponse)(res, {
            message: "Exam fetched successfully",
            data: examData
        }, 200);
    }
};
exports.getExamById = getExamById;
const deleteExam = async (req, res) => {
    const { id } = req.params;
    const exam = await connection_1.db.select().from(exams_1.Exams).where((0, drizzle_orm_1.eq)(exams_1.Exams.id, id));
    if (exam.length === 0) {
        throw new BadRequest_1.BadRequest("Exam not found");
    }
    await connection_1.db.transaction(async (tx) => {
        // 1. Find all sections for this exam
        const sections = await tx.select({ id: exams_1.ExamSections.id }).from(exams_1.ExamSections).where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, id));
        const sectionIds = sections.map(s => s.id);
        // 2. Delete all questions in these sections
        if (sectionIds.length > 0) {
            await tx.delete(exams_1.SectionQuestions).where((0, drizzle_orm_1.inArray)(exams_1.SectionQuestions.sectionId, sectionIds));
        }
        // 3. Delete the sections
        await tx.delete(exams_1.ExamSections).where((0, drizzle_orm_1.eq)(exams_1.ExamSections.examId, id));
        // 4. Delete the exam itself
        await tx.delete(exams_1.Exams).where((0, drizzle_orm_1.eq)(exams_1.Exams.id, id));
    });
    return (0, response_1.SuccessResponse)(res, { message: "Exam deleted successfully" }, 200);
};
exports.deleteExam = deleteExam;
const getExamsByCourseId = async (req, res) => {
    const { courseId } = req.params;
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId)).limit(1);
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    const courseExams = await connection_1.db.select({
        id: exams_1.Exams.id,
        title: exams_1.Exams.title,
        description: exams_1.Exams.description,
        duration: exams_1.Exams.duration,
        totalScore: exams_1.Exams.totalScore,
        passScore: exams_1.Exams.passScore,
        examType: exams_1.Exams.examType,
        year: exams_1.Exams.year,
        Month: exams_1.Exams.Month,
        isActive: exams_1.Exams.isActive,
        createdAt: exams_1.Exams.createdAt,
        updatedAt: exams_1.Exams.updatedAt,
        // Joins
        courseName: schema_1.courses.name,
        codeName: schema_1.examCodes.code,
        rawScoreName: schema_1.rawScore.name,
        semesterName: schema_1.semesters.name,
        categoryName: schema_1.category.name,
    })
        .from(exams_1.Exams)
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(exams_1.Exams.courseId, schema_1.courses.id))
        .leftJoin(schema_1.examCodes, (0, drizzle_orm_1.eq)(exams_1.Exams.codeId, schema_1.examCodes.id))
        .leftJoin(schema_1.rawScore, (0, drizzle_orm_1.eq)(exams_1.Exams.rawScoreId, schema_1.rawScore.id))
        .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.courses.id, schema_1.semesters.courseId))
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(exams_1.Exams.courseId, courseId));
    const staticExams = courseExams.filter(e => e.examType === "static");
    const adaptiveExams = courseExams.filter(e => e.examType === "adaptive");
    return (0, response_1.SuccessResponse)(res, {
        message: "Course exams fetched successfully",
        data: {
            course: course[0],
            exams: {
                static: staticExams,
                adaptive: adaptiveExams
            }
        }
    }, 200);
};
exports.getExamsByCourseId = getExamsByCourseId;
