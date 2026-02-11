import { Request, Response } from "express";
import { db } from "../../models/connection";
import { courses, category, teachers, chapters, courseTeachers, semesters, lessons, lessonIdeas } from "../../models/schema";
import { eq, count, inArray, and, aliasedTable, isNull } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";
import { randomUUID } from "crypto";

// ADD switch from the front end to use Semester ID if needed
export const createCourse = async (req: Request, res: Response) => {
    const { name, categoryId, semesterId, teacherIds, preRequisition, whatYouGain, duration, image, description, price, discount } = req.body;

    if (!name || !categoryId || !duration || !price) {
        throw new BadRequest("Name, Category, Duration, Price are required");
    }

    const course = await db.select().from(courses).where(eq(courses.name, name));
    if (course.length > 0) {
        throw new BadRequest("Course already exists");
    }

    const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    // Ensure the category is a leaf (has no children)
    const childCategories = await db.select({ id: category.id }).from(category).where(eq(category.parentCategoryId, categoryId));
    if (childCategories.length > 0) {
        throw new BadRequest("Cannot assign a course to a non-leaf category. Please select a category with no sub-categories.");
    }
    if (semesterId) {
        const existingSemester = await db.select().from(semesters).where(eq(semesters.id, semesterId));
        if (existingSemester.length === 0) {
            throw new BadRequest("Semester not found");
        }
    }
    // Validate teachers if provided
    if (teacherIds && teacherIds.length > 0) {
        const existingTeachers = await db.select().from(teachers).where(inArray(teachers.id, teacherIds));
        if (existingTeachers.length !== teacherIds.length) {
            throw new BadRequest("One or more teachers not found");
        }
    }

    if (discount) {
        if (discount > price) {
            throw new BadRequest("Discount cannot be greater than price");
        }
    }

    let imageURL = "";
    if (image) {
        imageURL = await validateAndSaveLogo(req, image, "courses");
    }

    // Generate course ID
    const courseId = randomUUID();

    // Insert the course
    await db.insert(courses).values({
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
        const courseTeacherValues = teacherIds.map((teacherId: string) => ({
            courseId,
            teacherId,
        }));
        await db.insert(courseTeachers).values(courseTeacherValues);
    }

    return SuccessResponse(res, { message: "Course created successfully", courseId }, 200);
};

export const getCourseById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }

    // Get teachers for this course
    const courseTeachersList = await db.select({
        teacherId: courseTeachers.teacherId,
        teacherName: teachers.name,
        role: courseTeachers.role,
    })
        .from(courseTeachers)
        .leftJoin(teachers, eq(courseTeachers.teacherId, teachers.id))
        .where(eq(courseTeachers.courseId, id));

    return SuccessResponse(res, { ...course[0], teachers: courseTeachersList }, 200);
}

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
}

export const updateCourse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, categoryId, semesterId, teacherIds, preRequisition, whatYouGain, duration, image, description, price, discount } = req.body;

    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }

    if (discount) {
        if (discount > price) {
            throw new BadRequest("Discount cannot be greater than price");
        }
    }

    const imageURL = await handleImageUpdate(req, course[0].image, image, "courses");

    if (categoryId) {
        const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest("Category not found");
        }

        // Ensure the category is a leaf (has no children)
        const childCategories = await db.select({ id: category.id }).from(category).where(eq(category.parentCategoryId, categoryId));
        if (childCategories.length > 0) {
            throw new BadRequest("Cannot assign a course to a non-leaf category. Please select a category with no sub-categories.");
        }
    }

    // Validate and update teachers if provided
    if (teacherIds && teacherIds.length > 0) {
        const existingTeachers = await db.select().from(teachers).where(inArray(teachers.id, teacherIds));
        if (existingTeachers.length !== teacherIds.length) {
            throw new BadRequest("One or more teachers not found");
        }

        // Remove existing teachers and add new ones
        await db.delete(courseTeachers).where(eq(courseTeachers.courseId, id));
        const courseTeacherValues = teacherIds.map((teacherId: string) => ({
            courseId: id,
            teacherId,
        }));
        await db.insert(courseTeachers).values(courseTeacherValues);
    }

    await db.update(courses).set({
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
    }).where(eq(courses.id, id));

    return SuccessResponse(res, { message: "Course updated successfully" }, 200);
}

export const deleteCourse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }

    // Cascade: find all chapters under this course
    const courseChapters = await db.select().from(chapters).where(eq(chapters.courseId, id));

    for (const chapter of courseChapters) {
        // Find all lessons under this chapter
        const chapterLessons = await db.select().from(lessons).where(eq(lessons.chapterId, chapter.id));

        for (const lesson of chapterLessons) {
            // Delete all ideas under this lesson
            await db.delete(lessonIdeas).where(eq(lessonIdeas.lessonId, lesson.id));

            // Delete lesson image if exists
            if (lesson.image) {
                await deleteImage(lesson.image);
            }
        }

        // Delete all lessons under this chapter
        await db.delete(lessons).where(eq(lessons.chapterId, chapter.id));
    }

    // Delete all chapters under this course
    await db.delete(chapters).where(eq(chapters.courseId, id));

    // Delete course image
    if (course[0].image) {
        await deleteImage(course[0].image);
    }

    // Delete the course (junction table entries handled by ON DELETE CASCADE)
    await db.delete(courses).where(eq(courses.id, id));
    return SuccessResponse(res, { message: "Course deleted successfully" }, 200);
}

// New endpoint to add a teacher to an existing course
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
}

// New endpoint to remove a teacher from a course
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
}

// New endpoint to get all teachers for a course
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
}

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
}