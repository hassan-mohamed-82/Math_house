import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { SuccessResponse } from "../../utils/response";
import { extractTextFromImage } from "../../ai/services/ocr-service";
import { BadRequest } from "../../Errors/BadRequest";
import { db } from "../../models/connection";
import {
    questions,
    questionOptions,
    questionAnswers,
    lessons,
    examCodes,
    ParallelQuestion,
    ParallelQuestionOptions,
    Sections
} from "../../models/schema";
import { eq, count, desc, like, or, SQL, and } from "drizzle-orm";
import { NotFound } from "../../Errors";
import { addGenerationJob } from "../../queues/questionQueue";
import { validateAndSaveLogo, deleteImage, handleImageUpdate } from "../../utils/handleImages";

export const getTextfromImage = async (req: Request, res: Response) => {
    const imageSource = req.file?.buffer || req.body?.image;

    if (!imageSource) throw new BadRequest("Image is required (upload file or provide image URL)");

    const text = await extractTextFromImage(imageSource);

    if (!text) throw new BadRequest("Failed to extract text");

    return SuccessResponse(res, { message: "Text extracted successfully", data: text }, 200);
}
// TODO: SAVE IMAGES TO THE DRIVE Rather than BASE64
// Questions
export const createQuestion = async (req: Request, res: Response) => {
    const { question, image, answerType, difficulty, questionType, lessonId, options, year, month, sectionId, codeId, answerPdf, answerVideo } = req.body;

    if (!question
        || !answerType
        || !difficulty
        || !questionType
        || !lessonId
        || !year
        || !month
        || !sectionId
        || !codeId
    ) throw new BadRequest("All fields are required");

    if ((answerType === "MCQ" || answerType === "Grid in") && (!options || !Array.isArray(options) || options.length === 0)) throw new BadRequest(`Options are required for ${answerType}`);

    const lesson = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);

    if (!lesson[0]) {
        throw new NotFound("Lesson is not found");
    }
    const examCode = await db.select().from(examCodes).where(eq(examCodes.id, codeId)).limit(1);
    if (!examCode[0]) {
        throw new NotFound("Exam code is not found");
    }
    const section = await db.select().from(Sections).where(eq(Sections.id, sectionId)).limit(1);
    if (!section[0]) {
        throw new NotFound("Section is not found");
    }

    let imageUrl = image;
    if (image) {
        imageUrl = await validateAndSaveLogo(req, image, "questions");
    }

    const questionId = uuidv4();
    await db.transaction(async (tx) => {
        await tx.insert(questions).values({
            id: questionId,
            question,
            image: imageUrl,
            answerType,
            difficulty,
            questionType,
            lessonId,
            year,
            month,
            sectionId,
            codeId,
        });

        if (options && Array.isArray(options) && options.length > 0) {
            const formattedOptions = options.map((opt: any) => ({
                questionId: questionId,
                answer: opt.answer,
                isCorrect: answerType === "Grid in" ? true : opt.isCorrect,
                order: opt.order,
            }));
            await tx.insert(questionOptions).values(formattedOptions);
        }

        if (answerPdf || answerVideo) {
            await tx.insert(questionAnswers).values({
                questionId: questionId,
                pdf: answerPdf,
                video: answerVideo,
            });
        }
    });

    return SuccessResponse(res, { message: "Question created successfully" }, 201);
};


