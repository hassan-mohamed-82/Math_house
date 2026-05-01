import { Request, Response } from "express";
import { db } from "../../models/connection";
import { courses, category, teachers, chapters, courseTeachers, semesters, lessons, lessonIdeas, prices } from "../../models/schema";
import { eq, count, inArray, and, aliasedTable, isNull, asc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";
import { randomUUID } from "crypto";

// --- 1. Create Course ---
export const createCourse = async (req: Request, res: Response) => {
    const {
        name, categoryId, isHaveSemester, semesters: courseSemesters,
        teacherIds, preRequisition, whatYouGain, duration,
        image, description, pricePlans
    } = req.body;

    // validation of basic data
    if (!name || !categoryId || !duration) {
        throw new BadRequest("Name, Category, and Duration are required");
    }
    // validation of price plans
    if (!pricePlans || pricePlans.length === 0) {
        throw new BadRequest("Price Plans are required");
    }

    const courseExist = await db.select().from(courses).where(eq(courses.name, name));
    if (courseExist.length > 0) {
        throw new BadRequest("Course already exists");
    }

    const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    // validation of category
    const childCategories = await db.select({ id: category.id }).from(category).where(eq(category.parentCategoryId, categoryId));
    if (childCategories.length > 0) {
        throw new BadRequest("Cannot assign a course to a non-leaf category. Please select a category with no sub-categories.");
    }

    // validation of semesters
    if (isHaveSemester && courseSemesters && courseSemesters.length > 0) {
        for (const sem of courseSemesters) {
            if (!sem.name) {
                throw new BadRequest("Semester name is required when creating a semester");
            }
        }
    }

    // validation of teachers
    if (teacherIds && teacherIds.length > 0) {
        const existingTeachers = await db.select().from(teachers).where(inArray(teachers.id, teacherIds));
        if (existingTeachers.length !== teacherIds.length) {
            throw new BadRequest("One or more teachers not found");
        }
    }

    // validation of price plans
    for (const plan of pricePlans) {
        if (plan.hasDiscount) {
            if (Number(plan.discountEgp) > Number(plan.priceEgp)) {
                throw new BadRequest(`EGP Discount cannot be greater than price in plan: ${plan.label}`);
            }
            if (Number(plan.discountUsd) > Number(plan.priceUsd)) {
                throw new BadRequest(`USD Discount cannot be greater than price in plan: ${plan.label}`);
            }
        }
    }

    let imageURL = "";
    if (image) {
        imageURL = await validateAndSaveLogo(req, image, "courses");
    }

    const courseId = randomUUID();

    // استخدام Transaction لضمان حفظ الكورس وأسعاره معاً
    await db.transaction(async (tx) => {
        await tx.insert(courses).values({
            id: courseId,
            name,
            categoryId,
            isHaveSemester: isHaveSemester || false,
            preRequisition,
            whatYouGain,
            image: imageURL,
            description,
        });

        const priceValues = pricePlans.map((plan: any, index: number) => ({
            id: randomUUID(),
            targetId: courseId,
            targetType: "course" as const,
            durationLabel: plan.label,
            durationDays: plan.days,
            priceEgp: plan.priceEgp,
            priceUsd: plan.priceUsd,
            discountEgp: plan.discountEgp || "0.00",
            discountUsd: plan.discountUsd || "0.00",
            hasDiscount: plan.hasDiscount || false,
            isDefault: index === 0,
        }));
        await tx.insert(prices).values(priceValues);

        if (teacherIds && teacherIds.length > 0) {
            const courseTeacherValues = teacherIds.map((teacherId: string) => ({
                courseId,
                teacherId,
            }));
            await tx.insert(courseTeachers).values(courseTeacherValues);
        }

        if (isHaveSemester && courseSemesters && courseSemesters.length > 0) {
            const semesterValues = courseSemesters.map((sem: any) => ({
                id: randomUUID(),
                name: sem.name,
                courseId: courseId,
            }));
            await tx.insert(semesters).values(semesterValues);
        }
    });

    return SuccessResponse(res, { message: "Course created successfully" }, 200);
};

// --- 2. Get Course By ID ---
export const getCourseById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }

    const coursePrices = await db.select()
        .from(prices)
        .where(and(eq(prices.targetId, id), eq(prices.targetType, "course")));

    const courseTeachersList = await db.select({
        teacherId: courseTeachers.teacherId,
        teacherName: teachers.name,
        role: courseTeachers.role,
    })
        .from(courseTeachers)
        .leftJoin(teachers, eq(courseTeachers.teacherId, teachers.id))
        .where(eq(courseTeachers.courseId, id));

    const courseSemestersList = await db.select({
        id: semesters.id,
        name: semesters.name,
    })
        .from(semesters)
        .where(eq(semesters.courseId, id));

    return SuccessResponse(res, {
        ...course[0],
        prices: coursePrices,
        teachers: courseTeachersList,
        semesters: courseSemestersList
    }, 200);
};

