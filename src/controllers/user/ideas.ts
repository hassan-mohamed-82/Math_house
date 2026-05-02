import { Request, Response } from "express";
import { db } from "../../models/connection";
import { eq, asc, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { lessons, lessonIdeas, quizzes, chapters } from "../../models/schema";
import { checkAccess } from "../../utils/accessControl";

export const getIdeasByLessonId = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const studentId = req.user.id;

    // 1. Get lesson info to check access
    const [lessonData] = await db
        .select({ 
            id: lessons.id,
            chapterId: lessons.chapterId,
            courseId: lessons.courseId
        })
        .from(lessons)
        .where(eq(lessons.id, lessonId));

    if (!lessonData) {
        throw new NotFound("Lesson not found");
    }

    // 2. Check access
    const hasAccess = await checkAccess(studentId, {
        lessonId: lessonId,
        chapterId: lessonData.chapterId,
        courseId: lessonData.courseId
    });

    if (!hasAccess) {
        throw new BadRequest("You do not have access to this lesson's content. Please purchase the lesson, chapter, or course.");
    }

    // 3. Fetch ideas
    const ideas = await db
        .select()
        .from(lessonIdeas)
        .where(eq(lessonIdeas.lessonId, lessonId))
        .orderBy(asc(lessonIdeas.ideaOrder));

    // 4. Fetch quizzes for this lesson
    const lessonQuizzes = await db
        .select({
            id: quizzes.id,
            title: quizzes.title,
            description: quizzes.description,
            durationHours: quizzes.durationHours,
            durationMinutes: quizzes.durationMinutes,
            totalScore: quizzes.totalScore,
            quizOrder: quizzes.quizOrder,
        })
        .from(quizzes)
        .where(eq(quizzes.lessonId, lessonId))
        .orderBy(asc(quizzes.quizOrder));

    return SuccessResponse(res, {
        message: "Lesson ideas and quizzes fetched successfully",
        ideas,
        quizzes: lessonQuizzes
    }, 200);
};

export const getIdeaById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const studentId = req.user.id;

    // 1. Fetch idea and its parent lesson info
    const [ideaData] = await db
        .select({
            idea: lessonIdeas,
            lesson: {
                id: lessons.id,
                chapterId: lessons.chapterId,
                courseId: lessons.courseId
            }
        })
        .from(lessonIdeas)
        .leftJoin(lessons, eq(lessonIdeas.lessonId, lessons.id))
        .where(eq(lessonIdeas.id, id));

    if (!ideaData) {
        throw new NotFound("Idea not found");
    }

    // 2. Check access
    const hasAccess = await checkAccess(studentId, {
        lessonId: ideaData.lesson?.id,
        chapterId: ideaData.lesson?.chapterId,
        courseId: ideaData.lesson?.courseId
    });

    if (!hasAccess) {
        throw new BadRequest("You do not have access to this idea. Please purchase the lesson, chapter, or course.");
    }

    return SuccessResponse(res, {
        message: "Idea fetched successfully",
        idea: ideaData.idea
    }, 200);
};

