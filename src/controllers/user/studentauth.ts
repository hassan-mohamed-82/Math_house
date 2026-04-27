import { Request, Response } from "express";
import { db } from "../../models/connection";
import { Student, category, wallet, grade as gradeTable } from "../../models/schema";
import { generateToken } from "../../utils/auth";
import { compare, hash } from "bcrypt";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors";
import { eq, isNull, and } from "drizzle-orm";
import { consumePasswordResetCode, sendPasswordResetEmail, sendStudentVerificationEmail, verifyEmailVerificationToken, verifyPasswordResetCode } from "../../utils/sendEmails";
import { validateAndSaveLogo, deleteImage } from "../../utils/handleImages";

const renderVerificationPage = ({
    title,
    message,
    statusCode = 200,
}: {
    title: string;
    message: string;
    statusCode?: number;
}) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head><body style="font-family: Segoe UI, Arial, sans-serif; background:#fff5f5; margin:0; padding:40px 16px;"><div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #f2d6d9; border-radius:24px; padding:32px; text-align:center; box-shadow:0 18px 60px rgba(215, 25, 40, 0.14);"><h1 style="color:#d71928; margin:0 0 12px;">${title}</h1><p style="color:#4b5563; margin:0; font-size:16px; line-height:1.7;">${message}</p><p style="display:none">${statusCode}</p></div></body></html>`;

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
        avatar,
    } = req.body;

    if (!firstname || !lastname || !nickname || !email || !password || !phone || !categoryId || !grade) {
        throw new BadRequest("All required fields must be provided");
    }

    const existingStudent = await db.select().from(Student).where(eq(Student.email, email));
    if (existingStudent.length > 0) {
        throw new BadRequest("Email is already registered");
    }

    const existingPhoneStudent = await db.select().from(Student).where(eq(Student.phone, phone));
    if (existingPhoneStudent.length > 0) {
        throw new BadRequest("Phone number is already registered");
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

    const existingGrade = await db
        .select()
        .from(gradeTable)
        .where(and(eq(gradeTable.id, grade), eq(gradeTable.categoryId, categoryId)));

    if (existingGrade.length === 0) {
        throw new BadRequest("Grade not found or does not belong to the selected category");
    }

    const hashedPassword = await hash(password, 10);

    const avatarUrl = avatar ? await validateAndSaveLogo(req, avatar, "students") : null;

    let createdStudentId = "";

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
            isVerified: false,
            avatar: avatarUrl,
        });

        const [createdStudent] = await tx
            .select({ id: Student.id })
            .from(Student)
            .where(eq(Student.email, email));

        if (!createdStudent) {
            throw new BadRequest("Student could not be created");
        }

        createdStudentId = createdStudent.id;

        await tx.insert(wallet).values({
            studentId: createdStudent.id,
            balance: 0,
        });
    });

    try {
        await sendStudentVerificationEmail({
            studentId: createdStudentId,
            email,
            name: `${firstname} ${lastname}`,
        });
    } catch (error) {
        await db.transaction(async (tx) => {
            await tx.delete(wallet).where(eq(wallet.studentId, createdStudentId));
            await tx.delete(Student).where(eq(Student.id, createdStudentId));
        });

        if (avatarUrl) {
            await deleteImage(avatarUrl).catch(() => { });
        }

        throw error;
    }

    return SuccessResponse(res, {
        message: "Student registered successfully. Please verify your email before logging in."
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
            isVerified: Student.isVerified,
            phone: Student.phone,
            category: Student.category,
            categoryName: category.name,
            grade: {
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            },
            avatar: Student.avatar,
            wallet: {
                walletId: wallet.id,
                balance: wallet.balance,
            }
        })
        .from(Student)
        .leftJoin(category, eq(Student.category, category.id))
        .leftJoin(gradeTable, eq(Student.grade, gradeTable.id))
        .leftJoin(wallet, eq(Student.id, wallet.studentId))
        .where(eq(Student.email, email));

    if (!student) {
        throw new BadRequest("Invalid Credentials");
    }

    const isPasswordValid = await compare(password, student.password);
    if (!isPasswordValid) {
        throw new BadRequest("Invalid Credentials");
    }

    if (!student.isVerified) {
        throw new BadRequest("Please verify your email before logging in");
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
            grade: student.grade,
            avatar: student.avatar,
            wallet: student.wallet
                ? {
                    id: student.wallet.walletId,
                    balance: student.wallet.balance,
                }
                : null
        }
    }, 200);
};


export const selectcategoryandgrade = async (req: Request, res: Response) => {
    const { categoryId } = req.query;

    const categories = await db
        .select({
            id: category.id,
            name: category.name,
            description: category.description,
            image: category.image,
        })
        .from(category)
        .where(isNull(category.parentCategoryId));

    let grades: any[] = [];
    if (categoryId) {
        grades = await db
            .select({
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            })
            .from(gradeTable)
            .where(eq(gradeTable.categoryId, String(categoryId)));
    }

    return SuccessResponse(res, {
        message: "Categories and grades fetched successfully",
        ...(categoryId ? { grades } : { categories }),
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

    return SuccessResponse(res, { message: "Password reset instructions sent to email" });
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

    return SuccessResponse(res, { message: "Reset code is valid" });
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

export const verifyStudentEmail = async (req: Request, res: Response) => {
    const token = String(req.query.token || "").trim();

    if (!token) {
        return res.status(400).send(renderVerificationPage({
            title: "Verification failed",
            message: "Verification token is required.",
            statusCode: 400,
        }));
    }

    let payload;
    try {
        payload = verifyEmailVerificationToken(token);
    } catch {
        return res.status(400).send(renderVerificationPage({
            title: "Verification link expired",
            message: "This verification link is invalid or has expired. Please request a new verification email.",
            statusCode: 400,
        }));
    }

    const [student] = await db
        .select({
            id: Student.id,
            email: Student.email,
            isVerified: Student.isVerified,
        })
        .from(Student)
        .where(eq(Student.id, payload.studentId));

    if (!student || student.email !== payload.email) {
        return res.status(400).send(renderVerificationPage({
            title: "Verification link expired",
            message: "This verification link is invalid or has expired. Please request a new verification email.",
            statusCode: 400,
        }));
    }

    if (student.isVerified) {
        return res.status(410).send(renderVerificationPage({
            title: "Verification link already used",
            message: "This verification link has already been used. Your email is already verified, so you can log in now.",
            statusCode: 410,
        }));
    }

    await db
        .update(Student)
        .set({ isVerified: true })
        .where(eq(Student.id, student.id));

    res.status(200).send(renderVerificationPage({
        title: "Email verified successfully",
        message: "Your Maths House account is now verified. You can return to the app and log in.",
        statusCode: 200,
    }));
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
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
            isVerified: Student.isVerified,
        })
        .from(Student)
        .where(eq(Student.email, normalizedEmail));

    if (student && !student.isVerified) {
        await sendStudentVerificationEmail({
            studentId: student.id,
            email: student.email,
            name: `${student.firstname} ${student.lastname}`,
        });
    }

    return SuccessResponse(res, {
        message: "If an unverified account exists, a verification email has been sent"
    });
};