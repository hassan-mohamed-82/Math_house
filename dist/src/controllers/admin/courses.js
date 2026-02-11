"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoriesSelection = exports.getCourseTeachers = exports.removeTeacherFromCourse = exports.addTeacherToCourse = exports.deleteCourse = exports.updateCourse = exports.getAllCourses = exports.getCourseById = exports.createCourse = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
const crypto_1 = require("crypto");
// ADD switch from the front end to use Semester ID if needed
const createCourse = async (req, res) => {
    const { name, categoryId, semesterId, teacherIds, preRequisition, whatYouGain, duration, image, description, price, discount } = req.body;
    if (!name || !categoryId || !duration || !price) {
        throw new BadRequest_1.BadRequest("Name, Category, Duration, Price are required");
    }
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.name, name));
    if (course.length > 0) {
        throw new BadRequest_1.BadRequest("Course already exists");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    // Ensure the category is a leaf (has no children)
    const childCategories = await connection_1.db.select({ id: schema_1.category.id }).from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, categoryId));
    if (childCategories.length > 0) {
        throw new BadRequest_1.BadRequest("Cannot assign a course to a non-leaf category. Please select a category with no sub-categories.");
    }
    if (semesterId) {
        const existingSemester = await connection_1.db.select().from(schema_1.semesters).where((0, drizzle_orm_1.eq)(schema_1.semesters.id, semesterId));
        if (existingSemester.length === 0) {
            throw new BadRequest_1.BadRequest("Semester not found");
        }
    }
    // Validate teachers if provided
    if (teacherIds && teacherIds.length > 0) {
        const existingTeachers = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.inArray)(schema_1.teachers.id, teacherIds));
        if (existingTeachers.length !== teacherIds.length) {
            throw new BadRequest_1.BadRequest("One or more teachers not found");
        }
    }
    if (discount) {
        if (discount > price) {
            throw new BadRequest_1.BadRequest("Discount cannot be greater than price");
        }
    }
    let imageURL = "";
    if (image) {
        imageURL = await (0, handleImages_1.validateAndSaveLogo)(req, image, "courses");
    }
    // Generate course ID
    const courseId = (0, crypto_1.randomUUID)();
    // Insert the course
    await connection_1.db.insert(schema_1.courses).values({
        id: courseId,
        name,
        categoryId,
        semesterId,
        preRequisition,
        whatYouGain,
        duration,
        image: imageURL,
        description,
        price,
        discount,
    });
    // Add teachers to the course via junction table
    if (teacherIds && teacherIds.length > 0) {
        const courseTeacherValues = teacherIds.map((teacherId) => ({
            courseId,
            teacherId,
        }));
        await connection_1.db.insert(schema_1.courseTeachers).values(courseTeacherValues);
    }
    return (0, response_1.SuccessResponse)(res, { message: "Course created successfully", courseId }, 200);
};
exports.createCourse = createCourse;
const getCourseById = async (req, res) => {
    const { id } = req.params;
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    // Get teachers for this course
    const courseTeachersList = await connection_1.db.select({
        teacherId: schema_1.courseTeachers.teacherId,
        teacherName: schema_1.teachers.name,
        role: schema_1.courseTeachers.role,
    })
        .from(schema_1.courseTeachers)
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.courseTeachers.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(schema_1.courseTeachers.courseId, id));
    return (0, response_1.SuccessResponse)(res, { ...course[0], teachers: courseTeachersList }, 200);
};
exports.getCourseById = getCourseById;
const getAllCourses = async (req, res) => {
    const allCourses = await connection_1.db.select({
        name: schema_1.courses.name,
        id: schema_1.courses.id,
        category: schema_1.category.name,
        numberOfChapters: (0, drizzle_orm_1.count)(schema_1.chapters.id),
    })
        .from(schema_1.courses)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .leftJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.courses.id, schema_1.chapters.courseId))
        .groupBy(schema_1.courses.id, schema_1.courses.name, schema_1.category.name);
    return (0, response_1.SuccessResponse)(res, { message: "All Courses Retrieved Successfully", courses: allCourses }, 200);
};
exports.getAllCourses = getAllCourses;
const updateCourse = async (req, res) => {
    const { id } = req.params;
    const { name, categoryId, semesterId, teacherIds, preRequisition, whatYouGain, duration, image, description, price, discount } = req.body;
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
    if (categoryId) {
        const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest_1.BadRequest("Category not found");
        }
        // Ensure the category is a leaf (has no children)
        const childCategories = await connection_1.db.select({ id: schema_1.category.id }).from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, categoryId));
        if (childCategories.length > 0) {
            throw new BadRequest_1.BadRequest("Cannot assign a course to a non-leaf category. Please select a category with no sub-categories.");
        }
    }
    // Validate and update teachers if provided
    if (teacherIds && teacherIds.length > 0) {
        const existingTeachers = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.inArray)(schema_1.teachers.id, teacherIds));
        if (existingTeachers.length !== teacherIds.length) {
            throw new BadRequest_1.BadRequest("One or more teachers not found");
        }
        // Remove existing teachers and add new ones
        await connection_1.db.delete(schema_1.courseTeachers).where((0, drizzle_orm_1.eq)(schema_1.courseTeachers.courseId, id));
        const courseTeacherValues = teacherIds.map((teacherId) => ({
            courseId: id,
            teacherId,
        }));
        await connection_1.db.insert(schema_1.courseTeachers).values(courseTeacherValues);
    }
    await connection_1.db.update(schema_1.courses).set({
        name: name || course[0].name,
        categoryId: categoryId || course[0].categoryId,
        semesterId: semesterId || course[0].semesterId,
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
    // Cascade: find all chapters under this course
    const courseChapters = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, id));
    for (const chapter of courseChapters) {
        // Find all lessons under this chapter
        const chapterLessons = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, chapter.id));
        for (const lesson of chapterLessons) {
            // Delete all ideas under this lesson
            await connection_1.db.delete(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, lesson.id));
            // Delete lesson image if exists
            if (lesson.image) {
                await (0, handleImages_1.deleteImage)(lesson.image);
            }
        }
        // Delete all lessons under this chapter
        await connection_1.db.delete(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, chapter.id));
    }
    // Delete all chapters under this course
    await connection_1.db.delete(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, id));
    // Delete course image
    if (course[0].image) {
        await (0, handleImages_1.deleteImage)(course[0].image);
    }
    // Delete the course (junction table entries handled by ON DELETE CASCADE)
    await connection_1.db.delete(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Course deleted successfully" }, 200);
};
exports.deleteCourse = deleteCourse;
// New endpoint to add a teacher to an existing course
const addTeacherToCourse = async (req, res) => {
    const { id } = req.params;
    const { teacherId, role } = req.body;
    if (!teacherId) {
        throw new BadRequest_1.BadRequest("Teacher ID is required");
    }
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    const teacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId));
    if (teacher.length === 0) {
        throw new BadRequest_1.BadRequest("Teacher not found");
    }
    // Check if teacher is already assigned to this course
    const existingAssignment = await connection_1.db.select()
        .from(schema_1.courseTeachers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.courseTeachers.courseId, id), (0, drizzle_orm_1.eq)(schema_1.courseTeachers.teacherId, teacherId)));
    if (existingAssignment.length > 0) {
        throw new BadRequest_1.BadRequest("Teacher is already assigned to this course");
    }
    await connection_1.db.insert(schema_1.courseTeachers).values({
        courseId: id,
        teacherId,
        role: role || "instructor",
    });
    return (0, response_1.SuccessResponse)(res, { message: "Teacher added to course successfully" }, 200);
};
exports.addTeacherToCourse = addTeacherToCourse;
// New endpoint to remove a teacher from a course
const removeTeacherFromCourse = async (req, res) => {
    const { id, teacherId } = req.params;
    const assignment = await connection_1.db.select()
        .from(schema_1.courseTeachers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.courseTeachers.courseId, id), (0, drizzle_orm_1.eq)(schema_1.courseTeachers.teacherId, teacherId)));
    if (assignment.length === 0) {
        throw new BadRequest_1.BadRequest("Teacher is not assigned to this course");
    }
    await connection_1.db.delete(schema_1.courseTeachers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.courseTeachers.courseId, id), (0, drizzle_orm_1.eq)(schema_1.courseTeachers.teacherId, teacherId)));
    return (0, response_1.SuccessResponse)(res, { message: "Teacher removed from course successfully" }, 200);
};
exports.removeTeacherFromCourse = removeTeacherFromCourse;
// New endpoint to get all teachers for a course
const getCourseTeachers = async (req, res) => {
    const { id } = req.params;
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    const courseTeachersList = await connection_1.db.select({
        teacherId: schema_1.courseTeachers.teacherId,
        teacherName: schema_1.teachers.name,
        teacherEmail: schema_1.teachers.email,
        role: schema_1.courseTeachers.role,
        assignedAt: schema_1.courseTeachers.createdAt,
    })
        .from(schema_1.courseTeachers)
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.courseTeachers.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(schema_1.courseTeachers.courseId, id));
    return (0, response_1.SuccessResponse)(res, { teachers: courseTeachersList }, 200);
};
exports.getCourseTeachers = getCourseTeachers;
const getCategoriesSelection = async (req, res) => {
    const child = (0, drizzle_orm_1.aliasedTable)(schema_1.category, "child");
    const categories = await connection_1.db.selectDistinct({
        id: schema_1.category.id,
        name: schema_1.category.name
    })
        .from(schema_1.category)
        .leftJoin(child, (0, drizzle_orm_1.eq)(child.parentCategoryId, schema_1.category.id))
        .where((0, drizzle_orm_1.isNull)(child.id));
    return (0, response_1.SuccessResponse)(res, { message: "Categories fetched successfully", data: categories }, 200);
};
exports.getCategoriesSelection = getCategoriesSelection;
