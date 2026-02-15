import { Request, Response } from "express";
import { db } from "../../models/connection";
import { quizzes, quizQuestions } from "../../models/schema";
import { questions } from "../../models/schema";
import { category } from "../../models/schema";
import { courses } from "../../models/schema";
import { chapters } from "../../models/schema";
import { lessons } from "../../models/schema";
import { examCodes } from "../../models/schema";
import { eq, desc, asc, and, isNull, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import { v4 as uuidv4 } from "uuid";

export const createQuiz = async (req: Request, res: Response) => {
    const {
        title,
        description,
        durationHours,
        durationMinutes,
        totalScore,
        passScore,
        quizOrder,
        isActive,
        categoryId,
        courseId,
        chapterId,
        lessonId,
        questionIds,
    } = req.body;

    if (!title) {
        throw new BadRequest("Title is required");
    }

    const quizId = uuidv4();

    await db.insert(quizzes).values({
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

            const questionExists = await db
                .select()
                .from(questions)
                .where(eq(questions.id, questionId))
                .limit(1);

            if (questionExists[0]) {
                await db.insert(quizQuestions).values({
                    id: uuidv4(),
                    quizId,
                    questionId,
                    questionOrder: i + 1,
                });
                addedQuestionsCount++;
            }
        }
    }

    const newQuiz = await db
        .select({
            id: quizzes.id,
            title: quizzes.title,
            description: quizzes.description,
            durationHours: quizzes.durationHours,
            durationMinutes: quizzes.durationMinutes,
            totalScore: quizzes.totalScore,
            passScore: quizzes.passScore,
            quizOrder: quizzes.quizOrder,
            isActive: quizzes.isActive,
            createdAt: quizzes.createdAt,
            category: {
                id: category.id,
                name: category.name,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            lesson: {
                id: lessons.id,
                name: lessons.name,
            },
        })
        .from(quizzes)
        .leftJoin(category, eq(quizzes.categoryId, category.id))
        .leftJoin(courses, eq(quizzes.courseId, courses.id))
        .leftJoin(chapters, eq(quizzes.chapterId, chapters.id))
        .leftJoin(lessons, eq(quizzes.lessonId, lessons.id))
        .where(eq(quizzes.id, quizId))
        .limit(1);

    const addedQuestions = await db
        .select({
            id: quizQuestions.id,
            questionOrder: quizQuestions.questionOrder,
            question: {
                id: questions.id,
                question: questions.question,
                difficulty: questions.difficulty,
                questionType: questions.questionType,
            },
        })
        .from(quizQuestions)
        .leftJoin(questions, eq(quizQuestions.questionId, questions.id))
        .where(eq(quizQuestions.quizId, quizId))
        .orderBy(asc(quizQuestions.questionOrder));

    return SuccessResponse(res, {
        message: "Quiz created successfully",
        data: {
            ...newQuiz[0],
            questionsCount: addedQuestionsCount,
            questions: addedQuestions,
        }
    }, 201);
};

export const getAllQuizzes = async (req: Request, res: Response) => {
    const allQuizzes = await db
        .select({
            id: quizzes.id,
            title: quizzes.title,
            description: quizzes.description,
            durationHours: quizzes.durationHours,
            durationMinutes: quizzes.durationMinutes,
            totalScore: quizzes.totalScore,
            passScore: quizzes.passScore,
            quizOrder: quizzes.quizOrder,
            isActive: quizzes.isActive,
            createdAt: quizzes.createdAt,
            updatedAt: quizzes.updatedAt,
            category: {
                id: category.id,
                name: category.name,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            lesson: {
                id: lessons.id,
                name: lessons.name,
            },
        })
        .from(quizzes)
        .leftJoin(category, eq(quizzes.categoryId, category.id))
        .leftJoin(courses, eq(quizzes.courseId, courses.id))
        .leftJoin(chapters, eq(quizzes.chapterId, chapters.id))
        .leftJoin(lessons, eq(quizzes.lessonId, lessons.id))
        .orderBy(desc(quizzes.createdAt));

    const quizzesWithCount = await Promise.all(
        allQuizzes.map(async (quiz) => {
            const questionsCount = await db
                .select()
                .from(quizQuestions)
                .where(eq(quizQuestions.quizId, quiz.id));

            return {
                ...quiz,
                questionsCount: questionsCount.length,
            };
        })
    );

    return SuccessResponse(res, {
        message: "Get all quizzes success",
        data: quizzesWithCount
    });
};

export const getQuizById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const quiz = await db
        .select({
            id: quizzes.id,
            title: quizzes.title,
            description: quizzes.description,
            durationHours: quizzes.durationHours,
            durationMinutes: quizzes.durationMinutes,
            totalScore: quizzes.totalScore,
            passScore: quizzes.passScore,
            quizOrder: quizzes.quizOrder,
            isActive: quizzes.isActive,
            categoryId: quizzes.categoryId,
            courseId: quizzes.courseId,
            chapterId: quizzes.chapterId,
            lessonId: quizzes.lessonId,
            createdAt: quizzes.createdAt,
            updatedAt: quizzes.updatedAt,
            category: {
                id: category.id,
                name: category.name,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            lesson: {
                id: lessons.id,
                name: lessons.name,
            },
        })
        .from(quizzes)
        .leftJoin(category, eq(quizzes.categoryId, category.id))
        .leftJoin(courses, eq(quizzes.courseId, courses.id))
        .leftJoin(chapters, eq(quizzes.chapterId, chapters.id))
        .leftJoin(lessons, eq(quizzes.lessonId, lessons.id))
        .where(eq(quizzes.id, id))
        .limit(1);

    if (!quiz[0]) {
        throw new NotFound("Quiz not found");
    }

    const quizQuestionsData = await db
        .select({
            id: quizQuestions.id,
            questionOrder: quizQuestions.questionOrder,
            question: {
                id: questions.id,
                question: questions.question,
                image: questions.image,
                answerType: questions.answerType,
                difficulty: questions.difficulty,
                questionType: questions.questionType,
                year: questions.year,
                month: questions.month,
                section: questions.section,
            },
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            lesson: {
                id: lessons.id,
                name: lessons.name,
            },
            code: {
                id: examCodes.id,
                code: examCodes.code,
            },
        })
        .from(quizQuestions)
        .leftJoin(questions, eq(quizQuestions.questionId, questions.id))
        .leftJoin(lessons, eq(questions.lessonId, lessons.id))
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(examCodes, eq(questions.codeId, examCodes.id))
        .where(eq(quizQuestions.quizId, id))
        .orderBy(asc(quizQuestions.questionOrder));

    return SuccessResponse(res, {
        message: "Get quiz success",
        data: {
            ...quiz[0],
            questionsCount: quizQuestionsData.length,
            questions: quizQuestionsData,
        }
    });
};

export const updateQuiz = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        title,
        description,
        durationHours,
        durationMinutes,
        totalScore,
        passScore,
        quizOrder,
        isActive,
        categoryId,
        courseId,
        chapterId,
        lessonId,
        questionIds,
    } = req.body;

    const existingQuiz = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.id, id))
        .limit(1);

    if (!existingQuiz[0]) {
        throw new NotFound("Quiz not found");
    }

    await db
        .update(quizzes)
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
        .where(eq(quizzes.id, id));

    if (questionIds && Array.isArray(questionIds)) {
        await db.delete(quizQuestions).where(eq(quizQuestions.quizId, id));

        for (let i = 0; i < questionIds.length; i++) {
            const questionId = questionIds[i];

            const questionExists = await db
                .select()
                .from(questions)
                .where(eq(questions.id, questionId))
                .limit(1);

            if (questionExists[0]) {
                await db.insert(quizQuestions).values({
                    id: uuidv4(),
                    quizId: id,
                    questionId,
                    questionOrder: i + 1,
                });
            }
        }
    }

    const updatedQuiz = await db
        .select({
            id: quizzes.id,
            title: quizzes.title,
            description: quizzes.description,
            durationHours: quizzes.durationHours,
            durationMinutes: quizzes.durationMinutes,
            totalScore: quizzes.totalScore,
            passScore: quizzes.passScore,
            quizOrder: quizzes.quizOrder,
            isActive: quizzes.isActive,
            createdAt: quizzes.createdAt,
            updatedAt: quizzes.updatedAt,
            category: {
                id: category.id,
                name: category.name,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            lesson: {
                id: lessons.id,
                name: lessons.name,
            },
        })
        .from(quizzes)
        .leftJoin(category, eq(quizzes.categoryId, category.id))
        .leftJoin(courses, eq(quizzes.courseId, courses.id))
        .leftJoin(chapters, eq(quizzes.chapterId, chapters.id))
        .leftJoin(lessons, eq(quizzes.lessonId, lessons.id))
        .where(eq(quizzes.id, id))
        .limit(1);

    const quizQuestionsData = await db
        .select({
            id: quizQuestions.id,
            questionOrder: quizQuestions.questionOrder,
            question: {
                id: questions.id,
                question: questions.question,
                difficulty: questions.difficulty,
                questionType: questions.questionType,
            },
        })
        .from(quizQuestions)
        .leftJoin(questions, eq(quizQuestions.questionId, questions.id))
        .where(eq(quizQuestions.quizId, id))
        .orderBy(asc(quizQuestions.questionOrder));

    return SuccessResponse(res, {
        message: "Quiz updated successfully",
        data: {
            ...updatedQuiz[0],
            questionsCount: quizQuestionsData.length,
            questions: quizQuestionsData,
        }
    });
};

