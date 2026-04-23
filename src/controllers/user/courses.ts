import { Request, Response } from "express";
import { courses } from "../../models/schema/admin/courses";
import { db } from "../../models/connection";
import { category, teachers, chapters, courseTeachers, semesters, Student } from "../../models/schema";
import { eq, count } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";

// 1. Get all courses 
export const getAllCourses = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const [student] = await db.select({ category: Student.category })
        .from(Student)
        .where(eq(Student.id, studentId));

    if (!student) throw new BadRequest("Student not found");

    const studentCategory = student.category;

    const query = db.select({
        id: courses.id,
        name: courses.name,
        price: courses.totalPrice,
        category: category.name,
        numberOfChapters: count(chapters.id),
    })
        .from(courses)
        .leftJoin(category, eq(courses.categoryId, category.id))
        .leftJoin(chapters, eq(courses.id, chapters.courseId))
        .where(eq(courses.categoryId, studentCategory));

    const allCourses = await query.groupBy(courses.id, courses.name, category.name);

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
