"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLessonIdea = exports.updateLessonIdea = exports.swapIdeaOrder = exports.getIdeasByLessonId = exports.createLessonIdea = exports.deleteLesson = exports.updateLesson = exports.swapLessonOrder = exports.getLessonsByChapterId = exports.getAllLessons = exports.getLessonById = exports.createLesson = void 0;
const connection_1 = require("../../models/connection");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const schema_1 = require("../../models/schema");
const handleImages_1 = require("../../utils/handleImages");
const lessonDetailedQuery = () => connection_1.db.select({
    lesson: {
        id: schema_1.lessons.id,
        name: schema_1.lessons.name,
        description: schema_1.lessons.description,
        image: schema_1.lessons.image,
        preRequisition: schema_1.lessons.preRequisition,
        whatYouGain: schema_1.lessons.whatYouGain,
        price: schema_1.lessons.price,
        discount: schema_1.lessons.discount,
        totalPrice: schema_1.lessons.totalPrice,
        order: schema_1.lessons.order,
        createdAt: schema_1.lessons.createdAt,
        updatedAt: schema_1.lessons.updatedAt,
    },
    chapter: {
        id: schema_1.chapters.id,
        name: schema_1.chapters.name,
        description: schema_1.chapters.description,
        image: schema_1.chapters.image,
    },
    course: {
        id: schema_1.courses.id,
        name: schema_1.courses.name,
        description: schema_1.courses.description,
        image: schema_1.courses.image,
    },
    category: {
        id: schema_1.category.id,
        name: schema_1.category.name,
        description: schema_1.category.description,
        image: schema_1.category.image,
    },
    teacher: {
        id: schema_1.teachers.id,
        name: schema_1.teachers.name,
        email: schema_1.teachers.email,
        avatar: schema_1.teachers.avatar,
    },
})
    .from(schema_1.lessons)
    .leftJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
    .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.lessons.courseId, schema_1.courses.id))
    .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.lessons.categoryId, schema_1.category.id))
    .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.lessons.teacherId, schema_1.teachers.id));
