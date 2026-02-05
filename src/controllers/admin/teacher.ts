import { Request, Response } from "express";
import { db } from "../../models/connection";
import { category, courses, teachers, courseTeachers } from "../../models/schema";
import { eq, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";
import { randomUUID } from "crypto";

export const createTeacher = async (req: Request, res: Response) => {
    const { name, email, phoneNumber, password, avatar, categoryId, courseId } = req.body;
    if (!name || !email || !phoneNumber || !password) {
        throw new BadRequest("Name, Email, Phone Number, Password are required");
    }
    const existingTeacher = await db.select().from(teachers).where(eq(teachers.email, email));
    if (existingTeacher.length > 0) {
        throw new BadRequest("Teacher already exists");
    }
    const avatarURL = await validateAndSaveLogo(req, avatar, "teachers");

    if (categoryId) {
        const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest("Category not found");
        }
    }
    // Add Teacher to Course if courseId is provided
    if (courseId) {
        const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
        if (existingCourse.length === 0) {
            throw new BadRequest("Course not found");
        }
    }
    // ---------------------------------------------------

    // Generate teacher ID
    const teacherId = randomUUID();

    await db.insert(teachers).values({
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
        await db.insert(courseTeachers).values({
            courseId,
            teacherId,
        });
    }

    return SuccessResponse(res, { message: "Teacher created successfully" }, 200);
}

export const getTeacherById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const teacher = await db.select().from(teachers).where(eq(teachers.id, id));
    if (teacher.length === 0) {
        throw new BadRequest("Teacher not found");
    }
    return SuccessResponse(res, { message: "Teacher fetched successfully", teacher: teacher[0] }, 200);
}

export const getAllTeachers = async (req: Request, res: Response) => {
    const teacher = await db.select().from(teachers);
    return SuccessResponse(res, { message: "Teachers fetched successfully", teacher }, 200);
}

export const updateTeacher = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, phoneNumber, password, avatar } = req.body;
    if (!name || !email || !phoneNumber || !password) {
        throw new BadRequest("Name, Email, Phone Number, Password are required");
    }
    const existingTeacher = await db.select().from(teachers).where(eq(teachers.id, id));
    if (existingTeacher.length === 0) {
        throw new BadRequest("Teacher not found");
    }
    const avatarURL = await handleImageUpdate(req, existingTeacher[0].avatar, avatar, "teachers");
    await db.update(teachers).set({
        name,
        email,
        phoneNumber,
        password,
        avatar: avatarURL,
    }).where(eq(teachers.id, id));
    return SuccessResponse(res, { message: "Teacher updated successfully" }, 200);
}

export const deleteTeacher = async (req: Request, res: Response) => {
    const { id } = req.params;
    const existingTeacher = await db.select().from(teachers).where(eq(teachers.id, id));
    if (existingTeacher.length === 0) {
        throw new BadRequest("Teacher not found");
    }
    if (existingTeacher[0].avatar) {
        await deleteImage(existingTeacher[0].avatar);
    }
    await db.delete(teachers).where(eq(teachers.id, id));
    return SuccessResponse(res, { message: "Teacher deleted successfully" }, 200);
}