export const getAllQuestions = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search as string | undefined;
    const difficulty = req.query.difficulty as string | undefined;
    const questionType = req.query.questionType as string | undefined;
    const answerType = req.query.answerType as string | undefined;
    const year = req.query.year as string | undefined;
    const month = req.query.month as string | undefined;
    const sectionId = req.query.sectionId as string | undefined;
    const codeId = req.query.codeId as string | undefined;

    const searchCondition: SQL | undefined = search
        ? or(
            like(questions.question, `%${search}%`),
            like(lessons.name, `%${search}%`),
            like(examCodes.code, `%${search}%`),
            like(Sections.sectionName, `%${search}%`)
        )
        : undefined;

    const conditions = [
        searchCondition,
        difficulty ? eq(questions.difficulty, difficulty as any) : undefined,
        questionType ? eq(questions.questionType, questionType as any) : undefined,
        answerType ? eq(questions.answerType, answerType as any) : undefined,
        year ? eq(questions.year, parseInt(year)) : undefined,
        month ? eq(questions.month, month as any) : undefined,
        sectionId ? eq(questions.sectionId, sectionId) : undefined,
        codeId ? eq(questions.codeId, codeId) : undefined,
    ].filter(Boolean) as SQL[];

    const finalCondition = conditions.length > 0 ? (conditions.length > 1 ? and(...conditions) : conditions[0]) : undefined;

    const [totalQueries] = await db.select({ count: count() })
        .from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .innerJoin(Sections, eq(Sections.id, questions.sectionId))
        .where(finalCondition);

    const total = totalQueries.count;
    const totalPages = Math.ceil(total / limit);

    const Allquestions = await db.select({
        id: questions.id,
        question: questions.question,
        answerType: questions.answerType,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        lessonId: questions.lessonId,
        year: questions.year,
        month: questions.month,
        sectionId: questions.sectionId,
        codeId: questions.codeId,
        lesson: {
            id: lessons.id,
            name: lessons.name,
        },
        examCode: {
            id: examCodes.id,
            code: examCodes.code,
        },
        type: questions.questionType,
        section: {
            id: Sections.id,
            sectionName: Sections.sectionName,
        }
    })
        .from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .innerJoin(Sections, eq(Sections.id, questions.sectionId))
        .where(finalCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(questions.createdAt));

    return SuccessResponse(res, {
        message: "Questions fetched successfully",
        data: Allquestions,
        pagination: {
            total,
            page,
            limit,
            totalPages
        }
    }, 200);
}

export const getQuestionbyId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Question ID is required");
    }
    const question = await db.select({
        id: questions.id,
        question: questions.question,
        image: questions.image,
        answerType: questions.answerType,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        lessonId: questions.lessonId,
        year: questions.year,
        month: questions.month,
        sectionId: questions.sectionId,
        codeId: questions.codeId,
        lesson: {
            id: lessons.id,
            name: lessons.name,
        },
        examCode: {
            id: examCodes.id,
            code: examCodes.code,
        },
        type: questions.questionType,
        section: {
            id: Sections.id,
            sectionName: Sections.sectionName,
        },
        pdf: questionAnswers.pdf,
        video: questionAnswers.video,
    }).from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .innerJoin(Sections, eq(Sections.id, questions.sectionId))
        .leftJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
        .where(eq(questions.id, id)).limit(1);

    if (!question[0]) {
        throw new NotFound("Question is not found");
    }

    const options = await db.select({
        id: questionOptions.id,
        answer: questionOptions.answer,
        isCorrect: questionOptions.isCorrect,
        order: questionOptions.order,
    }).from(questionOptions).where(eq(questionOptions.questionId, id));

    return SuccessResponse(res, { message: "Question fetched successfully", data: { ...question[0], options } }, 200);
};

