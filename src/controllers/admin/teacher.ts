import { Request, Response } from "express";
import { db } from "../../models/connection";
import { category, courses, teachers } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";

export const createTeacher = async (req: Request, res: Response) => {
    const { name, email, phoneNumber, password, avatar, categoryId, courseId } = req.body;
    if (!name || !email || !phoneNumber || !password) {
        throw new BadRequest("Name, Email, Phone Number, Password are required");
    }
    const existingTeacher = await db.select().from(teachers).where(eq(teachers.email, email));
    if (existingTeacher.length > 0) {
        throw new BadRequest("Teacher already exists");
    }
    const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }
    const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest("Course not found");
    }
    const avatarURL = await validateAndSaveLogo(req, avatar, "teachers");
    await db.insert(teachers).values({
        name,
        email,
        phoneNumber,
        password,
        avatar: avatarURL,
        categoryId,
        courseId,
    });
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
    const { name, email, phoneNumber, password, avatar, categoryId, courseId } = req.body;
    if (!name || !email || !phoneNumber || !password) {
        throw new BadRequest("Name, Email, Phone Number, Password are required");
    }
    const existingTeacher = await db.select().from(teachers).where(eq(teachers.id, id));
    if (existingTeacher.length === 0) {
        throw new BadRequest("Teacher not found");
    }
    const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }
    const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
    if (existingCourse.length === 0) {
        throw new BadRequest("Course not found");
    }
    const avatarURL = await handleImageUpdate(req, existingTeacher[0].avatar, avatar, "teachers");
    await db.update(teachers).set({
        name,
        email,
        phoneNumber,
        password,
        avatar: avatarURL,
        categoryId,
        courseId,
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