export const deleteQuiz = async (req: Request, res: Response) => {
    const { id } = req.params;

    const existingQuiz = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.id, id))
        .limit(1);

    if (!existingQuiz[0]) {
        throw new NotFound("Quiz not found");
    }

    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, id));
    await db.delete(quizzes).where(eq(quizzes.id, id));

    return SuccessResponse(res, {
        message: "Quiz deleted successfully"
    });
};

export const toggleQuizActive = async (req: Request, res: Response) => {
    const { id } = req.params;

    const existingQuiz = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.id, id))
        .limit(1);

    if (!existingQuiz[0]) {
        throw new NotFound("Quiz not found");
    }

    const newStatus = !existingQuiz[0].isActive;

    await db
        .update(quizzes)
        .set({ isActive: newStatus })
        .where(eq(quizzes.id, id));

    return SuccessResponse(res, {
        message: `Quiz ${newStatus ? "activated" : "deactivated"} successfully`,
        data: { isActive: newStatus }
    });
}

// Helper: Get lesson IDs based on selection
const getLessonIds = async (
    categoryId?: string,
    courseId?: string,
    chapterId?: string,
    lessonId?: string
): Promise<string[]> => {
    if (lessonId) {
        return [lessonId];
    }

    let query = db.select({ id: lessons.id }).from(lessons);

    if (chapterId) {
        const result = await query.where(eq(lessons.chapterId, chapterId));
        return result.map(l => l.id);
    }

    if (courseId) {
        const result = await query.where(eq(lessons.courseId, courseId));
        return result.map(l => l.id);
    }

    if (categoryId) {
        const result = await query.where(eq(lessons.categoryId, categoryId));
        return result.map(l => l.id);
    }

    return [];
};