export const updateQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { question, image, answerType, difficulty, questionType, lessonId, options, year, month, sectionId, codeId, answerPdf, answerVideo } = req.body;
    if (!id) {
        throw new BadRequest("Question ID is required");
    }
    if (lessonId) {
        const lesson = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
        if (!lesson[0]) {
            throw new NotFound("Lesson is not found");
        }
    }
    if (codeId) {
        const examCode = await db.select().from(examCodes).where(eq(examCodes.id, codeId)).limit(1);
        if (!examCode[0]) {
            throw new NotFound("Exam code is not found");
        }
    }
    if (sectionId) {
        const section = await db.select().from(Sections).where(eq(Sections.id, sectionId)).limit(1);
        if (!section[0]) {
            throw new NotFound("Section is not found");
        }
    }
    await db.transaction(async (tx) => {
        const existingQuestion = await tx.select().from(questions).where(eq(questions.id, id)).limit(1);
        if (!existingQuestion[0]) {
            throw new NotFound("Question is not found");
        }

        const questionUpdateData: any = {};
        if (question !== undefined) questionUpdateData.question = question;
        if (image !== undefined) {
            const imageUpdate = await handleImageUpdate(req, existingQuestion[0].image, image, "questions");
            questionUpdateData.image = imageUpdate;
        }
        if (answerType !== undefined) questionUpdateData.answerType = answerType;
        if (difficulty !== undefined) questionUpdateData.difficulty = difficulty;
        if (questionType !== undefined) questionUpdateData.questionType = questionType;
        if (lessonId !== undefined) questionUpdateData.lessonId = lessonId;
        if (year !== undefined) questionUpdateData.year = year;
        if (month !== undefined) questionUpdateData.month = month;
        if (sectionId !== undefined) questionUpdateData.sectionId = sectionId;
        if (codeId !== undefined) questionUpdateData.codeId = codeId;

        if (Object.keys(questionUpdateData).length > 0) {
            await tx.update(questions).set(questionUpdateData).where(eq(questions.id, id));
        }

        if (options && Array.isArray(options) && options.length > 0) {
            // Delete existing options
            await tx.delete(questionOptions).where(eq(questionOptions.questionId, id));

            // Insert new options
            const currentAnswerType = answerType !== undefined ? answerType : existingQuestion[0].answerType;
            const formattedOptions = options.map((opt: any) => ({
                questionId: id,
                answer: opt.answer,
                isCorrect: currentAnswerType === "Grid in" ? true : opt.isCorrect,
                order: opt.order,
            }));
            await tx.insert(questionOptions).values(formattedOptions);
        }

        if (answerPdf !== undefined || answerVideo !== undefined) {
            const existingAnswer = await tx.select().from(questionAnswers).where(eq(questionAnswers.questionId, id)).limit(1);

            if (existingAnswer[0]) {
                const answerUpdateData: any = {};
                if (answerPdf !== undefined) answerUpdateData.pdf = answerPdf;
                if (answerVideo !== undefined) answerUpdateData.video = answerVideo;

                if (Object.keys(answerUpdateData).length > 0) {
                    await tx.update(questionAnswers).set(answerUpdateData).where(eq(questionAnswers.questionId, id));
                }
            } else {
                await tx.insert(questionAnswers).values({
                    questionId: id,
                    pdf: answerPdf || null, // Ensure at least one is null/undefined if not provided, though insert requires handling
                    video: answerVideo || null,
                });
            }
        }
    });

    return SuccessResponse(res, { message: "Question updated successfully" }, 200);
};

export const deleteQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Question ID is required");
    }

    const question = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
    if (!question[0]) {
        throw new NotFound("Question is not found");
    }

    // Handle Parallel Questions deletion
    const parallelQuestions = await db.select().from(ParallelQuestion).where(eq(ParallelQuestion.origianlQuestionId, id));

    await db.transaction(async (tx) => {
        // Delete Parallel Questions and their options
        if (parallelQuestions.length > 0) {
            for (const pq of parallelQuestions) {
                await tx.delete(ParallelQuestionOptions).where(eq(ParallelQuestionOptions.questionId, pq.id));
                await tx.delete(ParallelQuestion).where(eq(ParallelQuestion.id, pq.id));
            }
        }

        // Delete options
        await tx.delete(questionOptions).where(eq(questionOptions.questionId, id));
        // Delete answers
        await tx.delete(questionAnswers).where(eq(questionAnswers.questionId, id));
        // Delete Question
        await tx.delete(questions).where(eq(questions.id, id));
    });

    if (question[0].image) {
        await deleteImage(question[0].image);
    }

    return SuccessResponse(res, { message: "Question deleted successfully" }, 200);
};

