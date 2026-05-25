"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIdeaById = exports.getIdeasByLessonId = void 0;
const connection_1 = require("../../models/connection");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const schema_1 = require("../../models/schema");
const accessControl_1 = require("../../utils/accessControl");
const getIdeasByLessonId = async (req, res) => {
    const { lessonId } = req.params;
    const studentId = req.user.id;
    // 1. Get lesson info to check access
    const [lessonData] = await connection_1.db
        .select({
        id: schema_1.lessons.id,
        chapterId: schema_1.lessons.chapterId,
        courseId: schema_1.lessons.courseId
    })
        .from(schema_1.lessons)
        .where((0, drizzle_orm_1.eq)(schema_1.lessons.id, lessonId));
    if (!lessonData) {
        throw new Errors_1.NotFound("Lesson not found");
    }
    // 2. Check access
    const hasAccess = await (0, accessControl_1.checkAccess)(studentId, {
        lessonId: lessonId,
        chapterId: lessonData.chapterId,
        courseId: lessonData.courseId
    });
    if (!hasAccess) {
        throw new Errors_1.BadRequest("You do not have access to this lesson's content. Please purchase the lesson, chapter, or course.");
    }
    // 3. Fetch ideas
    const ideas = await connection_1.db
        .select()
        .from(schema_1.lessonIdeas)
        .where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, lessonId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.lessonIdeas.ideaOrder));
    // 4. Fetch quizzes for this lesson
    const lessonQuizzes = await connection_1.db
        .select({
        id: schema_1.quizzes.id,
        title: schema_1.quizzes.title,
        description: schema_1.quizzes.description,
        durationHours: schema_1.quizzes.durationHours,
        durationMinutes: schema_1.quizzes.durationMinutes,
        totalScore: schema_1.quizzes.totalScore,
        quizOrder: schema_1.quizzes.quizOrder,
    })
        .from(schema_1.quizzes)
        .where((0, drizzle_orm_1.eq)(schema_1.quizzes.lessonId, lessonId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.quizzes.quizOrder));
    return (0, response_1.SuccessResponse)(res, {
        message: "Lesson ideas and quizzes fetched successfully",
        ideas,
        quizzes: lessonQuizzes
    }, 200);
};
exports.getIdeasByLessonId = getIdeasByLessonId;
const getIdeaById = async (req, res) => {
    const { id } = req.params;
    const studentId = req.user.id;
    // 1. Fetch idea and its parent lesson info
    const [ideaData] = await connection_1.db
        .select({
        idea: schema_1.lessonIdeas,
        lesson: {
            id: schema_1.lessons.id,
            chapterId: schema_1.lessons.chapterId,
            courseId: schema_1.lessons.courseId
        }
    })
        .from(schema_1.lessonIdeas)
        .leftJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, schema_1.lessons.id))
        .where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.id, id));
    if (!ideaData) {
        throw new Errors_1.NotFound("Idea not found");
    }
    // 2. Check access
    const hasAccess = await (0, accessControl_1.checkAccess)(studentId, {
        lessonId: ideaData.lesson?.id,
        chapterId: ideaData.lesson?.chapterId,
        courseId: ideaData.lesson?.courseId
    });
    if (!hasAccess) {
        throw new Errors_1.BadRequest("You do not have access to this idea. Please purchase the lesson, chapter, or course.");
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Idea fetched successfully",
        idea: ideaData.idea
    }, 200);
};
exports.getIdeaById = getIdeaById;
