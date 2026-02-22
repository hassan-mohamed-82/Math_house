"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategorySelection = exports.deleteTeacher = exports.updateTeacher = exports.getAllTeachers = exports.getTeacherById = exports.createTeacher = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
const crypto_1 = require("crypto");
const createTeacher = async (req, res) => {
    const { name, email, phoneNumber, password, avatar, categoryId, courseId } = req.body;
    if (!name || !email || !phoneNumber || !password) {
        throw new BadRequest_1.BadRequest("Name, Email, Phone Number, Password are required");
    }
    const existingTeacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.email, email));
    if (existingTeacher.length > 0) {
        throw new BadRequest_1.BadRequest("Teacher already exists");
    }
    const avatarURL = await (0, handleImages_1.validateAndSaveLogo)(req, avatar, "teachers");
    if (categoryId) {
        const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest_1.BadRequest("Category not found");
        }
    }
    // Add Teacher to Course if courseId is provided
    if (courseId) {
        const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
        if (existingCourse.length === 0) {
            throw new BadRequest_1.BadRequest("Course not found");
        }
    }
    // ---------------------------------------------------
    // Generate teacher ID
    const teacherId = (0, crypto_1.randomUUID)();
    await connection_1.db.insert(schema_1.teachers).values({
        id: teacherId,
        name,
        email,
        phoneNumber,
        password,
        avatar: avatarURL,
        categoryId,
    });
    // Add teacher to course via junction table if courseId provided
    if (courseId) {
        await connection_1.db.insert(schema_1.courseTeachers).values({
            courseId,
            teacherId,
        });
    }
    return (0, response_1.SuccessResponse)(res, { message: "Teacher created successfully" }, 200);
};
exports.createTeacher = createTeacher;
const getTeacherById = async (req, res) => {
    const { id } = req.params;
    const teacher = await connection_1.db.select({
        id: schema_1.teachers.id,
        name: schema_1.teachers.name,
        email: schema_1.teachers.email,
        phoneNumber: schema_1.teachers.phoneNumber,
        avatar: schema_1.teachers.avatar,
        categoryId: schema_1.teachers.categoryId,
        courses: {
            id: schema_1.courses.id,
            name: schema_1.courses.name,
        }
    }).from(schema_1.teachers)
        .innerJoin(schema_1.courseTeachers, (0, drizzle_orm_1.eq)(schema_1.teachers.id, schema_1.courseTeachers.teacherId))
        .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.courses.id, schema_1.courseTeachers.courseId))
        .where((0, drizzle_orm_1.eq)(schema_1.teachers.id, id));
    if (teacher.length === 0) {
        throw new BadRequest_1.BadRequest("Teacher not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Teacher fetched successfully", teacher: teacher[0] }, 200);
};
exports.getTeacherById = getTeacherById;
const getAllTeachers = async (req, res) => {
    const teacher = await connection_1.db.select({
        id: schema_1.teachers.id,
        name: schema_1.teachers.name,
        email: schema_1.teachers.email,
        phoneNumber: schema_1.teachers.phoneNumber,
        avatar: schema_1.teachers.avatar,
        categoryId: schema_1.teachers.categoryId,
        courses: {
            id: schema_1.courses.id,
            name: schema_1.courses.name,
        }
    }).from(schema_1.teachers)
        .innerJoin(schema_1.courseTeachers, (0, drizzle_orm_1.eq)(schema_1.teachers.id, schema_1.courseTeachers.teacherId))
        .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.courses.id, schema_1.courseTeachers.courseId));
    return (0, response_1.SuccessResponse)(res, { message: "Teachers fetched successfully", teacher }, 200);
};
exports.getAllTeachers = getAllTeachers;
const updateTeacher = async (req, res) => {
    const { id } = req.params;
    const { name, email, phoneNumber, password, avatar, categoryId, courseId } = req.body;
    // Check if teacher exists
    const existingTeacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, id));
    if (existingTeacher.length === 0) {
        throw new BadRequest_1.BadRequest("Teacher not found");
    }
    // Check email uniqueness if email is being changed
    if (email && email !== existingTeacher[0].email) {
        const emailTaken = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.email, email));
        if (emailTaken.length > 0) {
            throw new BadRequest_1.BadRequest("Email is already in use by another teacher");
        }
    }
    // Validate categoryId if provided
    if (categoryId) {
        const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest_1.BadRequest("Category not found");
        }
    }
    // Handle avatar update (saves new, deletes old, or keeps existing)
    const avatarURL = await (0, handleImages_1.handleImageUpdate)(req, existingTeacher[0].avatar, avatar, "teachers");
    // Update teacher record
    await connection_1.db.update(schema_1.teachers).set({
        ...(name && { name }),
        ...(email && { email }),
        ...(phoneNumber && { phoneNumber }),
        ...(password && { password }),
        ...(avatarURL && { avatar: avatarURL }),
        ...(categoryId !== undefined && { categoryId }),
    }).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, id));
    // Update course assignment if courseId is provided
    if (courseId) {
        const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId));
        if (existingCourse.length === 0) {
            throw new BadRequest_1.BadRequest("Course not found");
        }
        // Remove existing course assignments and add the new one
        await connection_1.db.delete(schema_1.courseTeachers).where((0, drizzle_orm_1.eq)(schema_1.courseTeachers.teacherId, id));
        await connection_1.db.insert(schema_1.courseTeachers).values({
            courseId,
            teacherId: id,
        });
    }
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
const getCategorySelection = async (req, res) => {
    const allCategories = await connection_1.db.select({
        id: schema_1.category.id,
        name: schema_1.category.name,
        parentCategoryId: schema_1.category.parentCategoryId,
    }).from(schema_1.category);
    const categoryMap = new Map();
    const parentIds = new Set();
    allCategories.forEach(cat => {
        categoryMap.set(cat.id, cat);
        if (cat.parentCategoryId) {
            parentIds.add(cat.parentCategoryId);
        }
    });
    const leafCategories = allCategories.filter(cat => !parentIds.has(cat.id));
    const formattedCategories = leafCategories.map(leaf => {
        let current = leaf;
        const ancestors = [];
        while (current) {
            ancestors.unshift(current.name);
            if (current.parentCategoryId && categoryMap.has(current.parentCategoryId)) {
                current = categoryMap.get(current.parentCategoryId);
            }
            else {
                break;
            }
        }
        return {
            id: leaf.id,
            name: ancestors.join(" ")
        };
    });
    return (0, response_1.SuccessResponse)(res, { message: "Categories fetched successfully", data: formattedCategories }, 200);
};
exports.getCategorySelection = getCategorySelection;
