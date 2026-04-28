import { Request, Response } from "express";
import { courses } from "../../models/schema/admin/courses";
import { db } from "../../models/connection";
import { category, teachers, chapters, courseTeachers, semesters, Student, grade } from "../../models/schema";
import { eq, count, inArray, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";

// 1. Get all courses 
export const getAllCourses = async (req: Request, res: Response) => {
    const studentId = req.user.id;

    // 1. Get student's category (parent category) and grade
    const [student] = await db
        .select({ category: Student.category, grade: Student.grade })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new BadRequest("Student not found");

    const studentParentCategory = student.category;
    const studentGrade = student.grade;

    // 2. Find all child categories whose parentCategoryId = student's category
    const childCategories = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.id, studentParentCategory));

    if (childCategories.length === 0) {
        return SuccessResponse(res, { message: "All Courses Retrieved Successfully", courses: [] }, 200);
    }

    const childCategoryIds = childCategories.map((c) => c.id);

    // 3. Return courses in those child categories where the grade matches the student's grade
    const allCourses = await db
        .select({
            id: courses.id,
            name: courses.name,
            price: courses.totalPrice,
            category: category.name,
            numberOfChapters: count(chapters.id),
        })
        .from(courses)
        .leftJoin(category, eq(courses.categoryId, category.id))
        .leftJoin(grade, eq(grade.categoryId, category.id))
        .leftJoin(chapters, eq(courses.id, chapters.courseId))
        .where(
            and(
                inArray(courses.categoryId, childCategoryIds),
                eq(grade.id, studentGrade)
            )
        )
        .groupBy(courses.id, courses.name, category.name);

    return SuccessResponse(res, { message: "All Courses Retrieved Successfully", courses: allCourses }, 200);
}

// 2. Get course by id 
export const getCourseById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) throw new BadRequest("Course not found");

    const teachersList = await db.select({
        name: teachers.name,
        role: courseTeachers.role,
    })
        .from(courseTeachers)
        .leftJoin(teachers, eq(courseTeachers.teacherId, teachers.id))
        .where(eq(courseTeachers.courseId, id));

    const courseSemestersList = await db.select({
        id: semesters.id,
        name: semesters.name,
        // price: semesters.price
    })
        .from(semesters)
        .where(eq(semesters.courseId, id));

    return SuccessResponse(res, { ...course, teachers: teachersList, semesters: courseSemestersList }, 200);
}
