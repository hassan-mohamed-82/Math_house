"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParallelQuestionbyId = exports.getAllParallelQuestions = exports.deleteParallelQuestion = exports.updateParallelQuestion = exports.createParallelQuestion = exports.sendParallelQuestionGenerate = exports.deleteQuestion = exports.updateQuestion = exports.getQuestionbyId = exports.getAllQuestions = exports.createQuestion = exports.getTextfromImage = void 0;
const uuid_1 = require("uuid");
const response_1 = require("../../utils/response");
const ocr_service_1 = require("../../ai/services/ocr-service");
const BadRequest_1 = require("../../Errors/BadRequest");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const Errors_1 = require("../../Errors");
const questionQueue_1 = require("../../queues/questionQueue");
const handleImages_1 = require("../../utils/handleImages");
const getTextfromImage = async (req, res) => {
    const imageSource = req.file?.buffer || req.body?.image;
    if (!imageSource)
        throw new BadRequest_1.BadRequest("Image is required (upload file or provide image URL)");
    const text = await (0, ocr_service_1.extractTextFromImage)(imageSource);
    if (!text)
        throw new BadRequest_1.BadRequest("Failed to extract text");
    return (0, response_1.SuccessResponse)(res, { message: "Text extracted successfully", data: text }, 200);
};
exports.getTextfromImage = getTextfromImage;
// TODO: SAVE IMAGES TO THE DRIVE Rather than BASE64
// Questions
const createQuestion = async (req, res) => {
    const { question, image, answerType, difficulty, questionType, lessonId, options, year, month, section, codeId, answerPdf, answerVideo } = req.body;
    if (!question
        || !answerType
        || !difficulty
        || !questionType
        || !lessonId
        || !year
        || !month
        || !section
        || !codeId)
        throw new BadRequest_1.BadRequest("All fields are required");
    if (answerType === "MCQ" && (!options || !Array.isArray(options) || options.length === 0))
        throw new BadRequest_1.BadRequest("Options are required for MCQ");
    const lesson = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, lessonId)).limit(1);
    if (!lesson[0]) {
        throw new Errors_1.NotFound("Lesson is not found");
    }
    const examCode = await connection_1.db.select().from(schema_1.examCodes).where((0, drizzle_orm_1.eq)(schema_1.examCodes.id, codeId)).limit(1);
    if (!examCode[0]) {
        throw new Errors_1.NotFound("Exam code is not found");
    }
    let imageUrl = image;
    if (image) {
        imageUrl = await (0, handleImages_1.validateAndSaveLogo)(req, image, "questions");
    }
    const questionId = (0, uuid_1.v4)();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.questions).values({
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
            const formattedOptions = options.map((opt) => ({
                questionId: questionId,
                answer: opt.answer,
                isCorrect: opt.isCorrect,
                order: opt.order,
            }));
            await tx.insert(schema_1.questionOptions).values(formattedOptions);
        }
        if (answerPdf || answerVideo) {
            await tx.insert(schema_1.questionAnswers).values({
                questionId: questionId,
                pdf: answerPdf,
                video: answerVideo,
            });
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Question created successfully" }, 201);
};
exports.createQuestion = createQuestion;
const getAllQuestions = async (req, res) => {
    const Allquestions = await connection_1.db.select({
        question: schema_1.questions.question,
        answerType: schema_1.questions.answerType,
        difficulty: schema_1.questions.difficulty,
        questionType: schema_1.questions.questionType,
        lessonId: schema_1.questions.lessonId,
        year: schema_1.questions.year,
        month: schema_1.questions.month,
        section: schema_1.questions.section,
        codeId: schema_1.questions.codeId,
        lesson: {
            id: schema_1.lessons.id,
            name: schema_1.lessons.name,
        },
        examCode: {
            id: schema_1.examCodes.id,
            code: schema_1.examCodes.code,
        },
        type: schema_1.questions.questionType,
    })
        .from(schema_1.questions)
        .innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.lessons.id, schema_1.questions.lessonId))
        .innerJoin(schema_1.examCodes, (0, drizzle_orm_1.eq)(schema_1.examCodes.id, schema_1.questions.codeId));
    return (0, response_1.SuccessResponse)(res, { message: "Questions fetched successfully", data: Allquestions }, 200);
};
exports.getAllQuestions = getAllQuestions;
const getQuestionbyId = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Question ID is required");
    }
    const question = await connection_1.db.select({
        question: schema_1.questions.question,
        answerType: schema_1.questions.answerType,
        difficulty: schema_1.questions.difficulty,
        questionType: schema_1.questions.questionType,
        lessonId: schema_1.questions.lessonId,
        year: schema_1.questions.year,
        month: schema_1.questions.month,
        section: schema_1.questions.section,
        codeId: schema_1.questions.codeId,
        lesson: {
            id: schema_1.lessons.id,
            name: schema_1.lessons.name,
        },
        examCode: {
            id: schema_1.examCodes.id,
            code: schema_1.examCodes.code,
        },
        type: schema_1.questions.questionType,
    }).from(schema_1.questions)
        .innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.lessons.id, schema_1.questions.lessonId))
        .innerJoin(schema_1.examCodes, (0, drizzle_orm_1.eq)(schema_1.examCodes.id, schema_1.questions.codeId))
        .where((0, drizzle_orm_1.eq)(schema_1.questions.id, id)).limit(1);
    if (!question[0]) {
        throw new Errors_1.NotFound("Question is not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Question fetched successfully", data: question[0] }, 200);
};
exports.getQuestionbyId = getQuestionbyId;
const updateQuestion = async (req, res) => {
    const { id } = req.params;
    const { question, image, answerType, difficulty, questionType, lessonId, options, year, month, section, codeId, answerPdf, answerVideo } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("Question ID is required");
    }
    await connection_1.db.transaction(async (tx) => {
        const existingQuestion = await tx.select().from(schema_1.questions).where((0, drizzle_orm_1.eq)(schema_1.questions.id, id)).limit(1);
        if (!existingQuestion[0]) {
            throw new Errors_1.NotFound("Question is not found");
        }
        const questionUpdateData = {};
        if (question !== undefined)
            questionUpdateData.question = question;
        if (image !== undefined) {
            const imageUpdate = await (0, handleImages_1.handleImageUpdate)(req, existingQuestion[0].image, image, "questions");
            questionUpdateData.image = imageUpdate;
        }
        if (answerType !== undefined)
            questionUpdateData.answerType = answerType;
        if (difficulty !== undefined)
            questionUpdateData.difficulty = difficulty;
        if (questionType !== undefined)
            questionUpdateData.questionType = questionType;
        if (lessonId !== undefined)
            questionUpdateData.lessonId = lessonId;
        if (year !== undefined)
            questionUpdateData.year = year;
        if (month !== undefined)
            questionUpdateData.month = month;
        if (section !== undefined)
            questionUpdateData.section = section;
        if (codeId !== undefined)
            questionUpdateData.codeId = codeId;
        if (Object.keys(questionUpdateData).length > 0) {
            await tx.update(schema_1.questions).set(questionUpdateData).where((0, drizzle_orm_1.eq)(schema_1.questions.id, id));
        }
        if (options && Array.isArray(options) && options.length > 0) {
            // Delete existing options
            await tx.delete(schema_1.questionOptions).where((0, drizzle_orm_1.eq)(schema_1.questionOptions.questionId, id));
            // Insert new options
            const formattedOptions = options.map((opt) => ({
                questionId: id,
                answer: opt.answer,
                isCorrect: opt.isCorrect,
                order: opt.order,
            }));
            await tx.insert(schema_1.questionOptions).values(formattedOptions);
        }
        if (answerPdf !== undefined || answerVideo !== undefined) {
            const existingAnswer = await tx.select().from(schema_1.questionAnswers).where((0, drizzle_orm_1.eq)(schema_1.questionAnswers.questionId, id)).limit(1);
            if (existingAnswer[0]) {
                const answerUpdateData = {};
                if (answerPdf !== undefined)
                    answerUpdateData.pdf = answerPdf;
                if (answerVideo !== undefined)
                    answerUpdateData.video = answerVideo;
                if (Object.keys(answerUpdateData).length > 0) {
                    await tx.update(schema_1.questionAnswers).set(answerUpdateData).where((0, drizzle_orm_1.eq)(schema_1.questionAnswers.questionId, id));
                }
            }
            else {
                await tx.insert(schema_1.questionAnswers).values({
                    questionId: id,
                    pdf: answerPdf || null, // Ensure at least one is null/undefined if not provided, though insert requires handling
                    video: answerVideo || null,
                });
            }
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Question updated successfully" }, 200);
};
exports.updateQuestion = updateQuestion;
const deleteQuestion = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Question ID is required");
    }
    const question = await connection_1.db.select().from(schema_1.questions).where((0, drizzle_orm_1.eq)(schema_1.questions.id, id)).limit(1);
    if (!question[0]) {
        throw new Errors_1.NotFound("Question is not found");
    }
    // Handle Parallel Questions deletion
    const parallelQuestions = await connection_1.db.select().from(schema_1.ParallelQuestion).where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestion.origianlQuestionId, id));
    await connection_1.db.transaction(async (tx) => {
        // Delete Parallel Questions and their options
        if (parallelQuestions.length > 0) {
            for (const pq of parallelQuestions) {
                await tx.delete(schema_1.ParallelQuestionOptions).where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestionOptions.questionId, pq.id));
                await tx.delete(schema_1.ParallelQuestion).where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestion.id, pq.id));
            }
        }
        // Delete options
        await tx.delete(schema_1.questionOptions).where((0, drizzle_orm_1.eq)(schema_1.questionOptions.questionId, id));
        // Delete answers
        await tx.delete(schema_1.questionAnswers).where((0, drizzle_orm_1.eq)(schema_1.questionAnswers.questionId, id));
        // Delete Question
        await tx.delete(schema_1.questions).where((0, drizzle_orm_1.eq)(schema_1.questions.id, id));
    });
    if (question[0].image) {
        await (0, handleImages_1.deleteImage)(question[0].image);
    }
    return (0, response_1.SuccessResponse)(res, { message: "Question deleted successfully" }, 200);
};
exports.deleteQuestion = deleteQuestion;
// Parallel Questions
const sendParallelQuestionGenerate = async (req, res) => {
    const { origianlQuestionId } = req.body;
    if (!origianlQuestionId) {
        throw new BadRequest_1.BadRequest("Original Question Must be Provided");
    }
    const originalQuestion = await connection_1.db.select().from(schema_1.questions).where((0, drizzle_orm_1.eq)(schema_1.questions.id, origianlQuestionId)).limit(1);
    if (!originalQuestion[0]) {
        throw new Errors_1.NotFound("Original question is not found");
    }
    if (!(originalQuestion[0].question) || originalQuestion[0].question.length <= 0) {
        throw new BadRequest_1.BadRequest("Original Question must have question text");
    }
    // TODO: Send to AI Generation
    // Send job to the queue
    const job = await (0, questionQueue_1.addGenerationJob)({
        topic: originalQuestion[0].question,
        difficulty: originalQuestion[0].difficulty,
        originalQuestionId: origianlQuestionId
    });
    return (0, response_1.SuccessResponse)(res, { message: "Parallel question generation started", jobId: job.id }, 200);
};
exports.sendParallelQuestionGenerate = sendParallelQuestionGenerate;
const createParallelQuestion = async (req, res) => {
    const { origianlQuestionId, question, answerType, difficulty, lessonId, options } = req.body;
    if (!origianlQuestionId
        || !question
        || !answerType
        || !difficulty
        || !lessonId)
        throw new BadRequest_1.BadRequest("All fields are required");
    if (answerType === "MCQ" && (!options || !Array.isArray(options) || options.length === 0))
        throw new BadRequest_1.BadRequest("Options are required for MCQ");
    const originalQuestion = await connection_1.db.select().from(schema_1.questions).where((0, drizzle_orm_1.eq)(schema_1.questions.id, origianlQuestionId)).limit(1);
    if (!originalQuestion[0]) {
        throw new Errors_1.NotFound("Original question is not found");
    }
    if (!(originalQuestion[0].question) || originalQuestion[0].question.length <= 0) {
        throw new BadRequest_1.BadRequest("Original Question must have question text");
    }
    const lesson = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, lessonId)).limit(1);
    if (!lesson[0]) {
        throw new Errors_1.NotFound("Lesson is not found");
    }
    const questionId = (0, uuid_1.v4)();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.ParallelQuestion).values({
            id: questionId,
            origianlQuestionId,
            question,
            answerType,
            difficulty,
            lessonId,
        });
        if (options && Array.isArray(options) && options.length > 0) {
            const formattedOptions = options.map((opt) => ({
                questionId: questionId,
                answer: opt.answer,
                isCorrect: opt.isCorrect,
                order: opt.order,
            }));
            await tx.insert(schema_1.ParallelQuestionOptions).values(formattedOptions);
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Parallel question created successfully" }, 201);
};
exports.createParallelQuestion = createParallelQuestion;
const updateParallelQuestion = async (req, res) => {
    const { id } = req.params;
    const { question, answerType, difficulty, lessonId, options } = req.body; // No image, year, month, section, codeId, answerPdf/Video for parallel questions yet based on create
    if (!id) {
        throw new BadRequest_1.BadRequest("Parallel Question ID is required");
    }
    await connection_1.db.transaction(async (tx) => {
        const existingQuestion = await tx.select().from(schema_1.ParallelQuestion).where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestion.id, id)).limit(1);
        if (!existingQuestion[0]) {
            throw new Errors_1.NotFound("Parallel Question is not found");
        }
        const updateData = {};
        if (question !== undefined)
            updateData.question = question;
        if (answerType !== undefined)
            updateData.answerType = answerType;
        if (difficulty !== undefined)
            updateData.difficulty = difficulty;
        if (lessonId !== undefined)
            updateData.lessonId = lessonId;
        if (Object.keys(updateData).length > 0) {
            await tx.update(schema_1.ParallelQuestion).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestion.id, id));
        }
        if (options && Array.isArray(options) && options.length > 0) {
            // Delete existing options
            await tx.delete(schema_1.ParallelQuestionOptions).where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestionOptions.questionId, id));
            // Insert new options
            const formattedOptions = options.map((opt) => ({
                questionId: id,
                answer: opt.answer,
                isCorrect: opt.isCorrect,
                order: opt.order,
            }));
            await tx.insert(schema_1.ParallelQuestionOptions).values(formattedOptions);
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Parallel question updated successfully" }, 200);
};
exports.updateParallelQuestion = updateParallelQuestion;
const deleteParallelQuestion = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Question ID is required");
    }
    const question = await connection_1.db.select().from(schema_1.ParallelQuestion).where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestion.id, id)).limit(1);
    if (!question[0]) {
        throw new Errors_1.NotFound("Parallel Question is not found");
    }
    await connection_1.db.transaction(async (tx) => {
        // Delete options
        await tx.delete(schema_1.ParallelQuestionOptions).where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestionOptions.questionId, id));
        // Delete Question
        await tx.delete(schema_1.ParallelQuestion).where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestion.id, id));
    });
    return (0, response_1.SuccessResponse)(res, { message: "Parallel Question deleted successfully" }, 200);
};
exports.deleteParallelQuestion = deleteParallelQuestion;
const getAllParallelQuestions = async (req, res) => {
    const allParallelQuestions = await connection_1.db.select({
        id: schema_1.ParallelQuestion.id,
        question: schema_1.ParallelQuestion.question,
        answerType: schema_1.ParallelQuestion.answerType,
        difficulty: schema_1.ParallelQuestion.difficulty,
        lessonId: schema_1.ParallelQuestion.lessonId,
        origianlQuestionId: schema_1.ParallelQuestion.origianlQuestionId,
        createdAt: schema_1.ParallelQuestion.createdAt,
        updatedAt: schema_1.ParallelQuestion.updatedAt,
        lesson: {
            id: schema_1.lessons.id,
            name: schema_1.lessons.name,
        },
        originalQuestion: {
            id: schema_1.questions.id,
            question: schema_1.questions.question,
        },
    }).from(schema_1.ParallelQuestion)
        .innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.lessons.id, schema_1.ParallelQuestion.lessonId))
        .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.questions.id, schema_1.ParallelQuestion.origianlQuestionId));
    return (0, response_1.SuccessResponse)(res, { data: allParallelQuestions }, 200);
};
exports.getAllParallelQuestions = getAllParallelQuestions;
const getParallelQuestionbyId = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Question ID is required");
    }
    const parallelQuestion = await connection_1.db.select({
        id: schema_1.ParallelQuestion.id,
        question: schema_1.ParallelQuestion.question,
        answerType: schema_1.ParallelQuestion.answerType,
        difficulty: schema_1.ParallelQuestion.difficulty,
        lessonId: schema_1.ParallelQuestion.lessonId,
        origianlQuestionId: schema_1.ParallelQuestion.origianlQuestionId,
        createdAt: schema_1.ParallelQuestion.createdAt,
        updatedAt: schema_1.ParallelQuestion.updatedAt,
        lesson: {
            id: schema_1.lessons.id,
            name: schema_1.lessons.name,
        },
        originalQuestion: {
            id: schema_1.questions.id,
            question: schema_1.questions.question,
        },
    }).from(schema_1.ParallelQuestion)
        .innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.lessons.id, schema_1.ParallelQuestion.lessonId))
        .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.questions.id, schema_1.ParallelQuestion.origianlQuestionId))
        .where((0, drizzle_orm_1.eq)(schema_1.ParallelQuestion.id, id));
    return (0, response_1.SuccessResponse)(res, { data: parallelQuestion }, 200);
};
exports.getParallelQuestionbyId = getParallelQuestionbyId;
