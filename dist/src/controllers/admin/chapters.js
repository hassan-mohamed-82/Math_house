"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChapter = exports.updateChapter = exports.swapChapterOrder = exports.getAllChaptersByCourseId = exports.getAllChapters = exports.getChapterById = exports.createChapter = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
// Shared detailed select with joins for chapters
const chapterDetailedQuery = () => connection_1.db.select({
    chapter: {
        id: schema_1.chapters.id,
        name: schema_1.chapters.name,
        description: schema_1.chapters.description,
        image: schema_1.chapters.image,
        preRequisition: schema_1.chapters.preRequisition,
        whatYouGain: schema_1.chapters.whatYouGain,
        duration: schema_1.chapters.duration,
        price: schema_1.chapters.price,
        discount: schema_1.chapters.discount,
        totalPrice: schema_1.chapters.totalPrice,
        order: schema_1.chapters.order,
        createdAt: schema_1.chapters.createdAt,
        updatedAt: schema_1.chapters.updatedAt,
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
    .from(schema_1.chapters)
    .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, schema_1.courses.id))
    .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.chapters.categoryId, schema_1.category.id))
    .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.chapters.teacherId, schema_1.teachers.id));
const createChapter = async (req, res) => {
    const { name, courseId, description, image, teacherId, preRequisition, whatYouGain, duration, price, discount } = req.body;
    if (!name || !courseId || !teacherId || !duration || !price) {
        throw new BadRequest_1.BadRequest("Name, Course ID, Teacher ID, Duration and Price are required");
    }
    const existingChapter = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.name, name));
    if (existingChapter.length > 0) {
        throw new BadRequest_1.BadRequest("Chapter already exists");
    }
    const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    // Derive categoryId from the course
    const categoryId = existingCourse[0].categoryId;
    const existingTeacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId));
    if (existingTeacher.length === 0) {
        throw new BadRequest_1.BadRequest("Teacher not found");
    }
    // Auto-compute order: MAX(order) + 1 for this course
    const [maxOrderResult] = await connection_1.db.select({ maxOrder: (0, drizzle_orm_1.max)(schema_1.chapters.order) }).from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courseId));
    const nextOrder = (maxOrderResult?.maxOrder ?? 0) + 1;
    const imageURL = await (0, handleImages_1.validateAndSaveLogo)(req, image, "chapters");
    await connection_1.db.insert(schema_1.chapters).values({
        name,
        courseId,
        categoryId,
        teacherId,
        preRequisition,
        whatYouGain,
        duration,
        price,
        discount,
        description,
        image: imageURL,
        order: nextOrder,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Chapter created successfully", order: nextOrder }, 200);
};
exports.createChapter = createChapter;
const getChapterById = async (req, res) => {
    const { id } = req.params;
    const result = await chapterDetailedQuery().where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
    if (result.length === 0) {
        throw new BadRequest_1.BadRequest("Chapter not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Chapter fetched successfully", ...result[0] }, 200);
};
exports.getChapterById = getChapterById;
const getAllChapters = async (req, res) => {
    const allChapters = await chapterDetailedQuery().orderBy((0, drizzle_orm_1.asc)(schema_1.chapters.order));
    return (0, response_1.SuccessResponse)(res, { message: "Chapters fetched successfully", chapters: allChapters }, 200);
};
exports.getAllChapters = getAllChapters;
const getAllChaptersByCourseId = async (req, res) => {
    const { courseId } = req.params;
    const allChapters = await chapterDetailedQuery()
        .where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courseId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.chapters.order));
    return (0, response_1.SuccessResponse)(res, { message: "Chapters fetched successfully", chapters: allChapters }, 200);
};
exports.getAllChaptersByCourseId = getAllChaptersByCourseId;
const swapChapterOrder = async (req, res) => {
    const { chapterIdA, chapterIdB } = req.body;
    if (!chapterIdA || !chapterIdB) {
        throw new BadRequest_1.BadRequest("chapterIdA and chapterIdB are required");
    }
    const [chapterA] = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, chapterIdA));
    const [chapterB] = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, chapterIdB));
    if (!chapterA || !chapterB) {
        throw new BadRequest_1.BadRequest("One or both chapters not found");
    }
    if (chapterA.courseId !== chapterB.courseId) {
        throw new BadRequest_1.BadRequest("Both chapters must belong to the same course");
    }
    // Swap orders
    await connection_1.db.update(schema_1.chapters).set({ order: chapterB.order }).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, chapterIdA));
    await connection_1.db.update(schema_1.chapters).set({ order: chapterA.order }).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, chapterIdB));
    return (0, response_1.SuccessResponse)(res, { message: "Chapter order swapped successfully" }, 200);
};
exports.swapChapterOrder = swapChapterOrder;
const updateChapter = async (req, res) => {
    const { id } = req.params;
    const { name, courseId, description, image, teacherId, preRequisition, whatYouGain, duration, price, discount } = req.body;
    const [existingChapter] = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
    if (!existingChapter) {
        throw new BadRequest_1.BadRequest("Chapter not found");
    }
    // If name is being changed, check for duplicates
    if (name && name !== existingChapter.name) {
        const duplicate = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.name, name));
        if (duplicate.length > 0) {
            throw new BadRequest_1.BadRequest("A chapter with this name already exists");
        }
    }
    // If courseId is changing, validate and derive new categoryId
    let categoryId = existingChapter.categoryId;
    if (courseId && courseId !== existingChapter.courseId) {
        const [course] = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
        if (!course) {
            throw new BadRequest_1.BadRequest("Course not found");
        }
        categoryId = course.categoryId;
    }
    // If teacherId is changing, validate
    if (teacherId && teacherId !== existingChapter.teacherId) {
        const [teacher] = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId));
        if (!teacher) {
            throw new BadRequest_1.BadRequest("Teacher not found");
        }
    }
    // Handle image update
    const updatedImage = await (0, handleImages_1.handleImageUpdate)(req, existingChapter.image, image, "chapters");
    await connection_1.db.update(schema_1.chapters).set({
        name: name ?? existingChapter.name,
        courseId: courseId ?? existingChapter.courseId,
        categoryId,
        teacherId: teacherId ?? existingChapter.teacherId,
        description: description !== undefined ? description : existingChapter.description,
        image: updatedImage ?? existingChapter.image,
        preRequisition: preRequisition !== undefined ? preRequisition : existingChapter.preRequisition,
        whatYouGain: whatYouGain !== undefined ? whatYouGain : existingChapter.whatYouGain,
        duration: duration ?? existingChapter.duration,
        price: price ?? existingChapter.price,
        discount: discount !== undefined ? discount : existingChapter.discount,
    }).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Chapter updated successfully" }, 200);
};
exports.updateChapter = updateChapter;
const deleteChapter = async (req, res) => {
    const { id } = req.params;
    const [existingChapter] = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
    if (!existingChapter) {
        throw new BadRequest_1.BadRequest("Chapter not found");
    }
    const deletedOrder = existingChapter.order;
    const parentCourseId = existingChapter.courseId;
    // Cascade: delete all lessons and their ideas under this chapter
    const chapterLessons = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, id));
    for (const lesson of chapterLessons) {
        // Delete all ideas under this lesson
        await connection_1.db.delete(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, lesson.id));
        // Delete lesson image if exists
        if (lesson.image) {
            await (0, handleImages_1.deleteImage)(lesson.image);
        }
    }
    // Delete all lessons under this chapter
    await connection_1.db.delete(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, id));
    // Delete the chapter
    await connection_1.db.delete(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
    // Re-sequence: decrement order for all chapters after the deleted one in the same course
    await connection_1.db.update(schema_1.chapters)
        .set({ order: (0, drizzle_orm_1.sql) `${schema_1.chapters.order} - 1` })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, parentCourseId), (0, drizzle_orm_1.gt)(schema_1.chapters.order, deletedOrder)));
    return (0, response_1.SuccessResponse)(res, { message: "Chapter deleted successfully" }, 200);
};
exports.deleteChapter = deleteChapter;
