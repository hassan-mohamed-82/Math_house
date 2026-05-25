"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectionCourses = exports.getCoursesbyCategoryId = exports.getCategoriesSelection = exports.getCourseTeachers = exports.removeTeacherFromCourse = exports.addTeacherToCourse = exports.deleteCourse = exports.updateCourse = exports.getAllCourses = exports.getCourseById = exports.createCourse = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
const crypto_1 = require("crypto");
// --- 1. Create Course ---
const createCourse = async (req, res) => {
    const { name, categoryId, isHaveSemester, semesters: courseSemesters, teacherIds, preRequisition, whatYouGain, image, description, pricePlans } = req.body;
    // validation of basic data
    if (!name || !categoryId) {
        throw new BadRequest_1.BadRequest("Name, Category, are required");
    }
    // validation of price plans
    if (!pricePlans || pricePlans.length === 0) {
        throw new BadRequest_1.BadRequest("Price Plans are required");
    }
    const courseExist = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.name, name));
    if (courseExist.length > 0) {
        throw new BadRequest_1.BadRequest("Course already exists");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    // validation of category
    const childCategories = await connection_1.db.select({ id: schema_1.category.id }).from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, categoryId));
    if (childCategories.length > 0) {
        throw new BadRequest_1.BadRequest("Cannot assign a course to a non-leaf category. Please select a category with no sub-categories.");
    }
    // validation of semesters
    if (isHaveSemester && courseSemesters && courseSemesters.length > 0) {
        for (const sem of courseSemesters) {
            if (!sem.name) {
                throw new BadRequest_1.BadRequest("Semester name is required when creating a semester");
            }
        }
    }
    // validation of teachers
    if (teacherIds && teacherIds.length > 0) {
        const existingTeachers = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.inArray)(schema_1.teachers.id, teacherIds));
        if (existingTeachers.length !== teacherIds.length) {
            throw new BadRequest_1.BadRequest("One or more teachers not found");
        }
    }
    // validation of price plans
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
    let imageURL = "";
    if (image) {
        imageURL = await (0, handleImages_1.validateAndSaveLogo)(req, image, "courses");
    }
    const courseId = (0, crypto_1.randomUUID)();
    // استخدام Transaction لضمان حفظ الكورس وأسعاره معاً
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.courses).values({
            id: courseId,
            name,
            categoryId,
            isHaveSemester: isHaveSemester || false,
            preRequisition,
            whatYouGain,
            image: imageURL,
            description,
        });
        const priceValues = pricePlans.map((plan, index) => ({
            id: (0, crypto_1.randomUUID)(),
            targetId: courseId,
            targetType: "course",
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
        if (teacherIds && teacherIds.length > 0) {
            const courseTeacherValues = teacherIds.map((teacherId) => ({
                courseId,
                teacherId,
            }));
            await tx.insert(schema_1.courseTeachers).values(courseTeacherValues);
        }
        if (isHaveSemester && courseSemesters && courseSemesters.length > 0) {
            const semesterValues = courseSemesters.map((sem) => ({
                id: (0, crypto_1.randomUUID)(),
                name: sem.name,
                courseId: courseId,
            }));
            await tx.insert(schema_1.semesters).values(semesterValues);
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Course created successfully" }, 200);
};
exports.createCourse = createCourse;
// --- 2. Get Course By ID ---
const getCourseById = async (req, res) => {
    const { id } = req.params;
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    const coursePrices = await connection_1.db.select()
        .from(schema_1.prices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetId, id), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "course")));
    const courseTeachersList = await connection_1.db.select({
        teacherId: schema_1.courseTeachers.teacherId,
        teacherName: schema_1.teachers.name,
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
    return (0, response_1.SuccessResponse)(res, {
        ...course[0],
        prices: coursePrices,
        teachers: courseTeachersList,
        semesters: courseSemestersList
    }, 200);
};
exports.getCourseById = getCourseById;
// --- 3. Get All Courses ---
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
// --- 4. Update Course ---
const updateCourse = async (req, res) => {
    const { id } = req.params;
    const { name, categoryId, isHaveSemester, semesters: courseSemesters, teacherIds, preRequisition, whatYouGain, image, description, pricePlans } = req.body;
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    // Validation for Price Plans
    if (pricePlans && pricePlans.length > 0) {
        for (const plan of pricePlans) {
            if (plan.hasDiscount) {
                if (Number(plan.discountEgp) > Number(plan.priceEgp)) {
                    throw new BadRequest_1.BadRequest(`Discount EGP error in plan: ${plan.label}`);
                }
            }
        }
    }
    const imageURL = await (0, handleImages_1.handleImageUpdate)(req, course[0].image, image, "courses");
    if (categoryId) {
        const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
        if (existingCategory.length === 0)
            throw new BadRequest_1.BadRequest("Category not found");
        const childCategories = await connection_1.db.select({ id: schema_1.category.id }).from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, categoryId));
        if (childCategories.length > 0)
            throw new BadRequest_1.BadRequest("Cannot assign to non-leaf category.");
    }
    await connection_1.db.transaction(async (tx) => {
        // Update basic info
        await tx.update(schema_1.courses).set({
            name: name || course[0].name,
            categoryId: categoryId || course[0].categoryId,
            isHaveSemester: isHaveSemester !== undefined ? isHaveSemester : course[0].isHaveSemester,
            preRequisition: preRequisition || course[0].preRequisition,
            whatYouGain: whatYouGain || course[0].whatYouGain,
            image: imageURL || course[0].image,
            description: description || course[0].description,
        }).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
        // Update Price Plans
        if (pricePlans && pricePlans.length > 0) {
            await tx.delete(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetId, id), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "course")));
            const priceValues = pricePlans.map((plan, index) => ({
                id: (0, crypto_1.randomUUID)(),
                targetId: id,
                targetType: "course",
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
        // Update Teachers
        if (teacherIds) {
            const existingTeachers = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.inArray)(schema_1.teachers.id, teacherIds));
            if (existingTeachers.length !== teacherIds.length) {
                throw new BadRequest_1.BadRequest("One or more teachers not found");
            }
            await tx.delete(schema_1.courseTeachers).where((0, drizzle_orm_1.eq)(schema_1.courseTeachers.courseId, id));
            if (teacherIds.length > 0) {
                const courseTeacherValues = teacherIds.map((tId) => ({ courseId: id, teacherId: tId }));
                await tx.insert(schema_1.courseTeachers).values(courseTeacherValues);
            }
        }
        // Update Semesters
        if (isHaveSemester === false) {
            await tx.delete(schema_1.semesters).where((0, drizzle_orm_1.eq)(schema_1.semesters.courseId, id));
        }
        else if (isHaveSemester && courseSemesters) {
            await tx.delete(schema_1.semesters).where((0, drizzle_orm_1.eq)(schema_1.semesters.courseId, id));
            const semesterValues = courseSemesters.map((sem) => ({
                id: (0, crypto_1.randomUUID)(),
                name: sem.name,
                courseId: id,
            }));
            await tx.insert(schema_1.semesters).values(semesterValues);
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Course updated successfully" }, 200);
};
exports.updateCourse = updateCourse;
// --- 5. Delete Course ---
const deleteCourse = async (req, res) => {
    const { id } = req.params;
    const course = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    // Manual Cascade Logic
    const courseChapters = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, id));
    // Loop over each chapter in the course
    for (const chapter of courseChapters) {
        const chapterLessons = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, chapter.id));
        // Loop over each lesson in the chapter
        for (const lesson of chapterLessons) {
            // Delete all lesson ideas under this chapter
            await connection_1.db.delete(schema_1.lessonIdeas).where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, lesson.id));
            // Delete lesson image if exists
            if (lesson.image) {
                await (0, handleImages_1.deleteImage)(lesson.image);
            }
        }
        // Delete all lessons under this chapter
        await connection_1.db.delete(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, chapter.id));
    }
    await connection_1.db.transaction(async (tx) => {
        await tx.delete(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetId, id), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "course")));
        await tx.delete(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, id));
        await tx.delete(schema_1.semesters).where((0, drizzle_orm_1.eq)(schema_1.semesters.courseId, id));
        if (course[0].image) {
            await (0, handleImages_1.deleteImage)(course[0].image);
        }
        await tx.delete(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
    });
    return (0, response_1.SuccessResponse)(res, { message: "Course deleted successfully" }, 200);
};
exports.deleteCourse = deleteCourse;
// --- 6. Add Teacher To Course ---
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
// --- 7. Remove Teacher From Course ---
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
// --- 8. Get Course Teachers ---
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
// --- 9. Get Categories Selection ---
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
// --- 10. Get Courses By Category ID ---
const getCoursesbyCategoryId = async (req, res) => {
    const { categoryId } = req.params;
    if (!categoryId) {
        throw new BadRequest_1.BadRequest("Category ID is required");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    const coursesData = await connection_1.db.select({
        id: schema_1.courses.id,
        name: schema_1.courses.name,
        description: schema_1.courses.description,
        image: schema_1.courses.image,
        preRequisition: schema_1.courses.preRequisition,
        whatYouGain: schema_1.courses.whatYouGain,
        createdAt: schema_1.courses.createdAt,
        updatedAt: schema_1.courses.updatedAt,
        isHaveSemester: schema_1.courses.isHaveSemester,
    })
        .from(schema_1.courses)
        .where((0, drizzle_orm_1.eq)(schema_1.courses.categoryId, categoryId));
    if (coursesData.length === 0) {
        return (0, response_1.SuccessResponse)(res, { message: "Courses fetched successfully", data: [] }, 200);
    }
    const courseIds = coursesData.map(c => c.id);
    const allPrices = await connection_1.db.select().from(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.prices.targetId, courseIds), (0, drizzle_orm_1.eq)(schema_1.prices.targetType, "course")));
    const teachersData = await connection_1.db.select({
        courseId: schema_1.courseTeachers.courseId,
        teacherId: schema_1.teachers.id,
        name: schema_1.teachers.name,
        email: schema_1.teachers.email,
        avatar: schema_1.teachers.avatar,
        role: schema_1.courseTeachers.role,
    })
        .from(schema_1.courseTeachers)
        .innerJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(schema_1.courseTeachers.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.inArray)(schema_1.courseTeachers.courseId, courseIds));
    const semestersData = await connection_1.db.select({
        id: schema_1.semesters.id,
        name: schema_1.semesters.name,
        courseId: schema_1.semesters.courseId,
    }).from(schema_1.semesters).where((0, drizzle_orm_1.inArray)(schema_1.semesters.courseId, courseIds));
    const result = coursesData.map(course => ({
        ...course,
        prices: allPrices.filter(p => p.targetId === course.id),
        teachers: teachersData.filter(t => t.courseId === course.id),
        semesters: semestersData.filter(s => s.courseId === course.id)
    }));
    return (0, response_1.SuccessResponse)(res, { message: "Courses fetched successfully", data: result }, 200);
};
exports.getCoursesbyCategoryId = getCoursesbyCategoryId;
// --- 11. Get Courses Selection ---
const selectionCourses = async (req, res) => {
    const coursesList = await connection_1.db
        .select({
        id: schema_1.courses.id,
        name: schema_1.courses.name
    })
        .from(schema_1.courses)
        .orderBy((0, drizzle_orm_1.asc)(schema_1.courses.name));
    (0, response_1.SuccessResponse)(res, coursesList.map(c => ({
        value: c.id,
        label: c.name
    })));
};
exports.selectionCourses = selectionCourses;
