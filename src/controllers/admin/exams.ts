import { Request, Response } from "express";
import { db } from "../../models/connection";
import { Exams, ExamSections, SectionQuestions } from "../../models/schema/admin/exams";
import { eq, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { randomUUID } from "crypto";
import { examCodes, questions, Sections, rawScore, courses, semesters, category } from "../../models/schema";


export const selectionOptions = async (req: Request, res: Response) => {
    const All_examCodes = await db.select({ id: examCodes.id, code: examCodes.code }).from(examCodes);
    const All_sections = await db.select({ id: Sections.id, sectionName: Sections.sectionName }).from(Sections);
    const All_rawScores = await db.select({ id: rawScore.id, score: rawScore.score }).from(rawScore);
    return SuccessResponse(res, { message: "Selection options fetched successfully", data: { examCodes: All_examCodes, sections: All_sections, rawScores: All_rawScores } }, 200);
};

export const createExam = async (req: Request, res: Response) => {
    const { examType } = req.body;
    switch (examType) {
        case "static":

            const { title, description, duration, totalScore, passScore, courseId, year, month, codeId, sections, rawScoreId } = req.body;
            // sections structure: { sectionId: string, sectionOrder: number, questionIds: string[] }[]

            if (!title || !description || !duration || !totalScore || !passScore || !courseId || !year || !month || !codeId || !sections) {
                throw new BadRequest("All fields are required");
            }

            if (!Array.isArray(sections) || sections.length === 0) {
                throw new BadRequest("Sections must be a non-empty array");
            }
            const existingRawScore = await db.select().from(rawScore).where(eq(rawScore.id, rawScoreId)).limit(1);
            if (existingRawScore.length === 0) {
                throw new BadRequest("Invalid raw score");
            }
            // 1. Validate Code
            const examCode = await db.select().from(examCodes).where(eq(examCodes.id, codeId)).limit(1);
            if (examCode.length === 0) {
                throw new BadRequest("Invalid exam code");
            }

            // 2. Validate Sections and Questions exists and relation matches
            const uniqueSectionIds = [...new Set(sections.map((s: any) => s.sectionId))];
            const allQuestionIds = sections.flatMap((s: any) => s.questionIds);

            // Fetch all sections to ensure they exist
            const fetchedSections = await db.select({ id: Sections.id }).from(Sections).where(inArray(Sections.id, uniqueSectionIds as string[]));
            if (fetchedSections.length !== uniqueSectionIds.length) {
                throw new BadRequest("One or more Invalid Section IDs provided");
            }

            // Fetch all questions to validate existence and section belonging
            const fetchedQuestions = await db.select({ id: questions.id, sectionId: questions.sectionId })
                .from(questions)
                .where(inArray(questions.id, allQuestionIds as string[]));

            if (fetchedQuestions.length !== allQuestionIds.length) {
                throw new BadRequest("One or more Invalid Question IDs provided");
            }

            // Create a map for fast lookup: QuestionID -> SectionID
            const questionSectionMap = new Map(fetchedQuestions.map(q => [q.id, q.sectionId]));

            // Validate that each question belongs to the specified section
            for (const section of sections) {
                for (const qId of section.questionIds) {
                    const actualSectionId = questionSectionMap.get(qId);
                    if (actualSectionId !== section.sectionId) {
                        throw new BadRequest(`Question ${qId} does not belong to Section ${section.sectionId}`);
                    }
                }
            }

            // 3. Prepare Bulk Insert Data
            const examId = randomUUID();
            const examSectionsToInsert: any[] = [];
            const sectionQuestionsToInsert: any[] = [];

            // Calculate score per question
            const totalQuestions = sections.reduce((sum: number, section: any) => sum + section.questionIds.length, 0);
            const scorePerQuestion = totalQuestions > 0 ? totalScore / totalQuestions : 0;

            // Sort sections by order to ensure processing order if needed, or just trust payload
            // Assuming payload: { sectionId: "uuid", questionIds: ["uuid", "uuid"], sectionOrder: 1 }

            sections.forEach((section: any) => {
                const examSectionId = randomUUID();

                examSectionsToInsert.push({
                    id: examSectionId,
                    examId: examId,
                    sectionId: section.sectionId,
                    sectionOrder: section.sectionOrder ?? 0 // If not provided, default or handle error
                });

                section.questionIds.forEach((qId: string, index: number) => {
                    sectionQuestionsToInsert.push({
                        id: randomUUID(),
                        sectionId: examSectionId, // Links to the newly created ExamSection
                        questionId: qId,
                        questionOrder: index + 1,
                        score: Math.round(scorePerQuestion)
                    });
                });
            });

            // 4. Execute Transaction
            await db.transaction(async (tx) => {
                // Insert Exam
                await tx.insert(Exams).values({
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
                    await tx.insert(ExamSections).values(examSectionsToInsert);
                }

                // Bulk Insert Section Questions
                if (sectionQuestionsToInsert.length > 0) {
                    await tx.insert(SectionQuestions).values(sectionQuestionsToInsert);
                }
            });

            return SuccessResponse(res, { message: "Static Exam created successfully", examId }, 200);

        case "adaptive":
            //TODO - AI Generates This Exam
            return SuccessResponse(res, { message: "Adaptive Exam logic not implemented yet" }, 501);
        default:
            throw new BadRequest("Invalid exam type");
    }
}

export const updateExam = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, duration, totalScore, passScore, courseId, year, month, codeId, sections, isActive, rawScoreId } = req.body;

    const existingExam = await db.select().from(Exams).where(eq(Exams.id, id));
    if (existingExam.length === 0) {
        throw new BadRequest("Exam not found");
    }

    // Prepare update data for top-level fields
    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (duration) updateData.duration = duration;
    if (totalScore) updateData.totalScore = totalScore;
    if (passScore) updateData.passScore = passScore;
    if (courseId) updateData.courseId = courseId;
    if (year) updateData.year = year;
    if (month) updateData.Month = month;
    if (codeId) updateData.codeId = codeId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (rawScoreId) updateData.rawScoreId = rawScoreId;

    await db.transaction(async (tx) => {
        // 1. Update Exam Metadata
        if (Object.keys(updateData).length > 0) {
            await tx.update(Exams).set(updateData).where(eq(Exams.id, id));
        }

        // 2. Handle Structural Update (if sections are provided)
        // If sections are provided, we assume a FULL replacement of the exam structure
        if (sections && Array.isArray(sections) && sections.length > 0) {

            // A. Validate New Structure (Same as Create)
            const uniqueSectionIds = [...new Set(sections.map((s: any) => s.sectionId))];
            const allQuestionIds = sections.flatMap((s: any) => s.questionIds);

            // Fetch all sections to ensure they exist
            const fetchedSections = await tx.select({ id: Sections.id }).from(Sections).where(inArray(Sections.id, uniqueSectionIds as string[]));
            if (fetchedSections.length !== uniqueSectionIds.length) {
                throw new BadRequest("One or more Invalid Section IDs provided");
            }

            // Fetch all questions to validate existence and section belonging
            const fetchedQuestions = await tx.select({ id: questions.id, sectionId: questions.sectionId })
                .from(questions)
                .where(inArray(questions.id, allQuestionIds as string[]));

            if (fetchedQuestions.length !== allQuestionIds.length) {
                throw new BadRequest("One or more Invalid Question IDs provided");
            }

            // Map for fast lookup
            const questionSectionMap = new Map(fetchedQuestions.map(q => [q.id, q.sectionId]));

            // Validate ownership
            for (const section of sections) {
                for (const qId of section.questionIds) {
                    const actualSectionId = questionSectionMap.get(qId);
                    if (actualSectionId !== section.sectionId) {
                        throw new BadRequest(`Question ${qId} does not belong to Section ${section.sectionId}`);
                    }
                }
            }

            // B. Delete Old Structure
            // Manual Cascade: Find ExamSections -> Delete SectionQuestions -> Delete ExamSections
            const oldExamSections = await tx.select({ id: ExamSections.id }).from(ExamSections).where(eq(ExamSections.examId, id));
            const oldExamSectionIds = oldExamSections.map(es => es.id);

            if (oldExamSectionIds.length > 0) {
                await tx.delete(SectionQuestions).where(inArray(SectionQuestions.sectionId, oldExamSectionIds));
                await tx.delete(ExamSections).where(inArray(ExamSections.id, oldExamSectionIds));
            }

            // C. Insert New Structure
            const examSectionsToInsert: any[] = [];
            const sectionQuestionsToInsert: any[] = [];

            // Recalculate Score
            const currentTotalScore = totalScore !== undefined ? totalScore : existingExam[0].totalScore;
            const totalQuestions = sections.reduce((sum: number, section: any) => sum + section.questionIds.length, 0);
            const scorePerQuestion = totalQuestions > 0 ? currentTotalScore / totalQuestions : 0;

            sections.forEach((section: any) => {
                const examSectionId = randomUUID();

                examSectionsToInsert.push({
                    id: examSectionId,
                    examId: id,
                    sectionId: section.sectionId,
                    sectionOrder: section.sectionOrder ?? 0
                });

                section.questionIds.forEach((qId: string, index: number) => {
                    sectionQuestionsToInsert.push({
                        id: randomUUID(),
                        sectionId: examSectionId,
                        questionId: qId,
                        questionOrder: index + 1,
                        score: Math.round(scorePerQuestion)
                    });
                });
            });

            if (examSectionsToInsert.length > 0) {
                await tx.insert(ExamSections).values(examSectionsToInsert);
            }

            if (sectionQuestionsToInsert.length > 0) {
                await tx.insert(SectionQuestions).values(sectionQuestionsToInsert);
            }
        }
    });

    return SuccessResponse(res, { message: "Exam updated successfully" }, 200);
}