const createLesson = async (req, res) => {
    const { name, chapterId, description, image, teacherId, preRequisition, whatYouGain, price, discount } = req.body;
    if (!name || !chapterId || !teacherId || !price) {
        throw new BadRequest_1.BadRequest("Name, Chapter ID, Teacher ID and Price are required");
    }
    // Validate chapter and derive courseId & categoryId
    const [existingChapter] = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, chapterId));
    if (!existingChapter) {
        throw new Errors_1.NotFound("Chapter not found");
    }
    const courseId = existingChapter.courseId;
    const categoryId = existingChapter.categoryId;
    // Validate teacher
    const [existingTeacher] = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId));
    if (!existingTeacher) {
        throw new Errors_1.NotFound("Teacher not found");
    }
    // Check for duplicate name within the same chapter
    const duplicate = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, chapterId), (0, drizzle_orm_1.eq)(schema_1.lessons.name, name)));
    if (duplicate.length > 0) {
        throw new BadRequest_1.BadRequest("A lesson with this name already exists in this chapter");
    }
    // Auto-compute order: MAX(order) + 1 for this chapter
    const [maxOrderResult] = await connection_1.db.select({ maxOrder: (0, drizzle_orm_1.max)(schema_1.lessons.order) }).from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, chapterId));
    const nextOrder = (maxOrderResult?.maxOrder ?? 0) + 1;
    // Handle image
    let imageURL;
    if (image) {
        imageURL = await (0, handleImages_1.validateAndSaveLogo)(req, image, "lessons");
    }
    await connection_1.db.insert(schema_1.lessons).values({
        name,
        chapterId,
        courseId,
        categoryId,
        teacherId,
        description,
        image: imageURL,
        preRequisition,
        whatYouGain,
        price,
        discount,
        order: nextOrder,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Lesson created successfully", order: nextOrder }, 200);
};
exports.createLesson = createLesson;
const getLessonById = async (req, res) => {
    const { id } = req.params;
    const result = await lessonDetailedQuery().where((0, drizzle_orm_1.eq)(schema_1.lessons.id, id));
    if (result.length === 0) {
        throw new Errors_1.NotFound("Lesson not found");
    }
    // Fetch ideas for this lesson
    const ideas = await connection_1.db.select().from(schema_1.lessonIdeas)
        .where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, id))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.lessonIdeas.ideaOrder));
    return (0, response_1.SuccessResponse)(res, { message: "Lesson fetched successfully", ...result[0], ideas }, 200);
};
exports.getLessonById = getLessonById;
const getAllLessons = async (req, res) => {
    // Fetch all lessons with details, ordered by chapter then lesson order
    const allLessons = await lessonDetailedQuery().orderBy((0, drizzle_orm_1.asc)(schema_1.lessons.order));
    // Group lessons by chapter
    const chapterMap = new Map();
    for (const row of allLessons) {
        const chapterId = row.chapter?.id;
        if (!chapterId)
            continue;
        if (!chapterMap.has(chapterId)) {
            chapterMap.set(chapterId, {
                chapter: row.chapter,
                lessons: [],
            });
        }
        chapterMap.get(chapterId).lessons.push({
            ...row.lesson,
            course: row.course,
            category: row.category,
            teacher: row.teacher,
        });
    }
    // Fetch ideas for each lesson and nest them
    const result = await Promise.all(Array.from(chapterMap.values()).map(async (group) => {
        const lessonsWithIdeas = await Promise.all(group.lessons.map(async (lesson) => {
            const ideas = await connection_1.db.select().from(schema_1.lessonIdeas)
                .where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, lesson.id))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.lessonIdeas.ideaOrder));
            return { ...lesson, ideas };
        }));
        return { chapter: group.chapter, lessons: lessonsWithIdeas };
    }));
    return (0, response_1.SuccessResponse)(res, { message: "Lessons fetched successfully", chapters: result }, 200);
};
exports.getAllLessons = getAllLessons;
const getLessonsByChapterId = async (req, res) => {
    const { chapterId } = req.params;
    const allLessons = await lessonDetailedQuery()
        .where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, chapterId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.lessons.order));
    const lessonsWithIdeas = await Promise.all(allLessons.map(async (lessonRow) => {
        const ideas = await connection_1.db.select().from(schema_1.lessonIdeas)
            .where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, lessonRow.lesson.id))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.lessonIdeas.ideaOrder));
        return { ...lessonRow, ideas };
    }));
    return (0, response_1.SuccessResponse)(res, { message: "Lessons fetched successfully", lessons: lessonsWithIdeas }, 200);
};
exports.getLessonsByChapterId = getLessonsByChapterId;
const swapLessonOrder = async (req, res) => {
    const { lessonIdA, lessonIdB } = req.body;
    if (!lessonIdA || !lessonIdB) {
        throw new BadRequest_1.BadRequest("lessonIdA and lessonIdB are required");
    }
    const [lessonA] = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, lessonIdA));
    const [lessonB] = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, lessonIdB));
    if (!lessonA || !lessonB) {
        throw new Errors_1.NotFound("One or both lessons not found");
    }
    if (lessonA.chapterId !== lessonB.chapterId) {
        throw new BadRequest_1.BadRequest("Both lessons must belong to the same chapter");
    }
    // Swap orders
    await connection_1.db.update(schema_1.lessons).set({ order: lessonB.order }).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, lessonIdA));
    await connection_1.db.update(schema_1.lessons).set({ order: lessonA.order }).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, lessonIdB));
    return (0, response_1.SuccessResponse)(res, { message: "Lesson order swapped successfully" }, 200);
};
exports.swapLessonOrder = swapLessonOrder;
const updateLesson = async (req, res) => {
    const { id } = req.params;
    const { name, chapterId, description, image, teacherId, preRequisition, whatYouGain, price, discount } = req.body;
    const [existingLesson] = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, id));
    if (!existingLesson) {
        throw new Errors_1.NotFound("Lesson not found");
    }
    // If name is being changed within the same chapter, check for duplicates
    const effectiveChapterId = chapterId ?? existingLesson.chapterId;
    if (name && name !== existingLesson.name) {
        const duplicate = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, effectiveChapterId), (0, drizzle_orm_1.eq)(schema_1.lessons.name, name)));
        if (duplicate.length > 0) {
            throw new BadRequest_1.BadRequest("A lesson with this name already exists in this chapter");
        }
    }
    // If chapterId is changing, validate and derive new courseId & categoryId
    let categoryId = existingLesson.categoryId;
    let courseId = existingLesson.courseId;
    if (chapterId && chapterId !== existingLesson.chapterId) {
        const [chapter] = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, chapterId));
        if (!chapter) {
            throw new Errors_1.NotFound("Chapter not found");
        }
        courseId = chapter.courseId;
        categoryId = chapter.categoryId;
    }
    // If teacherId is changing, validate
    if (teacherId && teacherId !== existingLesson.teacherId) {
        const [teacher] = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId));
        if (!teacher) {
            throw new Errors_1.NotFound("Teacher not found");
        }
    }
    // Handle image update
    const updatedImage = await (0, handleImages_1.handleImageUpdate)(req, existingLesson.image, image, "lessons");
    await connection_1.db.update(schema_1.lessons).set({
        name: name ?? existingLesson.name,
        chapterId: chapterId ?? existingLesson.chapterId,
        courseId,
        categoryId,
        teacherId: teacherId ?? existingLesson.teacherId,
        description: description !== undefined ? description : existingLesson.description,
        image: updatedImage ?? existingLesson.image,
        preRequisition: preRequisition !== undefined ? preRequisition : existingLesson.preRequisition,
        whatYouGain: whatYouGain !== undefined ? whatYouGain : existingLesson.whatYouGain,
        price: price ?? existingLesson.price,
        discount: discount !== undefined ? discount : existingLesson.discount,
    }).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Lesson updated successfully" }, 200);
};
exports.updateLesson = updateLesson;
const deleteLesson = async (req, res) => {
    const { id } = req.params;
    const [existingLesson] = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, id));
    if (!existingLesson) {
        throw new Errors_1.NotFound("Lesson not found");
    }
    const deletedOrder = existingLesson.order;
    const parentChapterId = existingLesson.chapterId;
    // Cascade: delete all ideas under this lesson
    await connection_1.db.delete(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, id));
    // Delete lesson image if exists
    if (existingLesson.image) {
        await (0, handleImages_1.deleteImage)(existingLesson.image);
    }
    await connection_1.db.delete(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, id));
    // Re-sequence: decrement order for all lessons after the deleted one in the same chapter
    await connection_1.db.update(schema_1.lessons)
        .set({ order: (0, drizzle_orm_1.sql) `${schema_1.lessons.order} - 1` })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, parentChapterId), (0, drizzle_orm_1.gt)(schema_1.lessons.order, deletedOrder)));
    return (0, response_1.SuccessResponse)(res, { message: "Lesson deleted successfully" }, 200);
};
exports.deleteLesson = deleteLesson;
// Lesson Ideas
const createLessonIdea = async (req, res) => {
    const { lessonId, idea, pdf, video } = req.body;
    if (!lessonId || !idea) {
        throw new BadRequest_1.BadRequest("Lesson ID and Idea are required");
    }
    // Validate lesson exists
    const [existingLesson] = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, lessonId));
    if (!existingLesson) {
        throw new Errors_1.NotFound("Lesson not found");
    }
    // Auto-compute ideaOrder: MAX(ideaOrder) + 1 for this lesson
    const [maxOrderResult] = await connection_1.db.select({ maxOrder: (0, drizzle_orm_1.max)(schema_1.lessonIdeas.ideaOrder) }).from(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, lessonId));
    const nextOrder = (maxOrderResult?.maxOrder ?? 0) + 1;
    await connection_1.db.insert(schema_1.lessonIdeas).values({
        lessonId,
        idea,
        ideaOrder: nextOrder,
        pdf,
        video,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Lesson idea created successfully", ideaOrder: nextOrder }, 200);
};
exports.createLessonIdea = createLessonIdea;
const getIdeasByLessonId = async (req, res) => {
    const { lessonId } = req.params;
    const ideas = await connection_1.db.select().from(schema_1.lessonIdeas)
        .where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, lessonId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.lessonIdeas.ideaOrder));
    return (0, response_1.SuccessResponse)(res, { message: "Lesson ideas fetched successfully", ideas }, 200);
};
exports.getIdeasByLessonId = getIdeasByLessonId;
const swapIdeaOrder = async (req, res) => {
    const { ideaIdA, ideaIdB } = req.body;
    if (!ideaIdA || !ideaIdB) {
        throw new BadRequest_1.BadRequest("ideaIdA and ideaIdB are required");
    }
    const [ideaA] = await connection_1.db.select().from(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.id, ideaIdA));
    const [ideaB] = await connection_1.db.select().from(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.id, ideaIdB));
    if (!ideaA || !ideaB) {
        throw new Errors_1.NotFound("One or both ideas not found");
    }
    if (ideaA.lessonId !== ideaB.lessonId) {
        throw new BadRequest_1.BadRequest("Both ideas must belong to the same lesson");
    }
    // Swap orders
    await connection_1.db.update(schema_1.lessonIdeas).set({ ideaOrder: ideaB.ideaOrder }).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.id, ideaIdA));
    await connection_1.db.update(schema_1.lessonIdeas).set({ ideaOrder: ideaA.ideaOrder }).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.id, ideaIdB));
    return (0, response_1.SuccessResponse)(res, { message: "Idea order swapped successfully" }, 200);
};
exports.swapIdeaOrder = swapIdeaOrder;
const updateLessonIdea = async (req, res) => {
    const { id } = req.params;
    const { idea, pdf, video } = req.body;
    const [existingIdea] = await connection_1.db.select().from(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.id, id));
    if (!existingIdea) {
        throw new Errors_1.NotFound("Lesson idea not found");
    }
    await connection_1.db.update(schema_1.lessonIdeas).set({
        idea: idea ?? existingIdea.idea,
        pdf: pdf !== undefined ? pdf : existingIdea.pdf,
        video: video !== undefined ? video : existingIdea.video,
    }).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Lesson idea updated successfully" }, 200);
};
exports.updateLessonIdea = updateLessonIdea;
const deleteLessonIdea = async (req, res) => {
    const { id } = req.params;
    const [existingIdea] = await connection_1.db.select().from(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.id, id));
    if (!existingIdea) {
        throw new Errors_1.NotFound("Lesson idea not found");
    }
    const deletedOrder = existingIdea.ideaOrder;
    const parentLessonId = existingIdea.lessonId;
    await connection_1.db.delete(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.id, id));
    // Re-sequence: decrement ideaOrder for all ideas after the deleted one in the same lesson
    await connection_1.db.update(schema_1.lessonIdeas)
        .set({ ideaOrder: (0, drizzle_orm_1.sql) `${schema_1.lessonIdeas.ideaOrder} - 1` })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, parentLessonId), (0, drizzle_orm_1.gt)(schema_1.lessonIdeas.ideaOrder, deletedOrder)));
    return (0, response_1.SuccessResponse)(res, { message: "Lesson idea deleted successfully" }, 200);
};
exports.deleteLessonIdea = deleteLessonIdea;
