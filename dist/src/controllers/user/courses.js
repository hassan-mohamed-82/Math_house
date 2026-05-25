"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseById = exports.getAllCourses = void 0;
const courses_1 = require("../../models/schema/admin/courses");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const prices_1 = require("../../models/schema/admin/prices");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const accessControl_1 = require("../../utils/accessControl");
// 1. Get all courses 
const getAllCourses = async (req, res) => {
    const studentId = req.user.id;
    // 1. Get student's category (parent category) and grade
    const [student] = await connection_1.db
        .select({ category: schema_1.Student.category, grade: schema_1.Student.grade })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    if (!student)
        throw new BadRequest_1.BadRequest("Student not found");
    const studentParentCategory = student.category;
    const studentGrade = student.grade;
    // 2. Find all child categories whose parentCategoryId = student's category
    const childCategories = await connection_1.db
        .select({ id: schema_1.category.id })
        .from(schema_1.category)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.category.id, studentParentCategory), (0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, studentParentCategory)));
    if (childCategories.length === 0) {
        return (0, response_1.SuccessResponse)(res, { message: "All Courses Retrieved Successfully", courses: [] }, 200);
    }
    const childCategoryIds = childCategories.map((c) => c.id);
    // 3. Return courses in those child categories where the grade matches the student's grade
    const allCourses = await connection_1.db
        .select({
        id: courses_1.courses.id,
        name: courses_1.courses.name,
        category: schema_1.category.name,
        numberOfChapters: (0, drizzle_orm_1.count)(schema_1.chapters.id),
    })
        .from(courses_1.courses)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(courses_1.courses.categoryId, schema_1.category.id))
        .leftJoin(schema_1.grade, (0, drizzle_orm_1.eq)(schema_1.grade.categoryId, schema_1.category.id))
        .leftJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(courses_1.courses.id, schema_1.chapters.courseId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(courses_1.courses.categoryId, childCategoryIds), (0, drizzle_orm_1.eq)(schema_1.grade.id, studentGrade)))
        .groupBy(courses_1.courses.id, courses_1.courses.name, schema_1.category.name);
    if (allCourses.length === 0) {
        return (0, response_1.SuccessResponse)(res, { message: "All Courses Retrieved Successfully", courses: [] }, 200);
    }
    const courseIds = allCourses.map(c => c.id);
    // Fetch prices for the courses
    const coursePrices = await connection_1.db
        .select()
        .from(prices_1.prices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.targetType, "course"), (0, drizzle_orm_1.inArray)(prices_1.prices.targetId, courseIds)));
    const studentEnrollments = await connection_1.db
        .select({ courseId: schema_1.enrolledItems.courseId })
        .from(schema_1.enrolledItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "active")));
    const enrolledCourseIds = new Set(studentEnrollments.map(e => e.courseId));
    const coursesWithPrices = allCourses.map(course => {
        return {
            ...course,
            pricePlans: coursePrices.filter(p => p.targetId === course.id),
            isPurchased: enrolledCourseIds.has(course.id)
        };
    });
    return (0, response_1.SuccessResponse)(res, { message: "All Courses Retrieved Successfully", courses: coursesWithPrices }, 200);
};
exports.getAllCourses = getAllCourses;
// 2. Get course by id 
const getCourseById = async (req, res) => {
    const { id } = req.params;
    const [course] = await connection_1.db.select().from(courses_1.courses).where((0, drizzle_orm_1.eq)(courses_1.courses.id, id));
    if (!course)
        throw new BadRequest_1.BadRequest("Course not found");
    const teachersList = await connection_1.db.select({
        name: schema_1.teachers.name,
        role: schema_1.courseTeachers.role,
    })
        .from(schema_1.courseTeachers)
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.courseTeachers.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(schema_1.courseTeachers.courseId, id));
    const courseSemestersList = await connection_1.db.select({
        id: schema_1.semesters.id,
        name: schema_1.semesters.name,
    })
        .from(schema_1.semesters)
        .where((0, drizzle_orm_1.eq)(schema_1.semesters.courseId, id));
    const hasAccess = await (0, accessControl_1.checkAccess)(req.user.id, {
        courseId: id
    });
    const coursePricePlans = await connection_1.db
        .select()
        .from(prices_1.prices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.targetType, "course"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, id)));
    return (0, response_1.SuccessResponse)(res, {
        ...course,
        teachers: teachersList,
        semesters: courseSemestersList,
        pricePlans: coursePricePlans,
        isLocked: !hasAccess
    }, 200);
};
exports.getCourseById = getCourseById;
