"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizzesByLessonId = exports.getSelection = exports.getFilterOptions = exports.getQuestionsBank = exports.toggleQuizActive = exports.deleteQuiz = exports.updateQuiz = exports.getQuizById = exports.getAllQuizzes = exports.createQuiz = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const schema_2 = require("../../models/schema");
const schema_3 = require("../../models/schema");
const schema_4 = require("../../models/schema");
const schema_5 = require("../../models/schema");
const schema_6 = require("../../models/schema");
const schema_7 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const uuid_1 = require("uuid");
const createQuiz = async (req, res) => {
    const { title, description, durationHours, durationMinutes, totalScore, passScore, quizOrder, isActive, categoryId, courseId, chapterId, lessonId, questionIds, } = req.body;
    if (!title) {
        throw new BadRequest_1.BadRequest("Title is required");
    }
    const quizId = (0, uuid_1.v4)();
    await connection_1.db.insert(schema_1.quizzes).values({
        id: quizId,
        title,
        description,
        durationHours: durationHours || 0,
        durationMinutes: durationMinutes || 0,
        totalScore: totalScore || 100,
        passScore: passScore || 50,
        quizOrder: quizOrder || 0,
        isActive: isActive || false,
        categoryId,
        courseId,
        chapterId,
        lessonId,
    });
    let addedQuestionsCount = 0;
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
        for (let i = 0; i < questionIds.length; i++) {
            const questionId = questionIds[i];
            const questionExists = await connection_1.db
                .select()
                .from(schema_2.questions)
                .where((0, drizzle_orm_1.eq)(schema_2.questions.id, questionId))
                .limit(1);
            if (questionExists[0]) {
                await connection_1.db.insert(schema_1.quizQuestions).values({
                    id: (0, uuid_1.v4)(),
                    quizId,
                    questionId,
                    questionOrder: i + 1,
                });
                addedQuestionsCount++;
            }
        }
    }
    const newQuiz = await connection_1.db
        .select({
        id: schema_1.quizzes.id,
        title: schema_1.quizzes.title,
        description: schema_1.quizzes.description,
        durationHours: schema_1.quizzes.durationHours,
        durationMinutes: schema_1.quizzes.durationMinutes,
        totalScore: schema_1.quizzes.totalScore,
        passScore: schema_1.quizzes.passScore,
        quizOrder: schema_1.quizzes.quizOrder,
        isActive: schema_1.quizzes.isActive,
        createdAt: schema_1.quizzes.createdAt,
        category: {
            id: schema_3.category.id,
            name: schema_3.category.name,
        },
        course: {
            id: schema_4.courses.id,
            name: schema_4.courses.name,
        },
        chapter: {
            id: schema_5.chapters.id,
            name: schema_5.chapters.name,
        },
        lesson: {
            id: schema_6.lessons.id,
            name: schema_6.lessons.name,
        },
    })
        .from(schema_1.quizzes)
        .leftJoin(schema_3.category, (0, drizzle_orm_1.eq)(schema_1.quizzes.categoryId, schema_3.category.id))
        .leftJoin(schema_4.courses, (0, drizzle_orm_1.eq)(schema_1.quizzes.courseId, schema_4.courses.id))
        .leftJoin(schema_5.chapters, (0, drizzle_orm_1.eq)(schema_1.quizzes.chapterId, schema_5.chapters.id))
        .leftJoin(schema_6.lessons, (0, drizzle_orm_1.eq)(schema_1.quizzes.lessonId, schema_6.lessons.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, quizId))
        .limit(1);
    const addedQuestions = await connection_1.db
        .select({
        id: schema_1.quizQuestions.id,
        questionOrder: schema_1.quizQuestions.questionOrder,
        question: {
            id: schema_2.questions.id,
            question: schema_2.questions.question,
            difficulty: schema_2.questions.difficulty,
            questionType: schema_2.questions.questionType,
        },
    })
        .from(schema_1.quizQuestions)
        .leftJoin(schema_2.questions, (0, drizzle_orm_1.eq)(schema_1.quizQuestions.questionId, schema_2.questions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, quizId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.quizQuestions.questionOrder));
    return (0, response_1.SuccessResponse)(res, {
        message: "Quiz created successfully",
        data: {
            ...newQuiz[0],
            questionsCount: addedQuestionsCount,
            questions: addedQuestions,
        }
    }, 201);
};
exports.createQuiz = createQuiz;
const getAllQuizzes = async (req, res) => {
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
        isActive: schema_1.quizzes.isActive,
        createdAt: schema_1.quizzes.createdAt,
        updatedAt: schema_1.quizzes.updatedAt,
        category: {
            id: schema_3.category.id,
            name: schema_3.category.name,
        },
        course: {
            id: schema_4.courses.id,
            name: schema_4.courses.name,
        },
        chapter: {
            id: schema_5.chapters.id,
            name: schema_5.chapters.name,
        },
        lesson: {
            id: schema_6.lessons.id,
            name: schema_6.lessons.name,
        },
    })
        .from(schema_1.quizzes)
        .leftJoin(schema_3.category, (0, drizzle_orm_1.eq)(schema_1.quizzes.categoryId, schema_3.category.id))
        .leftJoin(schema_4.courses, (0, drizzle_orm_1.eq)(schema_1.quizzes.courseId, schema_4.courses.id))
        .leftJoin(schema_5.chapters, (0, drizzle_orm_1.eq)(schema_1.quizzes.chapterId, schema_5.chapters.id))
        .leftJoin(schema_6.lessons, (0, drizzle_orm_1.eq)(schema_1.quizzes.lessonId, schema_6.lessons.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.quizzes.createdAt));
    const quizzesWithCount = await Promise.all(allQuizzes.map(async (quiz) => {
        const questionsCount = await connection_1.db
            .select()
            .from(schema_1.quizQuestions)
            .where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, quiz.id));
        return {
            ...quiz,
            questionsCount: questionsCount.length,
        };
    }));
    return (0, response_1.SuccessResponse)(res, {
        message: "Get all quizzes success",
        data: quizzesWithCount
    });
};
exports.getAllQuizzes = getAllQuizzes;
const getQuizById = async (req, res) => {
    const { id } = req.params;
    const quiz = await connection_1.db
        .select({
        id: schema_1.quizzes.id,
        title: schema_1.quizzes.title,
        description: schema_1.quizzes.description,
        durationHours: schema_1.quizzes.durationHours,
        durationMinutes: schema_1.quizzes.durationMinutes,
        totalScore: schema_1.quizzes.totalScore,
        passScore: schema_1.quizzes.passScore,
        quizOrder: schema_1.quizzes.quizOrder,
        isActive: schema_1.quizzes.isActive,
        categoryId: schema_1.quizzes.categoryId,
        courseId: schema_1.quizzes.courseId,
        chapterId: schema_1.quizzes.chapterId,
        lessonId: schema_1.quizzes.lessonId,
        createdAt: schema_1.quizzes.createdAt,
        updatedAt: schema_1.quizzes.updatedAt,
        category: {
            id: schema_3.category.id,
            name: schema_3.category.name,
        },
        course: {
            id: schema_4.courses.id,
            name: schema_4.courses.name,
        },
        chapter: {
            id: schema_5.chapters.id,
            name: schema_5.chapters.name,
        },
        lesson: {
            id: schema_6.lessons.id,
            name: schema_6.lessons.name,
        },
    })
        .from(schema_1.quizzes)
        .leftJoin(schema_3.category, (0, drizzle_orm_1.eq)(schema_1.quizzes.categoryId, schema_3.category.id))
        .leftJoin(schema_4.courses, (0, drizzle_orm_1.eq)(schema_1.quizzes.courseId, schema_4.courses.id))
        .leftJoin(schema_5.chapters, (0, drizzle_orm_1.eq)(schema_1.quizzes.chapterId, schema_5.chapters.id))
        .leftJoin(schema_6.lessons, (0, drizzle_orm_1.eq)(schema_1.quizzes.lessonId, schema_6.lessons.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, id))
        .limit(1);
    if (!quiz[0]) {
        throw new NotFound_1.NotFound("Quiz not found");
    }
    const quizQuestionsData = await connection_1.db
        .select({
        id: schema_1.quizQuestions.id,
        questionOrder: schema_1.quizQuestions.questionOrder,
        question: {
            id: schema_2.questions.id,
            question: schema_2.questions.question,
            image: schema_2.questions.image,
            answerType: schema_2.questions.answerType,
            difficulty: schema_2.questions.difficulty,
            questionType: schema_2.questions.questionType,
            year: schema_2.questions.year,
            month: schema_2.questions.month,
            section: schema_2.questions.sectionId,
        },
        chapter: {
            id: schema_5.chapters.id,
            name: schema_5.chapters.name,
        },
        lesson: {
            id: schema_6.lessons.id,
            name: schema_6.lessons.name,
        },
        code: {
            id: schema_7.examCodes.id,
            code: schema_7.examCodes.code,
        },
    })
        .from(schema_1.quizQuestions)
        .leftJoin(schema_2.questions, (0, drizzle_orm_1.eq)(schema_1.quizQuestions.questionId, schema_2.questions.id))
        .leftJoin(schema_6.lessons, (0, drizzle_orm_1.eq)(schema_2.questions.lessonId, schema_6.lessons.id))
        .leftJoin(schema_5.chapters, (0, drizzle_orm_1.eq)(schema_6.lessons.chapterId, schema_5.chapters.id))
        .leftJoin(schema_7.examCodes, (0, drizzle_orm_1.eq)(schema_2.questions.codeId, schema_7.examCodes.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, id))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.quizQuestions.questionOrder));
    return (0, response_1.SuccessResponse)(res, {
        message: "Get quiz success",
        data: {
            ...quiz[0],
            questionsCount: quizQuestionsData.length,
            questions: quizQuestionsData,
        }
    });
};
exports.getQuizById = getQuizById;
const updateQuiz = async (req, res) => {
    const { id } = req.params;
    const { title, description, durationHours, durationMinutes, totalScore, passScore, quizOrder, isActive, categoryId, courseId, chapterId, lessonId, questionIds, } = req.body;
    const existingQuiz = await connection_1.db
        .select()
        .from(schema_1.quizzes)
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, id))
        .limit(1);
    if (!existingQuiz[0]) {
        throw new NotFound_1.NotFound("Quiz not found");
    }
    await connection_1.db
        .update(schema_1.quizzes)
        .set({
        title: title ?? existingQuiz[0].title,
        description: description ?? existingQuiz[0].description,
        durationHours: durationHours ?? existingQuiz[0].durationHours,
        durationMinutes: durationMinutes ?? existingQuiz[0].durationMinutes,
        totalScore: totalScore ?? existingQuiz[0].totalScore,
        passScore: passScore ?? existingQuiz[0].passScore,
        quizOrder: quizOrder ?? existingQuiz[0].quizOrder,
        isActive: isActive ?? existingQuiz[0].isActive,
        categoryId: categoryId ?? existingQuiz[0].categoryId,
        courseId: courseId ?? existingQuiz[0].courseId,
        chapterId: chapterId ?? existingQuiz[0].chapterId,
        lessonId: lessonId ?? existingQuiz[0].lessonId,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, id));
    if (questionIds && Array.isArray(questionIds)) {
        await connection_1.db.delete(schema_1.quizQuestions).where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, id));
        for (let i = 0; i < questionIds.length; i++) {
            const questionId = questionIds[i];
            const questionExists = await connection_1.db
                .select()
                .from(schema_2.questions)
                .where((0, drizzle_orm_1.eq)(schema_2.questions.id, questionId))
                .limit(1);
            if (questionExists[0]) {
                await connection_1.db.insert(schema_1.quizQuestions).values({
                    id: (0, uuid_1.v4)(),
                    quizId: id,
                    questionId,
                    questionOrder: i + 1,
                });
            }
        }
    }
    const updatedQuiz = await connection_1.db
        .select({
        id: schema_1.quizzes.id,
        title: schema_1.quizzes.title,
        description: schema_1.quizzes.description,
        durationHours: schema_1.quizzes.durationHours,
        durationMinutes: schema_1.quizzes.durationMinutes,
        totalScore: schema_1.quizzes.totalScore,
        passScore: schema_1.quizzes.passScore,
        quizOrder: schema_1.quizzes.quizOrder,
        isActive: schema_1.quizzes.isActive,
        createdAt: schema_1.quizzes.createdAt,
        updatedAt: schema_1.quizzes.updatedAt,
        category: {
            id: schema_3.category.id,
            name: schema_3.category.name,
        },
        course: {
            id: schema_4.courses.id,
            name: schema_4.courses.name,
        },
        chapter: {
            id: schema_5.chapters.id,
            name: schema_5.chapters.name,
        },
        lesson: {
            id: schema_6.lessons.id,
            name: schema_6.lessons.name,
        },
    })
        .from(schema_1.quizzes)
        .leftJoin(schema_3.category, (0, drizzle_orm_1.eq)(schema_1.quizzes.categoryId, schema_3.category.id))
        .leftJoin(schema_4.courses, (0, drizzle_orm_1.eq)(schema_1.quizzes.courseId, schema_4.courses.id))
        .leftJoin(schema_5.chapters, (0, drizzle_orm_1.eq)(schema_1.quizzes.chapterId, schema_5.chapters.id))
        .leftJoin(schema_6.lessons, (0, drizzle_orm_1.eq)(schema_1.quizzes.lessonId, schema_6.lessons.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, id))
        .limit(1);
    const quizQuestionsData = await connection_1.db
        .select({
        id: schema_1.quizQuestions.id,
        questionOrder: schema_1.quizQuestions.questionOrder,
        question: {
            id: schema_2.questions.id,
            question: schema_2.questions.question,
            difficulty: schema_2.questions.difficulty,
            questionType: schema_2.questions.questionType,
        },
    })
        .from(schema_1.quizQuestions)
        .leftJoin(schema_2.questions, (0, drizzle_orm_1.eq)(schema_1.quizQuestions.questionId, schema_2.questions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, id))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.quizQuestions.questionOrder));
    return (0, response_1.SuccessResponse)(res, {
        message: "Quiz updated successfully",
        data: {
            ...updatedQuiz[0],
            questionsCount: quizQuestionsData.length,
            questions: quizQuestionsData,
        }
    });
};
exports.updateQuiz = updateQuiz;
const deleteQuiz = async (req, res) => {
    const { id } = req.params;
    const existingQuiz = await connection_1.db
        .select()
        .from(schema_1.quizzes)
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, id))
        .limit(1);
    if (!existingQuiz[0]) {
        throw new NotFound_1.NotFound("Quiz not found");
    }
    await connection_1.db.delete(schema_1.quizQuestions).where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, id));
    await connection_1.db.delete(schema_1.quizzes).where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, id));
    return (0, response_1.SuccessResponse)(res, {
        message: "Quiz deleted successfully"
    });
};
exports.deleteQuiz = deleteQuiz;
const toggleQuizActive = async (req, res) => {
    const { id } = req.params;
    const existingQuiz = await connection_1.db
        .select()
        .from(schema_1.quizzes)
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, id))
        .limit(1);
    if (!existingQuiz[0]) {
        throw new NotFound_1.NotFound("Quiz not found");
    }
    const newStatus = !existingQuiz[0].isActive;
    await connection_1.db
        .update(schema_1.quizzes)
        .set({ isActive: newStatus })
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, id));
    return (0, response_1.SuccessResponse)(res, {
        message: `Quiz ${newStatus ? "activated" : "deactivated"} successfully`,
        data: { isActive: newStatus }
    });
};
exports.toggleQuizActive = toggleQuizActive;
// Helper: Get lesson IDs based on selection
const getLessonIds = async (categoryId, courseId, chapterId, lessonId) => {
    if (lessonId) {
        return [lessonId];
    }
    let query = connection_1.db.select({ id: schema_6.lessons.id }).from(schema_6.lessons);
    if (chapterId) {
        const result = await query.where((0, drizzle_orm_1.eq)(schema_6.lessons.chapterId, chapterId));
        return result.map(l => l.id);
    }
    if (courseId) {
        const result = await query.where((0, drizzle_orm_1.eq)(schema_6.lessons.courseId, courseId));
        return result.map(l => l.id);
    }
    if (categoryId) {
        const result = await query.where((0, drizzle_orm_1.eq)(schema_6.lessons.categoryId, categoryId));
        return result.map(l => l.id);
    }
    return [];
};
const getQuestionsBank = async (req, res) => {
    const { categoryId, courseId, chapterId, lessonId, type, year, month, section, codeId, difficulty, page = 1, limit = 20 } = req.query;
    // Validation
    if (!categoryId && !courseId && !chapterId && !lessonId) {
        throw new BadRequest_1.BadRequest("Please select categoryId, courseId, chapterId, or lessonId");
    }
    // Get lesson IDs based on selection
    const lessonIds = await getLessonIds(categoryId, courseId, chapterId, lessonId);
    if (lessonIds.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
            message: "No lessons found for this selection",
            data: [],
            pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 }
        });
    }
    // Build conditions
    const conditions = [(0, drizzle_orm_1.inArray)(schema_2.questions.lessonId, lessonIds)];
    if (type)
        conditions.push((0, drizzle_orm_1.eq)(schema_2.questions.questionType, type));
    if (year)
        conditions.push((0, drizzle_orm_1.eq)(schema_2.questions.year, Number(year)));
    if (month)
        conditions.push((0, drizzle_orm_1.eq)(schema_2.questions.month, month));
    if (section)
        conditions.push((0, drizzle_orm_1.eq)(schema_2.questions.sectionId, section));
    if (codeId)
        conditions.push((0, drizzle_orm_1.eq)(schema_2.questions.codeId, codeId));
    if (difficulty)
        conditions.push((0, drizzle_orm_1.eq)(schema_2.questions.difficulty, difficulty));
    const offset = (Number(page) - 1) * Number(limit);
    // Get questions
    const allQuestions = await connection_1.db
        .select({
        id: schema_2.questions.id,
        question: schema_2.questions.question,
        image: schema_2.questions.image,
        answerType: schema_2.questions.answerType,
        difficulty: schema_2.questions.difficulty,
        questionType: schema_2.questions.questionType,
        year: schema_2.questions.year,
        month: schema_2.questions.month,
        section: schema_2.questions.sectionId,
        chapter: {
            id: schema_5.chapters.id,
            name: schema_5.chapters.name,
        },
        lesson: {
            id: schema_6.lessons.id,
            name: schema_6.lessons.name,
        },
        code: {
            id: schema_7.examCodes.id,
            code: schema_7.examCodes.code,
        },
    })
        .from(schema_2.questions)
        .leftJoin(schema_6.lessons, (0, drizzle_orm_1.eq)(schema_2.questions.lessonId, schema_6.lessons.id))
        .leftJoin(schema_5.chapters, (0, drizzle_orm_1.eq)(schema_6.lessons.chapterId, schema_5.chapters.id))
        .leftJoin(schema_7.examCodes, (0, drizzle_orm_1.eq)(schema_2.questions.codeId, schema_7.examCodes.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .limit(Number(limit))
        .offset(offset);
    // Get total count
    const totalCount = await connection_1.db
        .select({ id: schema_2.questions.id })
        .from(schema_2.questions)
        .where((0, drizzle_orm_1.and)(...conditions));
    return (0, response_1.SuccessResponse)(res, {
        message: "Get questions bank success",
        data: allQuestions,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount.length,
            totalPages: Math.ceil(totalCount.length / Number(limit))
        }
    });
};
exports.getQuestionsBank = getQuestionsBank;
const getFilterOptions = async (req, res) => {
    const codes = await connection_1.db.select().from(schema_7.examCodes);
    return (0, response_1.SuccessResponse)(res, {
        message: "Get filter options success",
        data: {
            types: ["Trail", "Extra"],
            years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
            months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            sections: ["1", "2", "3", "4"],
            difficulties: ["A", "B", "C", "D", "E"],
            codes: codes,
        }
    });
};
exports.getFilterOptions = getFilterOptions;
const getSelection = async (req, res) => {
    const { type, parentId } = req.query;
    if (!type) {
        throw new BadRequest_1.BadRequest("Type is required");
    }
    let data = [];
    switch (type) {
        case "categories":
            data = await connection_1.db
                .select({ id: schema_3.category.id, name: schema_3.category.name })
                .from(schema_3.category)
                .where((0, drizzle_orm_1.isNull)(schema_3.category.parentCategoryId));
            break;
        case "subCategories":
            if (!parentId) {
                throw new BadRequest_1.BadRequest("parentId is required for subCategories");
            }
            data = await connection_1.db
                .select({ id: schema_3.category.id, name: schema_3.category.name })
                .from(schema_3.category)
                .where((0, drizzle_orm_1.eq)(schema_3.category.parentCategoryId, parentId));
            break;
        case "courses":
            if (!parentId) {
                throw new BadRequest_1.BadRequest("parentId (categoryId) is required for courses");
            }
            data = await connection_1.db
                .select({ id: schema_4.courses.id, name: schema_4.courses.name })
                .from(schema_4.courses)
                .where((0, drizzle_orm_1.eq)(schema_4.courses.categoryId, parentId));
            break;
        case "chapters":
            if (!parentId) {
                throw new BadRequest_1.BadRequest("parentId (courseId) is required for chapters");
            }
            data = await connection_1.db
                .select({ id: schema_5.chapters.id, name: schema_5.chapters.name })
                .from(schema_5.chapters)
                .where((0, drizzle_orm_1.eq)(schema_5.chapters.courseId, parentId));
            break;
        case "lessons":
            if (!parentId) {
                throw new BadRequest_1.BadRequest("parentId (chapterId) is required for lessons");
            }
            data = await connection_1.db
                .select({ id: schema_6.lessons.id, name: schema_6.lessons.name })
                .from(schema_6.lessons)
                .where((0, drizzle_orm_1.eq)(schema_6.lessons.chapterId, parentId));
            break;
        default:
            throw new BadRequest_1.BadRequest("Invalid type. Use: categories, subCategories, courses, chapters, lessons");
    }
    return (0, response_1.SuccessResponse)(res, { data });
};
exports.getSelection = getSelection;
const getQuizzesByLessonId = async (req, res) => {
    const { id } = req.params;
    const lesson = await connection_1.db
        .select()
        .from(schema_6.lessons)
        .where((0, drizzle_orm_1.eq)(schema_6.lessons.id, id))
        .limit(1);
    if (!lesson[0]) {
        throw new NotFound_1.NotFound("Lesson not found");
    }
    const quizzesList = await connection_1.db
        .select({
        id: schema_1.quizzes.id,
        title: schema_1.quizzes.title,
        description: schema_1.quizzes.description,
        durationHours: schema_1.quizzes.durationHours,
        durationMinutes: schema_1.quizzes.durationMinutes,
        totalScore: schema_1.quizzes.totalScore,
        passScore: schema_1.quizzes.passScore,
        quizOrder: schema_1.quizzes.quizOrder,
        isActive: schema_1.quizzes.isActive,
        createdAt: schema_1.quizzes.createdAt,
        updatedAt: schema_1.quizzes.updatedAt,
        category: {
            id: schema_3.category.id,
            name: schema_3.category.name,
        },
        course: {
            id: schema_4.courses.id,
            name: schema_4.courses.name,
        },
        chapter: {
            id: schema_5.chapters.id,
            name: schema_5.chapters.name,
        },
        lesson: {
            id: schema_6.lessons.id,
            name: schema_6.lessons.name,
        },
    })
        .from(schema_1.quizzes)
        .leftJoin(schema_3.category, (0, drizzle_orm_1.eq)(schema_1.quizzes.categoryId, schema_3.category.id))
        .leftJoin(schema_4.courses, (0, drizzle_orm_1.eq)(schema_1.quizzes.courseId, schema_4.courses.id))
        .leftJoin(schema_5.chapters, (0, drizzle_orm_1.eq)(schema_1.quizzes.chapterId, schema_5.chapters.id))
        .leftJoin(schema_6.lessons, (0, drizzle_orm_1.eq)(schema_1.quizzes.lessonId, schema_6.lessons.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.lessonId, id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.quizzes.createdAt));
    const quizzesWithCount = await Promise.all(quizzesList.map(async (quiz) => {
        const questionsCount = await connection_1.db
            .select()
            .from(schema_1.quizQuestions)
            .where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, quiz.id));
        return {
            ...quiz,
            questionsCount: questionsCount.length,
        };
    }));
    return (0, response_1.SuccessResponse)(res, {
        message: "Get quizzes by lesson ID success",
        data: quizzesWithCount
    });
};
exports.getQuizzesByLessonId = getQuizzesByLessonId;
