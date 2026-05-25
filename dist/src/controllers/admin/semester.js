"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSemester = exports.updateSemester = exports.getSemestersByCourseId = exports.getSemesterbyId = exports.getSemesters = exports.createSemester = void 0;
const connection_1 = require("../../models/connection");
const semester_1 = require("../../models/schema/admin/semester");
const courses_1 = require("../../models/schema/admin/courses");
const category_1 = require("../../models/schema/admin/category");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const createSemester = async (req, res) => {
    const { name, courseId } = req.body;
    if (!name || !courseId) {
        throw new BadRequest_1.BadRequest("Name and Course are Required");
    }
    const exisitingCourse = await connection_1.db.select().from(courses_1.courses).where((0, drizzle_orm_1.eq)(courses_1.courses.id, courseId));
    if (exisitingCourse.length === 0) {
        throw new NotFound_1.NotFound("Course not found");
    }
    await connection_1.db.insert(semester_1.semesters).values({ name, courseId: courseId });
    return (0, response_1.SuccessResponse)(res, { message: "Semester created successfully" }, 201);
};
exports.createSemester = createSemester;
const getSemesters = async (req, res) => {
    const AllSemesters = await connection_1.db.select({
        id: semester_1.semesters.id,
        name: semester_1.semesters.name,
        courseId: semester_1.semesters.courseId,
        course: {
            id: courses_1.courses.id,
            name: courses_1.courses.name,
        },
        category: {
            id: category_1.category.id,
            name: category_1.category.name
        }
    })
        .from(semester_1.semesters)
        .innerJoin(courses_1.courses, (0, drizzle_orm_1.eq)(courses_1.courses.id, semester_1.semesters.courseId))
        .innerJoin(category_1.category, (0, drizzle_orm_1.eq)(category_1.category.id, courses_1.courses.categoryId));
    return (0, response_1.SuccessResponse)(res, { message: "Semesters fetched successfully", data: AllSemesters }, 200);
};
exports.getSemesters = getSemesters;
const getSemesterbyId = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Semester ID is required");
    }
    const semester = await connection_1.db.select({
        id: semester_1.semesters.id,
        name: semester_1.semesters.name,
        courseId: semester_1.semesters.courseId,
        course: {
            id: courses_1.courses.id,
            name: courses_1.courses.name,
            categoryId: courses_1.courses.categoryId,
            categoryName: category_1.category.name
        }
    })
        .from(semester_1.semesters)
        .innerJoin(courses_1.courses, (0, drizzle_orm_1.eq)(courses_1.courses.id, semester_1.semesters.courseId))
        .innerJoin(category_1.category, (0, drizzle_orm_1.eq)(category_1.category.id, courses_1.courses.categoryId))
        .where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    if (semester.length === 0) {
        throw new NotFound_1.NotFound("Semester not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Semester fetched successfully", data: semester }, 200);
};
exports.getSemesterbyId = getSemesterbyId;
const getSemestersByCourseId = async (req, res) => {
    const { courseId } = req.params;
    if (!courseId) {
        throw new BadRequest_1.BadRequest("Course ID is required");
    }
    const exisitingCourse = await connection_1.db.select().from(courses_1.courses).where((0, drizzle_orm_1.eq)(courses_1.courses.id, courseId));
    if (exisitingCourse.length === 0) {
        throw new NotFound_1.NotFound("Course not found");
    }
    const courseSemesters = await connection_1.db.select({
        id: semester_1.semesters.id,
        name: semester_1.semesters.name,
        courseId: semester_1.semesters.courseId,
        course: {
            id: courses_1.courses.id,
            name: courses_1.courses.name,
            categoryId: courses_1.courses.categoryId,
            categoryName: category_1.category.name
        }
    })
        .from(semester_1.semesters)
        .innerJoin(courses_1.courses, (0, drizzle_orm_1.eq)(courses_1.courses.id, semester_1.semesters.courseId))
        .innerJoin(category_1.category, (0, drizzle_orm_1.eq)(category_1.category.id, courses_1.courses.categoryId))
        .where((0, drizzle_orm_1.eq)(semester_1.semesters.courseId, courseId));
    return (0, response_1.SuccessResponse)(res, { message: "Semesters fetched successfully", data: courseSemesters }, 200);
};
exports.getSemestersByCourseId = getSemestersByCourseId;
const updateSemester = async (req, res) => {
    const { id } = req.params;
    const { name, courseId } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("Semester ID is required");
    }
    if (courseId) {
        const exisitingCourse = await connection_1.db.select().from(courses_1.courses).where((0, drizzle_orm_1.eq)(courses_1.courses.id, courseId));
        if (exisitingCourse.length === 0) {
            throw new NotFound_1.NotFound("Course not found");
        }
    }
    const existingSemester = await connection_1.db.select().from(semester_1.semesters).where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    if (existingSemester.length === 0) {
        throw new NotFound_1.NotFound("Semester not found");
    }
    await connection_1.db.update(semester_1.semesters).set({
        name: name || semester_1.semesters.name,
        courseId: courseId || semester_1.semesters.courseId
    }).where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Semester updated successfully" }, 200);
};
exports.updateSemester = updateSemester;
const deleteSemester = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Semester ID is required");
    }
    const existingSemester = await connection_1.db.select().from(semester_1.semesters).where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    if (existingSemester.length === 0) {
        throw new NotFound_1.NotFound("Semester not found");
    }
    await connection_1.db.delete(semester_1.semesters).where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Semester deleted successfully" }, 200);
};
exports.deleteSemester = deleteSemester;
