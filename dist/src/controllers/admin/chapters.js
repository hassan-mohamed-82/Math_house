"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllChapters = exports.getChapterById = exports.createChapter = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
const createChapter = async (req, res) => {
    const { name, categoryId, courseId, description, image, teacherId, preRequisition, whatYouGain, duration, price, discount } = req.body;
    if (!name || !courseId || !categoryId || !teacherId || !duration || !price) {
        throw new BadRequest_1.BadRequest("Name, Course ID, Category ID, Teacher ID, Duration and Price are required");
    }
    const existingChapter = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.name, name));
    if (existingChapter.length > 0) {
        throw new BadRequest_1.BadRequest("Chapter already exists");
    }
    const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
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
    });
    return (0, response_1.SuccessResponse)(res, { message: "Chapter created successfully" }, 200);
};
exports.createChapter = createChapter;
// TODO: Add Number of Lessons
const getChapterById = async (req, res) => {
    const { id } = req.params;
    const chapter = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
    if (chapter.length === 0) {
        throw new BadRequest_1.BadRequest("Chapter not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Chapter fetched successfully", chapter: chapter[0] }, 200);
};
exports.getChapterById = getChapterById;
const getAllChapters = async (req, res) => {
};
exports.getAllChapters = getAllChapters;