export const getQuestionsbyLessonId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Lesson ID is required");
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search as string | undefined;
    const difficulty = req.query.difficulty as string | undefined;
    const questionType = req.query.questionType as string | undefined;
    const answerType = req.query.answerType as string | undefined;
    const year = req.query.year as string | undefined;
    const month = req.query.month as string | undefined;
    const sectionId = req.query.sectionId as string | undefined;
    const codeId = req.query.codeId as string | undefined;

    const searchCondition: SQL | undefined = search
        ? or(
            like(questions.question, `%${search}%`),
            like(examCodes.code, `%${search}%`),
            like(Sections.sectionName, `%${search}%`)
        )
        : undefined;

    const conditions = [
        eq(questions.lessonId, id),
        searchCondition,
        difficulty ? eq(questions.difficulty, difficulty as any) : undefined,
        questionType ? eq(questions.questionType, questionType as any) : undefined,
        answerType ? eq(questions.answerType, answerType as any) : undefined,
        year ? eq(questions.year, parseInt(year)) : undefined,
        month ? eq(questions.month, month as any) : undefined,
        sectionId ? eq(questions.sectionId, sectionId) : undefined,
        codeId ? eq(questions.codeId, codeId) : undefined,
    ].filter(Boolean) as SQL[];

    const finalCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [totalQueries] = await db.select({ count: count() })
        .from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .innerJoin(Sections, eq(Sections.id, questions.sectionId))
        .where(finalCondition);

    const total = totalQueries.count;
    const totalPages = Math.ceil(total / limit);

    const Allquestions = await db.select({
        id: questions.id,
        question: questions.question,
        answerType: questions.answerType,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        lessonId: questions.lessonId,
        year: questions.year,
        month: questions.month,
        sectionId: questions.sectionId,
        codeId: questions.codeId,
        lesson: {
            id: lessons.id,
            name: lessons.name,
        },
        examCode: {
            id: examCodes.id,
            code: examCodes.code,
        },
        type: questions.questionType,
        section: {
            id: Sections.id,
            sectionName: Sections.sectionName,
        }
    })
        .from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .innerJoin(Sections, eq(Sections.id, questions.sectionId))
        .where(finalCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(questions.createdAt));

    return SuccessResponse(res, {
        message: "Questions fetched successfully",
        data: Allquestions,
        pagination: {
            total,
            page,
            limit,
            totalPages
        }
    }, 200);
};

