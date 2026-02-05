"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourse = exports.updateCourse = exports.getCourseById = exports.createCourse = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
// TODO
const createCourse = async (req, res) => {
    const { name, categoryId, teacherId, preRequisition, whatYouGain, duration, image, description, price, discount } = req.body;
    if (!name || !categoryId || !teacherId || !duration || !price) {
        throw new BadRequest_1.BadRequest("Name , Category , Teacher , Duration , Price are required");
    }
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.name, name));
    if (course.length > 0) {
        throw new BadRequest_1.BadRequest("Course already exists");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    // TODO: Add teacher schema and check for existing teacher
    // const existingTeacher = await db.select().from(teacher).where(eq(teacher.id, teacherId));
    // if (existingTeacher.length === 0) {
    //     throw new BadRequest("Teacher not found");
    // }
    if (discount) {
        if (discount > price) {
            throw new BadRequest_1.BadRequest("Discount cannot be greater than price");
        }
    }
    const imageURL = await (0, handleImages_1.validateAndSaveLogo)(req, image, "courses");
    await connection_1.db.insert(schema_1.courses).values({
        name,
        categoryId,
        teacherId,
        preRequisition,
        whatYouGain,
        duration,
        image: imageURL,
        description,
        price,
        discount,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Course created successfully" }, 200);
};
exports.createCourse = createCourse;
const getCourseById = async (req, res) => {
    const { id } = req.params;
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    return (0, response_1.SuccessResponse)(res, course[0], 200);
};
exports.getCourseById = getCourseById;
// TODO Select Course Name , Number of Chapters , Category
// export const getAllCourses = async (req: Request, res: Response) => {
// }
// TODO: Add teacher schema and check for existing teacher
const updateCourse = async (req, res) => {
    const { id } = req.params;
    const { name, categoryId, teacherId, preRequisition, whatYouGain, duration, image, description, price, discount } = req.body;
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    if (discount) {
        if (discount > price) {
            throw new BadRequest_1.BadRequest("Discount cannot be greater than price");
        }
    }
    const imageURL = await (0, handleImages_1.handleImageUpdate)(req, course[0].image, image, "courses");
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    // TODO: Add teacher schema and check for existing teacher
    // const existingTeacher = await db.select().from(teacher).where(eq(teacher.id, teacherId));
    // if (existingTeacher.length === 0) {
    //     throw new BadRequest("Teacher not found");
    // }
    await connection_1.db.update(schema_1.courses).set({
        name: name || course[0].name,
        categoryId: categoryId || course[0].categoryId,
        teacherId: teacherId || course[0].teacherId,
        preRequisition: preRequisition || course[0].preRequisition,
        whatYouGain: whatYouGain || course[0].whatYouGain,
        duration: duration || course[0].duration,
        image: imageURL || course[0].image,
        description: description || course[0].description,
        price: price || course[0].price,
        discount: discount || course[0].discount,
    }).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Course updated successfully" }, 200);
};
exports.updateCourse = updateCourse;
const deleteCourse = async (req, res) => {
    const { id } = req.params;
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    if (course[0].image) {
        await (0, handleImages_1.deleteImage)(course[0].image);
    }
    await connection_1.db.delete(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Course deleted successfully" }, 200);
};
exports.deleteCourse = deleteCourse;
