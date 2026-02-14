import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { SuccessResponse } from "../../utils/response";
import { extractTextFromImage } from "../../ai/services/ocr-service";
import { BadRequest } from "../../Errors/BadRequest";
import { db } from "../../models/connection";
import { questions, questionOptions, questionAnswers, lessons, examCodes, ParallelQuestion, ParallelQuestionOptions } from "../../models/schema";
import { eq } from "drizzle-orm";
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
    const { question, image, answerType, difficulty, questionType, lessonId, options, year, month, section, codeId, answerPdf, answerVideo } = req.body;

    if (!question
        || !answerType
        || !difficulty
        || !questionType
        || !lessonId
        || !year
        || !month
        || !section
        || !codeId
    ) throw new BadRequest("All fields are required");

    if (answerType === "MCQ" && (!options || !Array.isArray(options) || options.length === 0)) throw new BadRequest("Options are required for MCQ");

    const lesson = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);

    if (!lesson[0]) {
        throw new NotFound("Lesson is not found");
    }
    const examCode = await db.select().from(examCodes).where(eq(examCodes.id, codeId)).limit(1);
    if (!examCode[0]) {
        throw new NotFound("Exam code is not found");
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
            section,
            codeId,
        });

        if (options && Array.isArray(options) && options.length > 0) {
            const formattedOptions = options.map((opt: any) => ({
                questionId: questionId,
                answer: opt.answer,
                isCorrect: opt.isCorrect,
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
    const Allquestions = await db.select({
        question: questions.question,
        answerType: questions.answerType,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        lessonId: questions.lessonId,
        year: questions.year,
        month: questions.month,
        section: questions.section,
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
    })
        .from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId));
    return SuccessResponse(res, { message: "Questions fetched successfully", data: Allquestions }, 200);
}

export const getQuestionbyId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Question ID is required");
    }
    const question = await db.select({
        question: questions.question,
        answerType: questions.answerType,
        difficulty: questions.difficulty,
        questionType: questions.questionType,
        lessonId: questions.lessonId,
        year: questions.year,
        month: questions.month,
        section: questions.section,
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
    }).from(questions)
        .innerJoin(lessons, eq(lessons.id, questions.lessonId))
        .innerJoin(examCodes, eq(examCodes.id, questions.codeId))
        .where(eq(questions.id, id)).limit(1);

    if (!question[0]) {
        throw new NotFound("Question is not found");
    }
    return SuccessResponse(res, { message: "Question fetched successfully", data: question[0] }, 200);
};

export const updateQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { question, image, answerType, difficulty, questionType, lessonId, options, year, month, section, codeId, answerPdf, answerVideo } = req.body;
    if (!id) {
        throw new BadRequest("Question ID is required");
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
        if (section !== undefined) questionUpdateData.section = section;
        if (codeId !== undefined) questionUpdateData.codeId = codeId;

        if (Object.keys(questionUpdateData).length > 0) {
            await tx.update(questions).set(questionUpdateData).where(eq(questions.id, id));
        }

        if (options && Array.isArray(options) && options.length > 0) {
            // Delete existing options
            await tx.delete(questionOptions).where(eq(questionOptions.questionId, id));

            // Insert new options
            const formattedOptions = options.map((opt: any) => ({
                questionId: id,
                answer: opt.answer,
                isCorrect: opt.isCorrect,
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
    if (answerType === "MCQ" && (!options || !Array.isArray(options) || options.length === 0)) throw new BadRequest("Options are required for MCQ");

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
                isCorrect: opt.isCorrect,
                order: opt.order,
            }));
            await tx.insert(ParallelQuestionOptions).values(formattedOptions);
        }
    });

    return SuccessResponse(res, { message: "Parallel question created successfully" }, 201);
};

export const updateParallelQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { question, answerType, difficulty, lessonId, options } = req.body; // No image, year, month, section, codeId, answerPdf/Video for parallel questions yet based on create

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
            const formattedOptions = options.map((opt: any) => ({
                questionId: id,
                answer: opt.answer,
                isCorrect: opt.isCorrect,
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
        .innerJoin(questions, eq(questions.id, ParallelQuestion.origianlQuestionId));

    return SuccessResponse(res, { data: allParallelQuestions }, 200);
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
        originalQuestion: {
            id: questions.id,
            question: questions.question,
        },
    }).from(ParallelQuestion)
        .innerJoin(lessons, eq(lessons.id, ParallelQuestion.lessonId))
        .innerJoin(questions, eq(questions.id, ParallelQuestion.origianlQuestionId))
        .where(eq(ParallelQuestion.id, id));


    return SuccessResponse(res, { data: parallelQuestion }, 200);
};