export const getAllExams = async (req: Request, res: Response) => {
    const allExams = await db.select({
        id: Exams.id,
        title: Exams.title,
        description: Exams.description,
        duration: Exams.duration,
        totalScore: Exams.totalScore,
        passScore: Exams.passScore,
        examType: Exams.examType,
        year: Exams.year,
        Month: Exams.Month,
        isActive: Exams.isActive,
        createdAt: Exams.createdAt,
        updatedAt: Exams.updatedAt,
        // Joins
        courseName: courses.name,
        codeName: examCodes.code,
        rawScoreName: rawScore.name,
        semesterName: semesters.name,
        categoryName: category.name,
    })
        .from(Exams)
        .leftJoin(courses, eq(Exams.courseId, courses.id))
        .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
        .leftJoin(rawScore, eq(Exams.rawScoreId, rawScore.id))
        .leftJoin(semesters, eq(courses.id, semesters.courseId))
        .leftJoin(category, eq(courses.categoryId, category.id))

    const staticExams = allExams.filter(e => e.examType === "static");
    const adaptiveExams = allExams.filter(e => e.examType === "adaptive");

    return SuccessResponse(res, {
        message: "Exams fetched successfully",
        data: {
            static: staticExams,
            adaptive: adaptiveExams
        }
    }, 200);
}

