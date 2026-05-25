"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChapter = exports.updateChapter = exports.swapChapterOrder = exports.getAllChaptersByCourseId = exports.getAllChapters = exports.getChapterById = exports.createChapter = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
const crypto_1 = require("crypto");
// Shared detailed select with joins for chapters
const chapterDetailedQuery = () => connection_1.db.select({
    chapter: {
        id: schema_1.chapters.id,
        name: schema_1.chapters.name,
        description: schema_1.chapters.description,
        image: schema_1.chapters.image,
        preRequisition: schema_1.chapters.preRequisition,
        whatYouGain: schema_1.chapters.whatYouGain,
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
    semester: {
        id: schema_1.semesters.id,
        name: schema_1.semesters.name,
    }
})
    .from(schema_1.chapters)
    .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, schema_1.courses.id))
    .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.chapters.categoryId, schema_1.category.id))
    .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.chapters.teacherId, schema_1.teachers.id))
    .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.chapters.semesterId, schema_1.semesters.id));
const createChapter = async (req, res) => {
    const { name, courseId, semesterId, description, image, teacherId, preRequisition, whatYouGain, pricePlans } = req.body;
    if (!name || !courseId || !teacherId) {
        throw new BadRequest_1.BadRequest("Name, Course ID, Teacher ID are required");
    }
    // validation of price plans
    if (!pricePlans || pricePlans.length === 0) {
        throw new BadRequest_1.BadRequest("Price Plans are required");
    }
    for (const plan of pricePlans) {
        if (plan.hasDiscount) {
            if (Number(plan.discountEgp) > Number(plan.priceEgp)) {
                throw new BadRequest_1.BadRequest(`EGP Discount cannot be greater than price in plan: ${plan.label}`);
            }
            if (Number(plan.discountUsd) > Number(plan.priceUsd)) {
                throw new BadRequest_1.BadRequest(`USD Discount cannot be greater than price in plan: ${plan.label}`);
            }
        }
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
    if (semesterId) {
        const existingSemester = await connection_1.db.select().from(schema_1.semesters).where((0, drizzle_orm_1.eq)(schema_1.semesters.id, semesterId));
        if (existingSemester.length === 0) {
            throw new BadRequest_1.BadRequest("Semester not found");
        }
        if (existingSemester[0].courseId !== courseId) {
            throw new BadRequest_1.BadRequest("The selected semester does not belong to the selected course");
        }
    }
    // Auto-compute order: MAX(order) + 1 for this course
    const [maxOrderResult] = await connection_1.db.select({ maxOrder: (0, drizzle_orm_1.max)(schema_1.chapters.order) }).from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courseId));
    const nextOrder = (maxOrderResult?.maxOrder ?? 0) + 1;
    let imageURL = null;
    if (image) {
        imageURL = await (0, handleImages_1.validateAndSaveLogo)(req, image, "chapters");
    }
    const chapterId = (0, crypto_1.randomUUID)();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.chapters).values({
            id: chapterId,
            name,
            courseId,
            semesterId,
            categoryId,
            teacherId,
            preRequisition,
            whatYouGain,
            description,
            image: imageURL,
            order: nextOrder,
        });
        const priceValues = pricePlans.map((plan, index) => ({
            id: (0, crypto_1.randomUUID)(),
            targetId: chapterId,
            targetType: "chapter",
            durationLabel: plan.label,
            durationDays: plan.days,
            priceEgp: plan.priceEgp,
            priceUsd: plan.priceUsd,
            discountEgp: plan.discountEgp || "0.00",
            discountUsd: plan.discountUsd || "0.00",
            hasDiscount: plan.hasDiscount || false,
            isDefault: index === 0,
        }));
        await tx.insert(schema_1.prices).values(priceValues);
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
    const chapterPrices = await connection_1.db.select()
        .from(schema_1.prices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetId, id), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "chapter")));
    return (0, response_1.SuccessResponse)(res, { message: "Chapter fetched successfully", ...result[0], prices: chapterPrices }, 200);
};
exports.getChapterById = getChapterById;
const getAllChapters = async (req, res) => {
    const allChapters = await chapterDetailedQuery().orderBy((0, drizzle_orm_1.asc)(schema_1.chapters.order));
    const chapterIds = allChapters.map(c => c.chapter.id);
    let allPrices = [];
    if (chapterIds.length > 0) {
        allPrices = await connection_1.db.select().from(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.prices.targetId, chapterIds), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "chapter")));
    }
    const result = allChapters.map(c => ({
        ...c,
        prices: allPrices.filter(p => p.targetId === c.chapter.id)
    }));
    return (0, response_1.SuccessResponse)(res, { message: "Chapters fetched successfully", chapters: result }, 200);
};
exports.getAllChapters = getAllChapters;
const getAllChaptersByCourseId = async (req, res) => {
    const { courseId } = req.params;
    const allChapters = await chapterDetailedQuery()
        .where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courseId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.chapters.order));
    const chapterIds = allChapters.map(c => c.chapter.id);
    let allPrices = [];
    if (chapterIds.length > 0) {
        allPrices = await connection_1.db.select().from(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.prices.targetId, chapterIds), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "chapter")));
    }
    const result = allChapters.map(c => ({
        ...c,
        prices: allPrices.filter(p => p.targetId === c.chapter.id)
    }));
    return (0, response_1.SuccessResponse)(res, { message: "Chapters fetched successfully", chapters: result }, 200);
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
    const { name, courseId, semesterId, description, image, teacherId, preRequisition, whatYouGain, pricePlans } = req.body;
    const [existingChapter] = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
    if (!existingChapter) {
        throw new BadRequest_1.BadRequest("Chapter not found");
    }
    // validation of price plans
    if (pricePlans && pricePlans.length > 0) {
        for (const plan of pricePlans) {
            if (plan.hasDiscount) {
                if (Number(plan.discountEgp) > Number(plan.priceEgp)) {
                    throw new BadRequest_1.BadRequest(`EGP Discount cannot be greater than price in plan: ${plan.label}`);
                }
                if (Number(plan.discountUsd) > Number(plan.priceUsd)) {
                    throw new BadRequest_1.BadRequest(`USD Discount cannot be greater than price in plan: ${plan.label}`);
                }
            }
        }
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
    let updatedSemesterId = existingChapter.semesterId;
    // If semesterId is explicitly changing
    if (semesterId !== undefined && semesterId !== existingChapter.semesterId) {
        if (semesterId) {
            const [semester] = await connection_1.db.select().from(schema_1.semesters).where((0, drizzle_orm_1.eq)(schema_1.semesters.id, semesterId));
            if (!semester) {
                throw new BadRequest_1.BadRequest("Semester not found");
            }
            // Use new courseId if provided, else existing
            const targetCourseId = courseId ?? existingChapter.courseId;
            if (semester.courseId !== targetCourseId) {
                throw new BadRequest_1.BadRequest("The selected semester does not belong to the selected course");
            }
        }
        updatedSemesterId = semesterId; // allows setting it to null
    }
    else if (courseId && courseId !== existingChapter.courseId) {
        // If course changed but semesterId wasn't explicitly passed, clear the old semesterId
        // because the old semester won't belong to the new course
        updatedSemesterId = null;
    }
    // Handle image update
    const updatedImage = await (0, handleImages_1.handleImageUpdate)(req, existingChapter.image, image, "chapters");
    await connection_1.db.transaction(async (tx) => {
        await tx.update(schema_1.chapters).set({
            name: name ?? existingChapter.name,
            courseId: courseId ?? existingChapter.courseId,
            semesterId: updatedSemesterId,
            categoryId,
            teacherId: teacherId ?? existingChapter.teacherId,
            description: description !== undefined ? description : existingChapter.description,
            image: updatedImage ?? existingChapter.image,
            preRequisition: preRequisition !== undefined ? preRequisition : existingChapter.preRequisition,
            whatYouGain: whatYouGain !== undefined ? whatYouGain : existingChapter.whatYouGain,
        }).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
        // Update Price Plans
        if (pricePlans && pricePlans.length > 0) {
            await tx.delete(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetId, id), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "chapter")));
            const priceValues = pricePlans.map((plan, index) => ({
                id: (0, crypto_1.randomUUID)(),
                targetId: id,
                targetType: "chapter",
                durationLabel: plan.label,
                durationDays: plan.days,
                priceEgp: plan.priceEgp,
                priceUsd: plan.priceUsd,
                discountEgp: plan.discountEgp || "0.00",
                discountUsd: plan.discountUsd || "0.00",
                hasDiscount: plan.hasDiscount || false,
                isDefault: index === 0,
            }));
            await tx.insert(schema_1.prices).values(priceValues);
        }
    });
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
    // Delete chapter pricing
    await connection_1.db.delete(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetId, id), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "chapter")));
    // Delete the chapter
    await connection_1.db.delete(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
    // Re-sequence: decrement order for all chapters after the deleted one in the same course
    await connection_1.db.update(schema_1.chapters)
        .set({ order: (0, drizzle_orm_1.sql) `${schema_1.chapters.order} - 1` })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, parentCourseId), (0, drizzle_orm_1.gt)(schema_1.chapters.order, deletedOrder)));
    return (0, response_1.SuccessResponse)(res, { message: "Chapter deleted successfully" }, 200);
};
exports.deleteChapter = deleteChapter;
