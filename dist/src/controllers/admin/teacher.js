"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTeacher = exports.updateTeacher = exports.getAllTeachers = exports.getTeacherById = exports.createTeacher = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
const createTeacher = async (req, res) => {
    const { name, email, phoneNumber, password, avatar, categoryId, courseId } = req.body;
    if (!name || !email || !phoneNumber || !password) {
        throw new BadRequest_1.BadRequest("Name, Email, Phone Number, Password are required");
    }
    const existingTeacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.email, email));
    if (existingTeacher.length > 0) {
        throw new BadRequest_1.BadRequest("Teacher already exists");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    const avatarURL = await (0, handleImages_1.validateAndSaveLogo)(req, avatar, "teachers");
    await connection_1.db.insert(schema_1.teachers).values({
        name,
        email,
        phoneNumber,
        password,
        avatar: avatarURL,
        categoryId,
        courseId,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Teacher created successfully" }, 200);
};
exports.createTeacher = createTeacher;
const getTeacherById = async (req, res) => {
    const { id } = req.params;
    const teacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, id));
    if (teacher.length === 0) {
        throw new BadRequest_1.BadRequest("Teacher not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Teacher fetched successfully", teacher: teacher[0] }, 200);
};
exports.getTeacherById = getTeacherById;
const getAllTeachers = async (req, res) => {
    const teacher = await connection_1.db.select().from(schema_1.teachers);
    return (0, response_1.SuccessResponse)(res, { message: "Teachers fetched successfully", teacher }, 200);
};
exports.getAllTeachers = getAllTeachers;
const updateTeacher = async (req, res) => {
    const { id } = req.params;
    const { name, email, phoneNumber, password, avatar, categoryId, courseId } = req.body;
    if (!name || !email || !phoneNumber || !password) {
        throw new BadRequest_1.BadRequest("Name, Email, Phone Number, Password are required");
    }
    const existingTeacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, id));
    if (existingTeacher.length === 0) {
        throw new BadRequest_1.BadRequest("Teacher not found");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    const avatarURL = await (0, handleImages_1.handleImageUpdate)(req, existingTeacher[0].avatar, avatar, "teachers");
    await connection_1.db.update(schema_1.teachers).set({
        name,
        email,
        phoneNumber,
        password,
        avatar: avatarURL,
        categoryId,
        courseId,
    }).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Teacher updated successfully" }, 200);
};
exports.updateTeacher = updateTeacher;
const deleteTeacher = async (req, res) => {
    const { id } = req.params;
    const existingTeacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, id));
    if (existingTeacher.length === 0) {
        throw new BadRequest_1.BadRequest("Teacher not found");
    }
    if (existingTeacher[0].avatar) {
        await (0, handleImages_1.deleteImage)(existingTeacher[0].avatar);
    }
    await connection_1.db.delete(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Teacher deleted successfully" }, 200);
};
exports.deleteTeacher = deleteTeacher;
