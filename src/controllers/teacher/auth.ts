import { Request, Response } from "express";
import { db } from "../../models/connection";
import { teachers, category } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { UnauthorizedError, NotFound } from "../../Errors";
import bcrypt from "bcrypt";
import { generateToken } from "../../utils/auth";

export const teacherLogin = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequest("Email and password are required");
    }

    const [teacher] = await db
        .select()
        .from(teachers)
        .where(eq(teachers.email, email.trim().toLowerCase()));

    if (!teacher) {
        throw new UnauthorizedError("Invalid email or password");
    }

    let isPasswordValid = false;
    // Check with bcrypt
    try {
        isPasswordValid = await bcrypt.compare(password, teacher.password);
    } catch {
        isPasswordValid = false;
    }

    // Fallback: check plain-text if password was stored unhashed in seed or dev
    if (!isPasswordValid && teacher.password === password) {
        isPasswordValid = true;
    }

    if (!isPasswordValid) {
        throw new UnauthorizedError("Invalid email or password");
    }

    const token = generateToken({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: "teacher",
    });

    return SuccessResponse(res, {
        message: "Teacher logged in successfully",
        token,
        teacher: {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            phoneNumber: teacher.phoneNumber,
            avatar: teacher.avatar,
            categoryId: teacher.categoryId,
        },
    }, 200);
};

export const getTeacherProfile = async (req: Request, res: Response) => {
    const teacherId = req.user.id;

    const [teacher] = await db
        .select({
            id: teachers.id,
            name: teachers.name,
            email: teachers.email,
            phoneNumber: teachers.phoneNumber,
            avatar: teachers.avatar,
            categoryId: teachers.categoryId,
            categoryName: category.name,
            createdAt: teachers.createdAt,
        })
        .from(teachers)
        .leftJoin(category, eq(teachers.categoryId, category.id))
        .where(eq(teachers.id, teacherId));

    if (!teacher) {
        throw new NotFound("Teacher not found");
    }

    return SuccessResponse(res, {
        message: "Teacher profile fetched successfully",
        teacher,
    }, 200);
};
