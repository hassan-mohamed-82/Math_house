import { Request, Response } from "express";
import { db } from "../../models/connection";
import { Student, category, wallet } from "../../models/schema";
import { generateToken } from "../../utils/auth";
import { compare, hash } from "bcrypt";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors";
import { eq, isNull } from "drizzle-orm";
import { consumePasswordResetCode, sendPasswordResetEmail, verifyPasswordResetCode } from "../../utils/sendEmails";

export const studentSignup = async (req: Request, res: Response) => {
    const {
        firstname,
        lastname,
        nickname,
        email,
        password,
        phone,
        category: categoryId,
        grade,
    } = req.body;

    if (!firstname || !lastname || !nickname || !email || !password || !phone || !categoryId || !grade) {
        throw new BadRequest("All required fields must be provided");
    }

    const existingStudent = await db.select().from(Student).where(eq(Student.email, email));
    if (existingStudent.length > 0) {
        throw new BadRequest("Email is already registered");
    }

    const existingCategory = await db
        .select({ id: category.id, name: category.name, parentCategoryId: category.parentCategoryId })
        .from(category)
        .where(eq(category.id, categoryId));

    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    if (existingCategory[0].parentCategoryId) {
        throw new BadRequest("Student must be assigned to a main category only");
    }

    const hashedPassword = await hash(password, 10);

    await db.transaction(async (tx) => {
        await tx.insert(Student).values({
            firstname,
            lastname,
            nickname,
            email,
            password: hashedPassword,
            phone,
            category: categoryId,
            grade,
        });

        const [createdStudent] = await tx
            .select({ id: Student.id })
            .from(Student)
            .where(eq(Student.email, email));

        if (!createdStudent) {
            throw new BadRequest("Student could not be created");
        }

        await tx.insert(wallet).values({
            studentId: createdStudent.id,
            balance: 0,
        });
    });

    return SuccessResponse(res, {
        message: "Student registered successfully"
    }, 201);
};

export const studentLogin = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequest("Email and password are required");
    }

    const [student] = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            email: Student.email,
            password: Student.password,
            phone: Student.phone,
            category: Student.category,
            categoryName: category.name,
            grade: Student.grade,
        })
        .from(Student)
        .leftJoin(category, eq(Student.category, category.id))
        .where(eq(Student.email, email));

    if (!student) {
        throw new BadRequest("Invalid Credentials");
    }

    const isPasswordValid = await compare(password, student.password);
    if (!isPasswordValid) {
        throw new BadRequest("Invalid Credentials");
    }

    const token = generateToken({
        id: student.id,
        name: `${student.firstname} ${student.lastname}`,
        email: student.email,
        role: "student"
    });

    return SuccessResponse(res, {
        message: "Student logged in successfully",
        token,
        student: {
            id: student.id,
            firstname: student.firstname,
            lastname: student.lastname,
            email: student.email,
            phone: student.phone,
            category: {
                id: student.category,
                name: student.categoryName,
            },
            grade: student.grade
        }
    }, 200);
};


export const selectcategoryandgrade = async (req: Request, res: Response) => {
    const categories = await db
        .select({
            id: category.id,
            name: category.name,
            description: category.description,
            image: category.image,
        })
        .from(category)
        .where(isNull(category.parentCategoryId));

    const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
    return SuccessResponse(res, {
        message: "Categories and grades fetched successfully",
        categories,
        grades
    }, 200);
};

export const forgetPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        throw new BadRequest("Email is required");
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [student] = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            email: Student.email,
        })
        .from(Student)
        .where(eq(Student.email, normalizedEmail));

    if (student) {
        await sendPasswordResetEmail(student.email, `${student.firstname} ${student.lastname}`);
    }

    return SuccessResponse(res, {message: "Password reset instructions sent to email"});
}

export const validatePasswordResetCode = async (req: Request, res: Response) => {
    const { email, code } = req.body;
    if (!email || !code) {
        throw new BadRequest("Email and reset code are required");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const isValid = await verifyPasswordResetCode(normalizedEmail, String(code).trim());

    if (!isValid) {
        throw new BadRequest("Invalid or expired reset code");
    }

    return SuccessResponse(res, {message: "Reset code is valid"});
}

export const resetPassword = async (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
        throw new BadRequest("Email, reset code and newPassword are required");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCode = String(code).trim();

    const [student] = await db
        .select({
            id: Student.id,
            email: Student.email,
        })
        .from(Student)
        .where(eq(Student.email, normalizedEmail));

    if (!student) {
        throw new BadRequest("Invalid or expired reset code");
    }

    const isValid = await verifyPasswordResetCode(normalizedEmail, normalizedCode);

    if (!isValid) {
        throw new BadRequest("Invalid or expired reset code");
    }

    const hashedPassword = await hash(String(newPassword), 10);

    await db
        .update(Student)
        .set({ password: hashedPassword })
        .where(eq(Student.id, student.id));

    await consumePasswordResetCode(normalizedEmail);

    return SuccessResponse(res, { message: "Password reset successfully" });
}