export const getQuestionsbyCourseId = async (req: Request, res: Response) => {
    const { courseId } = req.params;
    if (!courseId) {
        throw new BadRequest("Course ID is required");
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search as string | undefined;

    const searchCondition: SQL | undefined = search
        ? or(
            like(questions.question, `%${search}%`),
            like(lessons.name, `%${search}%`),
            like(examCodes.code, `%${search}%`),
            like(Sections.sectionName, `%${search}%`)
        )
        : undefined;

    const finalCondition = searchCondition
        ? and(eq(lessons.courseId, courseId), searchCondition)
        : eq(lessons.courseId, courseId);

    const [totalQueries] = await db.select({ count: count() })
        .from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .innerJoin(Sections, eq(Sections.id, questions.sectionId))
        .where(finalCondition);

    const total = totalQueries.count;
    const totalPages = Math.ceil(total / limit);

    const Allquestions = await db.select({
        id: questions.id,
        question: questions.question,
        answerType: questions.answerType,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        lessonId: questions.lessonId,
        year: questions.year,
        month: questions.month,
        sectionId: questions.sectionId,
        codeId: questions.codeId,
        lesson: {
            id: lessons.id,
            name: lessons.name,
        },
        examCode: {
            id: examCodes.id,
            code: examCodes.code,
        },
        type: questions.questionType,
        section: {
            id: Sections.id,
            sectionName: Sections.sectionName,
        }
    })
        .from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .innerJoin(Sections, eq(Sections.id, questions.sectionId))
        .where(finalCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(questions.createdAt));

    return SuccessResponse(res, {
        message: "Questions fetched successfully",
        data: Allquestions,
        pagination: {
            total,
            page,
            limit,
            totalPages
        }
    }, 200);
};

export const getQuestionsbySectiondId = async (req: Request, res: Response) => {
    const { sectionId } = req.params;
    if (!sectionId) {
        throw new BadRequest("Section ID is required");
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search as string | undefined;

    const searchCondition: SQL | undefined = search
        ? or(
            like(questions.question, `%${search}%`),
            like(lessons.name, `%${search}%`),
            like(examCodes.code, `%${search}%`),
            like(Sections.sectionName, `%${search}%`)
        )
        : undefined;

    const finalCondition = searchCondition
        ? and(eq(Sections.id, sectionId), searchCondition)
        : eq(Sections.id, sectionId);

    const [totalQueries] = await db.select({ count: count() })
        .from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .innerJoin(Sections, eq(Sections.id, questions.sectionId))
        .where(finalCondition);

    const total = totalQueries.count;
    const totalPages = Math.ceil(total / limit);

    const Allquestions = await db.select({
        id: questions.id,
        question: questions.question,
        answerType: questions.answerType,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        lessonId: questions.lessonId,
        year: questions.year,
        month: questions.month,
        sectionId: questions.sectionId,
        codeId: questions.codeId,
        lesson: {
            id: lessons.id,
            name: lessons.name,
        },
        examCode: {
            id: examCodes.id,
            code: examCodes.code,
        },
        type: questions.questionType,
        section: {
            id: Sections.id,
            sectionName: Sections.sectionName,
        }
    })
        .from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .innerJoin(Sections, eq(Sections.id, questions.sectionId))
        .where(finalCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(questions.createdAt));

    return SuccessResponse(res, {
        message: "Questions fetched successfully",
        data: Allquestions,
        pagination: {
            total,
            page,
            limit,
            totalPages
        }
    }, 200);
};
// Parallel Questions
export const sendParallelQuestionGenerate = async (req: Request, res: Response) => {
    const { origianlQuestionId } = req.body;
    if (!origianlQuestionId) {
        throw new BadRequest("Original Question Must be Provided");
    }
    const originalQuestion = await db.select().from(questions).where(eq(questions.id, origianlQuestionId)).limit(1);
    if (!originalQuestion[0]) {
        throw new NotFound("Original question is not found");
    }
    if (!(originalQuestion[0].question) || originalQuestion[0].question.length <= 0) {
        throw new BadRequest("Original Question must have question text");
    }

    // TODO: Send to AI Generation
    // Send job to the queue
    const job = await addGenerationJob({
        topic: originalQuestion[0].question,
        difficulty: originalQuestion[0].difficulty,
        originalQuestionId: origianlQuestionId
    });

    return SuccessResponse(res, { message: "Parallel question generation started", jobId: job.id }, 200);
};

export const createParallelQuestion = async (req: Request, res: Response) => {
    const { origianlQuestionId, question, answerType, difficulty, lessonId, options } = req.body;

    if (!origianlQuestionId
        || !question
        || !answerType
        || !difficulty
        || !lessonId
    ) throw new BadRequest("All fields are required");
    if ((answerType === "MCQ" || answerType === "Grid in") && (!options || !Array.isArray(options) || options.length === 0)) throw new BadRequest(`Options are required for ${answerType}`);

    const originalQuestion = await db.select().from(questions).where(eq(questions.id, origianlQuestionId)).limit(1);
    if (!originalQuestion[0]) {
        throw new NotFound("Original question is not found");
    }

    if (!(originalQuestion[0].question) || originalQuestion[0].question.length <= 0) {
        throw new BadRequest("Original Question must have question text");
    }
    const lesson = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);

    if (!lesson[0]) {
        throw new NotFound("Lesson is not found");
    }

    const questionId = uuidv4();
    await db.transaction(async (tx) => {
        await tx.insert(ParallelQuestion).values({
            id: questionId,
            origianlQuestionId,
            question,
            answerType,
            difficulty,
            lessonId,
        });

        if (options && Array.isArray(options) && options.length > 0) {
            const formattedOptions = options.map((opt: any) => ({
                questionId: questionId,
                answer: opt.answer,
                isCorrect: answerType === "Grid in" ? true : opt.isCorrect,
                order: opt.order,
            }));
            await tx.insert(ParallelQuestionOptions).values(formattedOptions);
        }
    });

    return SuccessResponse(res, { message: "Parallel question created successfully" }, 201);
};

export const updateParallelQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { question, answerType, difficulty, lessonId, options } = req.body; // No image, year, month, sectionId, codeId, answerPdf/Video for parallel questions yet based on create

    if (!id) {
        throw new BadRequest("Parallel Question ID is required");
    }

    await db.transaction(async (tx) => {
        const existingQuestion = await tx.select().from(ParallelQuestion).where(eq(ParallelQuestion.id, id)).limit(1);
        if (!existingQuestion[0]) {
            throw new NotFound("Parallel Question is not found");
        }

        const updateData: any = {};
        if (question !== undefined) updateData.question = question;
        if (answerType !== undefined) updateData.answerType = answerType;
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (lessonId !== undefined) updateData.lessonId = lessonId;

        if (Object.keys(updateData).length > 0) {
            await tx.update(ParallelQuestion).set(updateData).where(eq(ParallelQuestion.id, id));
        }

        if (options && Array.isArray(options) && options.length > 0) {
            // Delete existing options
            await tx.delete(ParallelQuestionOptions).where(eq(ParallelQuestionOptions.questionId, id));

            // Insert new options
            const currentAnswerType = answerType !== undefined ? answerType : existingQuestion[0].answerType;
            const formattedOptions = options.map((opt: any) => ({
                questionId: id,
                answer: opt.answer,
                isCorrect: currentAnswerType === "Grid in" ? true : opt.isCorrect,
                order: opt.order,
            }));
            await tx.insert(ParallelQuestionOptions).values(formattedOptions);
        }
    });

    return SuccessResponse(res, { message: "Parallel question updated successfully" }, 200);
};