export const getExamById = async (req: Request, res: Response) => {
    const { id } = req.params;

    // 1. Fetch Exam Metadata
    const exam = await db.select({
        id: Exams.id,
        title: Exams.title,
        description: Exams.description,
        duration: Exams.duration,
        totalScore: Exams.totalScore,
        passScore: Exams.passScore,
        examType: Exams.examType,
        year: Exams.year,
        Month: Exams.Month,
        isActive: Exams.isActive,
        createdAt: Exams.createdAt,
        updatedAt: Exams.updatedAt,
        courseId: Exams.courseId,
        codeId: Exams.codeId,
        rawScoreId: Exams.rawScoreId,
        // Joins
        courseName: courses.name,
        codeName: examCodes.code,
        rawScoreName: rawScore.name,
        semesterName: semesters.name,
        categoryName: category.name,
    })
        .from(Exams)
        .leftJoin(courses, eq(Exams.courseId, courses.id))
        .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
        .leftJoin(rawScore, eq(Exams.rawScoreId, rawScore.id))
        .leftJoin(semesters, eq(courses.id, semesters.courseId))
        .leftJoin(category, eq(courses.categoryId, category.id))
        .where(eq(Exams.id, id));

    if (exam.length === 0) {
        throw new BadRequest("Exam not found");
    }

    const examData = exam[0];

    if (examData.examType === "static") {
        // 2. Fetch Sections
        const sections = await db.select({
            id: ExamSections.id,
            sectionId: ExamSections.sectionId,
            sectionOrder: ExamSections.sectionOrder,
            sectionName: Sections.sectionName,
            sectionDescription: Sections.sectionDescription,
            sectionTime: Sections.sectionTime,
        })
            .from(ExamSections)
            .leftJoin(Sections, eq(ExamSections.sectionId, Sections.id))
            .where(eq(ExamSections.examId, id))
            .orderBy(ExamSections.sectionOrder);

        const sectionIds = sections.map(s => s.id);

        if (sectionIds.length > 0) {
            // 3. Fetch Questions for these sections
            const sectionQuestions = await db.select({
                id: SectionQuestions.id,
                sectionId: SectionQuestions.sectionId,
                questionId: SectionQuestions.questionId,
                questionOrder: SectionQuestions.questionOrder,
                score: SectionQuestions.score,
                // Question Details
                questionText: questions.question,
                questionImage: questions.image,
                questionType: questions.questionType,
                difficulty: questions.difficulty,
                answerType: questions.answerType,
            })
                .from(SectionQuestions)
                .leftJoin(questions, eq(SectionQuestions.questionId, questions.id))
                .where(inArray(SectionQuestions.sectionId, sectionIds))
                .orderBy(SectionQuestions.questionOrder);

            // 4. Structure the Response
            const formattedSections = sections.map(section => {
                const sectionQs = sectionQuestions.filter(sq => sq.sectionId === section.id);
                return {
                    ...section,
                    questions: sectionQs
                };
            });

            return SuccessResponse(res, {
                message: "Exam fetched successfully",
                data: { ...examData, sections: formattedSections }
            }, 200);
        }

        return SuccessResponse(res, {
            message: "Exam fetched successfully",
            data: { ...examData, sections: [] }
        }, 200);

    } else {
        // Adaptive logic (placeholder)
        return SuccessResponse(res, {
            message: "Exam fetched successfully",
            data: examData
        }, 200);
    }
}

