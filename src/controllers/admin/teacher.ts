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
    const teacherData = await db.select({
        id: teachers.id,
        name: teachers.name,
        email: teachers.email,
        phoneNumber: teachers.phoneNumber,
        avatar: teachers.avatar,
        categoryId: teachers.categoryId,
        courses: {
            id: courses.id,
            name: courses.name,
        }
    }).from(teachers)
        .leftJoin(courseTeachers, eq(teachers.id, courseTeachers.teacherId))
        .leftJoin(courses, eq(courses.id, courseTeachers.courseId))
        .where(eq(teachers.id, id));

    if (teacherData.length === 0) {
        throw new BadRequest("Teacher not found");
    }

    const teacher = {
        id: teacherData[0].id,
        name: teacherData[0].name,
        email: teacherData[0].email,
        phoneNumber: teacherData[0].phoneNumber,
        avatar: teacherData[0].avatar,
        categoryId: teacherData[0].categoryId,
        courses: [] as any[]
    };

    teacherData.forEach((row) => {
        if (row.courses && row.courses.id) {
            teacher.courses.push(row.courses);
        }
    });

    return SuccessResponse(res, { message: "Teacher fetched successfully", teacher }, 200);
}

export const getAllTeachers = async (req: Request, res: Response) => {
    const teacherData = await db.select({
        id: teachers.id,
        name: teachers.name,
        email: teachers.email,
        phoneNumber: teachers.phoneNumber,
        avatar: teachers.avatar,
        categoryId: teachers.categoryId,
        courses: {
            id: courses.id,
            name: courses.name,
        }
    }).from(teachers)
        .leftJoin(courseTeachers, eq(teachers.id, courseTeachers.teacherId))
        .leftJoin(courses, eq(courses.id, courseTeachers.courseId));

    const teacherMap = new Map();

    teacherData.forEach((row) => {
        if (!teacherMap.has(row.id)) {
            teacherMap.set(row.id, {
                id: row.id,
                name: row.name,
                email: row.email,
                phoneNumber: row.phoneNumber,
                avatar: row.avatar,
                categoryId: row.categoryId,
                courses: [] as any[]
            });
        }
        if (row.courses && row.courses.id) {
            teacherMap.get(row.id).courses.push(row.courses);
        }
    });

    const teacher = Array.from(teacherMap.values());
    return SuccessResponse(res, { message: "Teachers fetched successfully", teacher }, 200);
}

export const updateTeacher = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, phoneNumber, password, avatar, categoryId, courseId } = req.body;

    // Check if teacher exists
    const existingTeacher = await db.select().from(teachers).where(eq(teachers.id, id));
    if (existingTeacher.length === 0) {
        throw new BadRequest("Teacher not found");
    }

    // Check email uniqueness if email is being changed
    if (email && email !== existingTeacher[0].email) {
        const emailTaken = await db.select().from(teachers).where(eq(teachers.email, email));
        if (emailTaken.length > 0) {
            throw new BadRequest("Email is already in use by another teacher");
        }
    }

    // Validate categoryId if provided
    if (categoryId) {
        const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest("Category not found");
        }
    }

    // Handle avatar update (saves new, deletes old, or keeps existing)
    const avatarURL = await handleImageUpdate(req, existingTeacher[0].avatar, avatar, "teachers");

    // Update teacher record
    await db.update(teachers).set({
        ...(name && { name }),
        ...(email && { email }),
        ...(phoneNumber && { phoneNumber }),
        ...(password && { password }),
        ...(avatarURL && { avatar: avatarURL }),
        ...(categoryId !== undefined && { categoryId }),
    }).where(eq(teachers.id, id));

    // Update course assignment if courseId is provided
    if (courseId) {
        const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId));
        if (existingCourse.length === 0) {
            throw new BadRequest("Course not found");
        }
        // Remove existing course assignments and add the new one
        await db.delete(courseTeachers).where(eq(courseTeachers.teacherId, id));
        await db.insert(courseTeachers).values({
            courseId,
            teacherId: id,
        });
    }

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

export const getCategorySelection = async (req: Request, res: Response) => {
    const allCategories = await db.select({
        id: category.id,
        name: category.name,
        parentCategoryId: category.parentCategoryId,
    }).from(category);

    const categoryMap = new Map<string, typeof allCategories[0]>();
    const parentIds = new Set<string>();

    allCategories.forEach(cat => {
        categoryMap.set(cat.id, cat);
        if (cat.parentCategoryId) {
            parentIds.add(cat.parentCategoryId);
        }
    });

    const leafCategories = allCategories.filter(cat => !parentIds.has(cat.id));

    const formattedCategories = leafCategories.map(leaf => {
        let current = leaf;
        const ancestors: string[] = [];

        while (current) {
            ancestors.unshift(current.name);
            if (current.parentCategoryId && categoryMap.has(current.parentCategoryId)) {
                current = categoryMap.get(current.parentCategoryId)!;
            } else {
                break;
            }
        }

        return {
            id: leaf.id,
            name: ancestors.join(" ")
        };
    });

    return SuccessResponse(res, { message: "Categories fetched successfully", data: formattedCategories }, 200);
}