export const deleteParallelQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Question ID is required");
    }

    const question = await db.select().from(ParallelQuestion).where(eq(ParallelQuestion.id, id)).limit(1);
    if (!question[0]) {
        throw new NotFound("Parallel Question is not found");
    }

    await db.transaction(async (tx) => {
        // Delete options
        await tx.delete(ParallelQuestionOptions).where(eq(ParallelQuestionOptions.questionId, id));
        // Delete Question
        await tx.delete(ParallelQuestion).where(eq(ParallelQuestion.id, id));
    });

    return SuccessResponse(res, { message: "Parallel Question deleted successfully" }, 200);
};

export const getAllParallelQuestions = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search as string | undefined;
    const difficulty = req.query.difficulty as string | undefined;
    const answerType = req.query.answerType as string | undefined;
    const lessonId = req.query.lessonId as string | undefined;

    const searchCondition: SQL | undefined = search
        ? or(
            like(ParallelQuestion.question, `%${search}%`),
            like(lessons.name, `%${search}%`),
            like(questions.question, `%${search}%`)
        )
        : undefined;

    const conditions = [
        searchCondition,
        difficulty ? eq(ParallelQuestion.difficulty, difficulty as any) : undefined,
        answerType ? eq(ParallelQuestion.answerType, answerType as any) : undefined,
        lessonId ? eq(ParallelQuestion.lessonId, lessonId) : undefined,
    ].filter(Boolean) as SQL[];

    const finalCondition = conditions.length > 0 ? (conditions.length > 1 ? and(...conditions) : conditions[0]) : undefined;

    const [totalQueries] = await db.select({ count: count() })
        .from(ParallelQuestion)
        .innerJoin(lessons, eq(lessons.id, ParallelQuestion.lessonId))
        .innerJoin(questions, eq(questions.id, ParallelQuestion.origianlQuestionId))
        .where(finalCondition);

    const total = totalQueries.count;
    const totalPages = Math.ceil(total / limit);

    const allParallelQuestions = await db.select({
        id: ParallelQuestion.id,
        question: ParallelQuestion.question,
        answerType: ParallelQuestion.answerType,
        difficulty: ParallelQuestion.difficulty,
        lessonId: ParallelQuestion.lessonId,
        origianlQuestionId: ParallelQuestion.origianlQuestionId,
        createdAt: ParallelQuestion.createdAt,
        updatedAt: ParallelQuestion.updatedAt,
        lesson: {
            id: lessons.id,
            name: lessons.name,
        },
        originalQuestion: {
            id: questions.id,
            question: questions.question,
        },
    }).from(ParallelQuestion)
        .innerJoin(lessons, eq(lessons.id, ParallelQuestion.lessonId))
        .innerJoin(questions, eq(questions.id, ParallelQuestion.origianlQuestionId))
        .where(finalCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(ParallelQuestion.createdAt));

    return SuccessResponse(res, {
        data: allParallelQuestions,
        pagination: {
            total,
            page,
            limit,
            totalPages
        }
    }, 200);
};