export const deleteExam = async (req: Request, res: Response) => {
    const { id } = req.params;

    const exam = await db.select().from(Exams).where(eq(Exams.id, id));
    if (exam.length === 0) {
        throw new BadRequest("Exam not found");
    }

    await db.transaction(async (tx) => {
        // 1. Find all sections for this exam
        const sections = await tx.select({ id: ExamSections.id }).from(ExamSections).where(eq(ExamSections.examId, id));
        const sectionIds = sections.map(s => s.id);

        // 2. Delete all questions in these sections
        if (sectionIds.length > 0) {
            await tx.delete(SectionQuestions).where(inArray(SectionQuestions.sectionId, sectionIds));
        }

        // 3. Delete the sections
        await tx.delete(ExamSections).where(eq(ExamSections.examId, id));

        // 4. Delete the exam itself
        await tx.delete(Exams).where(eq(Exams.id, id));
    });

    return SuccessResponse(res, { message: "Exam deleted successfully" }, 200);
}

export const getExamsByCourseId = async (req: Request, res: Response) => {
    const { courseId } = req.params;

    const course = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }

    const courseExams = await db.select({
        id: Exams.id,
        title: Exams.title,
        description: Exams.description,
        duration: Exams.duration,
        totalScore: Exams.totalScore,
        passScore: Exams.passScore,
        examType: Exams.examType,
        year: Exams.year,
        Month: Exams.Month,
        isActive: Exams.isActive,
        createdAt: Exams.createdAt,
        updatedAt: Exams.updatedAt,
        // Joins
        courseName: courses.name,
        codeName: examCodes.code,
        rawScoreName: rawScore.name,
        semesterName: semesters.name,
        categoryName: category.name,
    })
        .from(Exams)
        .leftJoin(courses, eq(Exams.courseId, courses.id))
        .leftJoin(examCodes, eq(Exams.codeId, examCodes.id))
        .leftJoin(rawScore, eq(Exams.rawScoreId, rawScore.id))
        .leftJoin(semesters, eq(courses.id, semesters.courseId))
        .leftJoin(category, eq(courses.categoryId, category.id))
        .where(eq(Exams.courseId, courseId));

    const staticExams = courseExams.filter(e => e.examType === "static");
    const adaptiveExams = courseExams.filter(e => e.examType === "adaptive");

    return SuccessResponse(res, {
        message: "Course exams fetched successfully",
        data: {
            course: course[0],
            exams: {
                static: staticExams,
                adaptive: adaptiveExams
            }
        }
    }, 200);
}
