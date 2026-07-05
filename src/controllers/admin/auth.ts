import { Request, Response } from "express";
import { db } from "../../models/connection";
import { admins, roles, Student, category, wallet, grade as gradeTable } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { UnauthorizedError } from "../../Errors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Permission, Role } from "../../types/custom";
import { generateAdminToken } from "../../utils/jwt";

export async function login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequest("Email and password are required");
    }
    const admin = await db.select().from(admins).where(eq(admins.email, email));
    if (admin.length === 0) {
        throw new UnauthorizedError("Invalid Credentials");
    }
    const isPasswordValid = await bcrypt.compare(password, admin[0].password);
    if (!isPasswordValid) {
        throw new UnauthorizedError("Invalid Credentials");
    }
    if (admin[0].status === "inactive") {
        throw new UnauthorizedError("Admin is inactive");
    }

    let role = null;
    if (admin[0].roleId) {
        role = await db.select().from(roles).where(eq(roles.id, admin[0].roleId));
    }
    const tokenPayload = {
        id: admin[0].id,
        name: admin[0].name,
        role: (admin[0].type === "super_admin" ? "superadmin" : (role && role[0] ? role[0].name : "admin")) as Role,
        // permissions: admin[0].permissions,
    };

    const token = generateAdminToken(tokenPayload);


    return SuccessResponse(res, {
        message: "Admin logged in successfully", token, admin: {
            name: admin[0].name,
            email: admin[0].email,
            phoneNumber: admin[0].phoneNumber,
            roleId: admin[0].roleId,
            permissions: admin[0].permissions,
            status: admin[0].status,
        }
    }, 200);
}

export async function impersonateStudent(req: Request, res: Response) {
    const { studentId } = req.params;
    
    const actorAdminId = req.user.id;
    
    const student = await db.select({
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
        .where(eq(Student.id, studentId));
    
    if (student.length === 0) {
        throw new BadRequest("Student not found");
    }

    const payload = {
        id: student[0].id,
        name: `${student[0].firstname} ${student[0].lastname}`,
        role: "student",
        actorAdminId: actorAdminId
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "30m" });

    return SuccessResponse(res, {
        message: "Impersonated student successfully",
        token,
        isImpersonated: true,
        actorAdminId: actorAdminId,
        student: {
            id: student[0].id,
            firstname: student[0].firstname,
            lastname: student[0].lastname,
            email: student[0].email,
            phone: student[0].phone,
            category: {
                id: student[0].category,
                name: student[0].categoryName,
            },
            grade: student[0].grade,
            avatar: student[0].avatar,
            wallet: student[0].wallet
                ? {
                    id: student[0].wallet.walletId,
                    balance: student[0].wallet.balance,
                }
                : null
        }
    }, 200);
}

export async function switchBack(req: Request, res: Response) {
    const { actorAdminId } = req.user as any;

    if (!actorAdminId) {
        throw new UnauthorizedError("Forbidden: You are not impersonating a student.");
    }

    const admin = await db.select().from(admins).where(eq(admins.id, actorAdminId));

    if (admin.length === 0) {
        throw new UnauthorizedError("Admin not found.");
    }
    
    if (admin[0].status === "inactive") {
        throw new UnauthorizedError("Admin is inactive.");
    }

    let role = null;
    if (admin[0].roleId) {
        role = await db.select().from(roles).where(eq(roles.id, admin[0].roleId));
    }

    const tokenPayload = {
        id: admin[0].id,
        name: admin[0].name,
        role: (admin[0].type === "super_admin" ? "superadmin" : (role && role[0] ? role[0].name : "admin")) as Role,
    };

    const token = generateAdminToken(tokenPayload);

    return SuccessResponse(res, {
        message: "Switched back to admin successfully",
        token,
        admin: {
            name: admin[0].name,
            email: admin[0].email,
            phoneNumber: admin[0].phoneNumber,
            roleId: admin[0].roleId,
            permissions: admin[0].permissions,
            status: admin[0].status,
        }
    }, 200);
}