// --- 3. Get All Courses ---
export const getAllCourses = async (req: Request, res: Response) => {
    const allCourses = await db.select({
        name: courses.name,
        id: courses.id,
        category: category.name,
        numberOfChapters: count(chapters.id),
    })
        .from(courses)
        .leftJoin(category, eq(courses.categoryId, category.id))
        .leftJoin(chapters, eq(courses.id, chapters.courseId))
        .groupBy(courses.id, courses.name, category.name);

    return SuccessResponse(res, { message: "All Courses Retrieved Successfully", courses: allCourses }, 200);
};

// --- 4. Update Course ---
export const updateCourse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        name, categoryId, isHaveSemester, semesters: courseSemesters,
        teacherIds, preRequisition, whatYouGain, duration,
        image, description, pricePlans
    } = req.body;

    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }

    // Validation for Price Plans
    if (pricePlans && pricePlans.length > 0) {
        for (const plan of pricePlans) {
            if (plan.hasDiscount) {
                if (Number(plan.discountEgp) > Number(plan.priceEgp)) {
                    throw new BadRequest(`Discount EGP error in plan: ${plan.label}`);
                }
            }
        }
    }

    const imageURL = await handleImageUpdate(req, course[0].image, image, "courses");

    if (categoryId) {
        const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
        if (existingCategory.length === 0) throw new BadRequest("Category not found");
        const childCategories = await db.select({ id: category.id }).from(category).where(eq(category.parentCategoryId, categoryId));
        if (childCategories.length > 0) throw new BadRequest("Cannot assign to non-leaf category.");
    }

    await db.transaction(async (tx) => {
        // Update basic info
        await tx.update(courses).set({
            name: name || course[0].name,
            categoryId: categoryId || course[0].categoryId,
            isHaveSemester: isHaveSemester !== undefined ? isHaveSemester : course[0].isHaveSemester,
            preRequisition: preRequisition || course[0].preRequisition,
            whatYouGain: whatYouGain || course[0].whatYouGain,
            image: imageURL || course[0].image,
            description: description || course[0].description,
        }).where(eq(courses.id, id));

        // Update Price Plans
        if (pricePlans && pricePlans.length > 0) {
            await tx.delete(prices).where(and(eq(prices.targetId, id), eq(prices.targetType, "course")));
            const priceValues = pricePlans.map((plan: any, index: number) => ({
                id: randomUUID(),
                targetId: id,
                targetType: "course" as const,
                durationLabel: plan.label,
                durationDays: plan.days,
                priceEgp: plan.priceEgp,
                priceUsd: plan.priceUsd,
                discountEgp: plan.discountEgp || "0.00",
                discountUsd: plan.discountUsd || "0.00",
                hasDiscount: plan.hasDiscount || false,
                isDefault: index === 0,
            }));
            await tx.insert(prices).values(priceValues);
        }

        // Update Teachers
        if (teacherIds) {
            const existingTeachers = await db.select().from(teachers).where(inArray(teachers.id, teacherIds));
            if (existingTeachers.length !== teacherIds.length) {
                throw new BadRequest("One or more teachers not found");
            }

            await tx.delete(courseTeachers).where(eq(courseTeachers.courseId, id));
            if (teacherIds.length > 0) {
                const courseTeacherValues = teacherIds.map((tId: string) => ({ courseId: id, teacherId: tId }));
                await tx.insert(courseTeachers).values(courseTeacherValues);
            }
        }

        // Update Semesters
        if (isHaveSemester === false) {
            await tx.delete(semesters).where(eq(semesters.courseId, id));
        } else if (isHaveSemester && courseSemesters) {
            await tx.delete(semesters).where(eq(semesters.courseId, id));
            const semesterValues = courseSemesters.map((sem: any) => ({
                id: randomUUID(),
                name: sem.name,
                courseId: id,
            }));
            await tx.insert(semesters).values(semesterValues);
        }
    });

    return SuccessResponse(res, { message: "Course updated successfully" }, 200);
};

// --- 5. Delete Course ---
export const deleteCourse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }

    // Manual Cascade Logic
    const courseChapters = await db.select().from(chapters).where(eq(chapters.courseId, id));

    // Loop over each chapter in the course
    for (const chapter of courseChapters) {
        const chapterLessons = await db.select().from(lessons).where(eq(lessons.chapterId, chapter.id));

        // Loop over each lesson in the chapter
        for (const lesson of chapterLessons) {
            // Delete all lesson ideas under this chapter
            await db.delete(lessonIdeas).where(eq(lessonIdeas.lessonId, lesson.id));

            // Delete lesson image if exists
            if (lesson.image) {
                await deleteImage(lesson.image);
            }
        }

        // Delete all lessons under this chapter
        await db.delete(lessons).where(eq(lessons.chapterId, chapter.id));
    }

    await db.transaction(async (tx) => {
        await tx.delete(prices).where(and(eq(prices.targetId, id), eq(prices.targetType, "course")));
        await tx.delete(chapters).where(eq(chapters.courseId, id));
        await tx.delete(semesters).where(eq(semesters.courseId, id));
        if (course[0].image) {
            await deleteImage(course[0].image);
        }
        await tx.delete(courses).where(eq(courses.id, id));
    });


    return SuccessResponse(res, { message: "Course deleted successfully" }, 200);
};