export const getParallelQuestionbyId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Question ID is required");
    }

    const parallelQuestion = await db.select({
        id: ParallelQuestion.id,
        question: ParallelQuestion.question,
        answerType: ParallelQuestion.answerType,
        difficulty: ParallelQuestion.difficulty,
        lessonId: ParallelQuestion.lessonId,
        origianlQuestionId: ParallelQuestion.origianlQuestionId,
        createdAt: ParallelQuestion.createdAt,
        updatedAt: ParallelQuestion.updatedAt,
        lesson: {
            id: lessons.id,
            name: lessons.name,
        },
        options: {
            id: ParallelQuestionOptions.id,
            answer: ParallelQuestionOptions.answer,
            isCorrect: ParallelQuestionOptions.isCorrect,
            order: ParallelQuestionOptions.order,
        },
        originalQuestion: {
            id: questions.id,
            question: questions.question,
        }
    }).from(ParallelQuestion)
        .innerJoin(lessons, eq(lessons.id, ParallelQuestion.lessonId))
        .innerJoin(questions, eq(questions.id, ParallelQuestion.origianlQuestionId))
        .leftJoin(ParallelQuestionOptions, eq(ParallelQuestionOptions.questionId, ParallelQuestion.id))
        .where(eq(ParallelQuestion.id, id));


    return SuccessResponse(res, { data: parallelQuestion }, 200);
};

export const getParallelQuestionsByOriginalId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Original Question ID is required");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search as string | undefined;
    const difficulty = req.query.difficulty as string | undefined;
    const answerType = req.query.answerType as string | undefined;
    const lessonId = req.query.lessonId as string | undefined;

    const searchCondition: SQL | undefined = search
        ? or(
            like(ParallelQuestion.question, `%${search}%`),
            like(lessons.name, `%${search}%`),
            like(questions.question, `%${search}%`)
        )
        : undefined;

    const conditions = [
        eq(ParallelQuestion.origianlQuestionId, id),
        searchCondition,
        difficulty ? eq(ParallelQuestion.difficulty, difficulty as any) : undefined,
        answerType ? eq(ParallelQuestion.answerType, answerType as any) : undefined,
        lessonId ? eq(ParallelQuestion.lessonId, lessonId) : undefined,
    ].filter(Boolean) as SQL[];

    const finalCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [totalQueries] = await db.select({ count: count() })
        .from(ParallelQuestion)
        .innerJoin(lessons, eq(lessons.id, ParallelQuestion.lessonId))
        .innerJoin(questions, eq(questions.id, ParallelQuestion.origianlQuestionId))
        .where(finalCondition);

    const total = totalQueries.count;
    const totalPages = Math.ceil(total / limit);

    const allParallelQuestions = await db.select({
        id: ParallelQuestion.id,
        question: ParallelQuestion.question,
        answerType: ParallelQuestion.answerType,
        difficulty: ParallelQuestion.difficulty,
        lessonId: ParallelQuestion.lessonId,
        origianlQuestionId: ParallelQuestion.origianlQuestionId,
        createdAt: ParallelQuestion.createdAt,
        updatedAt: ParallelQuestion.updatedAt,
        lesson: {
            id: lessons.id,
            name: lessons.name,
        },
        originalQuestion: {
            id: questions.id,
            question: questions.question,
        },
    }).from(ParallelQuestion)
        .innerJoin(lessons, eq(lessons.id, ParallelQuestion.lessonId))
        .innerJoin(questions, eq(questions.id, ParallelQuestion.origianlQuestionId))
        .where(finalCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(ParallelQuestion.createdAt));

    return SuccessResponse(res, {
        data: allParallelQuestions,
        pagination: {
            total,
            page,
            limit,
            totalPages
        }
    }, 200);
};