export const getQuestionsBank = async (req: Request, res: Response) => {
    const {
        categoryId,
        courseId,
        chapterId,
        lessonId,
        type,
        year,
        month,
        section,
        codeId,
        difficulty,
        page = 1,
        limit = 20
    } = req.query;

    // Validation
    if (!categoryId && !courseId && !chapterId && !lessonId) {
        throw new BadRequest("Please select categoryId, courseId, chapterId, or lessonId");
    }

    // Get lesson IDs based on selection
    const lessonIds = await getLessonIds(
        categoryId as string,
        courseId as string,
        chapterId as string,
        lessonId as string
    );

    if (lessonIds.length === 0) {
        return SuccessResponse(res, {
            message: "No lessons found for this selection",
            data: [],
            pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 }
        });
    }

    // Build conditions
    const conditions: any[] = [inArray(questions.lessonId, lessonIds)];

    if (type) conditions.push(eq(questions.questionType, type as any));
    if (year) conditions.push(eq(questions.year, Number(year)));
    if (month) conditions.push(eq(questions.month, month as any));
    if (section) conditions.push(eq(questions.section, section as any));
    if (codeId) conditions.push(eq(questions.codeId, codeId as string));
    if (difficulty) conditions.push(eq(questions.difficulty, difficulty as any));

    const offset = (Number(page) - 1) * Number(limit);

    // Get questions
    const allQuestions = await db
        .select({
            id: questions.id,
            question: questions.question,
            image: questions.image,
            answerType: questions.answerType,
            difficulty: questions.difficulty,
            questionType: questions.questionType,
            year: questions.year,
            month: questions.month,
            section: questions.section,
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            lesson: {
                id: lessons.id,
                name: lessons.name,
            },
            code: {
                id: examCodes.id,
                code: examCodes.code,
            },
        })
        .from(questions)
        .leftJoin(lessons, eq(questions.lessonId, lessons.id))
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(examCodes, eq(questions.codeId, examCodes.id))
        .where(and(...conditions))
        .limit(Number(limit))
        .offset(offset);

    // Get total count
    const totalCount = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(...conditions));

    return SuccessResponse(res, {
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

export const getFilterOptions = async (req: Request, res: Response) => {
    const codes = await db.select().from(examCodes);

    return SuccessResponse(res, {
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


export const getSelection = async (req: Request, res: Response) => {
    const { type, parentId } = req.query;

    if (!type) {
        throw new BadRequest("Type is required");
    }

    let data: any[] = [];

    switch (type) {
        case "categories":
            data = await db
                .select({ id: category.id, name: category.name })
                .from(category)
                .where(isNull(category.parentCategoryId));
            break;

        case "subCategories":
            if (!parentId) {
                throw new BadRequest("parentId is required for subCategories");
            }
            data = await db
                .select({ id: category.id, name: category.name })
                .from(category)
                .where(eq(category.parentCategoryId, parentId as string));
            break;

        case "courses":
            if (!parentId) {
                throw new BadRequest("parentId (categoryId) is required for courses");
            }
            data = await db
                .select({ id: courses.id, name: courses.name })
                .from(courses)
                .where(eq(courses.categoryId, parentId as string));
            break;

        case "chapters":
            if (!parentId) {
                throw new BadRequest("parentId (courseId) is required for chapters");
            }
            data = await db
                .select({ id: chapters.id, name: chapters.name })
                .from(chapters)
                .where(eq(chapters.courseId, parentId as string));
            break;

        case "lessons":
            if (!parentId) {
                throw new BadRequest("parentId (chapterId) is required for lessons");
            }
            data = await db
                .select({ id: lessons.id, name: lessons.name })
                .from(lessons)
                .where(eq(lessons.chapterId, parentId as string));
            break;

        default:
            throw new BadRequest("Invalid type. Use: categories, subCategories, courses, chapters, lessons");
    }

    return SuccessResponse(res, { data });
};