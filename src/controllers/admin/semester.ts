import { Request, Response } from "express";
import { db } from "../../models/connection";
import { semesters } from "../../models/schema/admin/semester";
import { courses } from "../../models/schema/admin/courses";
import { category } from "../../models/schema/admin/category";
import { eq, sql, aliasedTable, isNull } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";

export const createSemester = async (req: Request, res: Response) => {
    const { name, courseId } = req.body;

    if (!name || !courseId) {
        throw new BadRequest("Name and Course are Required");
    }

    const exisitingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
    if (exisitingCourse.length === 0) {
        throw new NotFound("Course not found");
    }

    await db.insert(semesters).values({ name, courseId: courseId });
    return SuccessResponse(res, { message: "Semester created successfully" }, 201);
}

export const getSemesters = async (req: Request, res: Response) => {
    const AllSemesters = await db.select({
        id: semesters.id,
        name: semesters.name,
        courseId: semesters.courseId,
        course: {
            id: courses.id,
            name: courses.name,
            categoryId: courses.categoryId,
            categoryName: category.name
        }
    })
        .from(semesters)
        .innerJoin(courses, eq(courses.id, semesters.courseId))
        .innerJoin(category, eq(category.id, courses.categoryId));
    return SuccessResponse(res, { message: "Semesters fetched successfully", data: AllSemesters }, 200);
}

export const getSemesterbyId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Semester ID is required");
    }
    const semester = await db.select({
        id: semesters.id,
        name: semesters.name,
        courseId: semesters.courseId,
        course: {
            id: courses.id,
            name: courses.name,
            categoryId: courses.categoryId,
            categoryName: category.name
        }
    })
        .from(semesters)
        .innerJoin(courses, eq(courses.id, semesters.courseId))
        .innerJoin(category, eq(category.id, courses.categoryId))
        .where(eq(semesters.id, id));
    if (semester.length === 0) {
        throw new NotFound("Semester not found");
    }
    return SuccessResponse(res, { message: "Semester fetched successfully", data: semester }, 200);
}

export const getSemestersByCourseId = async (req: Request, res: Response) => {
    const { courseId } = req.params;
    if (!courseId) {
        throw new BadRequest("Course ID is required");
    }

    const exisitingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
    if (exisitingCourse.length === 0) {
        throw new NotFound("Course not found");
    }

    const courseSemesters = await db.select({
        id: semesters.id,
        name: semesters.name,
        courseId: semesters.courseId,
        course: {
            id: courses.id,
            name: courses.name,
            categoryId: courses.categoryId,
            categoryName: category.name
        }
    })
        .from(semesters)
        .innerJoin(courses, eq(courses.id, semesters.courseId))
        .innerJoin(category, eq(category.id, courses.categoryId))
        .where(eq(semesters.courseId, courseId));

    return SuccessResponse(res, { message: "Semesters fetched successfully", data: courseSemesters }, 200);
}

export const updateSemester = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, courseId } = req.body;
    if (!id) {
        throw new BadRequest("Semester ID is required");
    }
    if (courseId) {
        const exisitingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
        if (exisitingCourse.length === 0) {
            throw new NotFound("Course not found");
        }
    }
    const existingSemester = await db.select().from(semesters).where(eq(semesters.id, id));
    if (existingSemester.length === 0) {
        throw new NotFound("Semester not found");
    }

    await db.update(semesters).set({
        name: name || semesters.name,
        courseId: courseId || semesters.courseId
    }).where(eq(semesters.id, id));

    return SuccessResponse(res, { message: "Semester updated successfully" }, 200);
}

export const deleteSemester = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Semester ID is required");
    }
    const existingSemester = await db.select().from(semesters).where(eq(semesters.id, id));
    if (existingSemester.length === 0) {
        throw new NotFound("Semester not found");
    }
    await db.delete(semesters).where(eq(semesters.id, id));
    return SuccessResponse(res, { message: "Semester deleted successfully" }, 200);
}