// --- 6. Add Teacher To Course ---
export const addTeacherToCourse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { teacherId, role } = req.body;

    if (!teacherId) {
        throw new BadRequest("Teacher ID is required");
    }

    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }

    const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId));
    if (teacher.length === 0) {
        throw new BadRequest("Teacher not found");
    }

    // Check if teacher is already assigned to this course
    const existingAssignment = await db.select()
        .from(courseTeachers)
        .where(and(eq(courseTeachers.courseId, id), eq(courseTeachers.teacherId, teacherId)));

    if (existingAssignment.length > 0) {
        throw new BadRequest("Teacher is already assigned to this course");
    }

    await db.insert(courseTeachers).values({
        courseId: id,
        teacherId,
        role: role || "instructor",
    });

    return SuccessResponse(res, { message: "Teacher added to course successfully" }, 200);
};
// --- 7. Remove Teacher From Course ---
export const removeTeacherFromCourse = async (req: Request, res: Response) => {
    const { id, teacherId } = req.params;

    const assignment = await db.select()
        .from(courseTeachers)
        .where(and(eq(courseTeachers.courseId, id), eq(courseTeachers.teacherId, teacherId)));

    if (assignment.length === 0) {
        throw new BadRequest("Teacher is not assigned to this course");
    }

    await db.delete(courseTeachers)
        .where(and(eq(courseTeachers.courseId, id), eq(courseTeachers.teacherId, teacherId)));

    return SuccessResponse(res, { message: "Teacher removed from course successfully" }, 200);
};

// --- 8. Get Course Teachers ---
export const getCourseTeachers = async (req: Request, res: Response) => {
    const { id } = req.params;

    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }

    const courseTeachersList = await db.select({
        teacherId: courseTeachers.teacherId,
        teacherName: teachers.name,
        teacherEmail: teachers.email,
        role: courseTeachers.role,
        assignedAt: courseTeachers.createdAt,
    })
        .from(courseTeachers)
        .leftJoin(teachers, eq(courseTeachers.teacherId, teachers.id))
        .where(eq(courseTeachers.courseId, id));

    return SuccessResponse(res, { teachers: courseTeachersList }, 200);
};

// --- 9. Get Categories Selection ---
export const getCategoriesSelection = async (req: Request, res: Response) => {
    const child = aliasedTable(category, "child");

    const categories = await db.selectDistinct({
        id: category.id,
        name: category.name
    })
        .from(category)
        .leftJoin(child, eq(child.parentCategoryId, category.id))
        .where(isNull(child.id));

    return SuccessResponse(res, { message: "Categories fetched successfully", data: categories }, 200);
};

// --- 10. Get Courses By Category ID ---
export const getCoursesbyCategoryId = async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    if (!categoryId) {
        throw new BadRequest("Category ID is required");
    }
    const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    const coursesData = await db.select({
        id: courses.id,
        name: courses.name,
        description: courses.description,
        image: courses.image,
        preRequisition: courses.preRequisition,
        whatYouGain: courses.whatYouGain,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        isHaveSemester: courses.isHaveSemester,
    })
        .from(courses)
        .where(eq(courses.categoryId, categoryId));

    if (coursesData.length === 0) {
        return SuccessResponse(res, { message: "Courses fetched successfully", data: [] }, 200);
    }

    const courseIds = coursesData.map(c => c.id);
    const allPrices = await db.select().from(prices).where(and(inArray(prices.targetId, courseIds), eq(prices.targetType, "course")));
    const teachersData = await db.select({
        courseId: courseTeachers.courseId,
        teacherId: teachers.id,
        name: teachers.name,
        email: teachers.email,
        avatar: teachers.avatar,
        role: courseTeachers.role,
    })
        .from(courseTeachers)
        .innerJoin(teachers, eq(courseTeachers.teacherId, teachers.id))
        .where(inArray(courseTeachers.courseId, courseIds));

    const semestersData = await db.select({
        id: semesters.id,
        name: semesters.name,
        courseId: semesters.courseId,
    }).from(semesters).where(inArray(semesters.courseId, courseIds));

    const result = coursesData.map(course => ({
        ...course,
        prices: allPrices.filter(p => p.targetId === course.id),
        teachers: teachersData.filter(t => t.courseId === course.id),
        semesters: semestersData.filter(s => s.courseId === course.id)
    }));

    return SuccessResponse(res, { message: "Courses fetched successfully", data: result }, 200);
};

// --- 11. Get Courses Selection ---
export const selectionCourses = async (req: Request, res: Response) => {
    const coursesList = await db
        .select({
            id: courses.id,
            name: courses.name
        })
        .from(courses)
        .orderBy(asc(courses.name));

    SuccessResponse(res, coursesList.map(c => ({
        value: c.id,
        label: c.name
    })));
};