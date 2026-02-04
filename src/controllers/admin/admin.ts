import { Request, Response } from "express";
import { db } from "../../models/connection";
import { admins } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { UnauthorizedError } from "../../Errors";
import { generateAdminToken } from "../../utils/jwt";
import bcrypt from "bcrypt";
import { BadRequest } from "../../Errors/BadRequest";

export async function createAdmin(req: Request, res: Response) {
    const { name, nickname, phoneNumber, type, avatar, email, password, roleId, permissions } = req.body;
    if (!name || !email || !password || !roleId || !phoneNumber) {
        throw new BadRequest("All fields are required");
    }
    const existingAdmin = await db.select().from(admins).where(eq(admins.email, email));
    if (existingAdmin.length > 0) {
        throw new BadRequest("Admin already exists");
    }
    const existingPhoneNumber = await db.select().from(admins).where(eq(admins.phoneNumber, phoneNumber));
    if (existingPhoneNumber.length > 0) {
        throw new BadRequest("Phone number already exists");
    }

    if (roleId && !permissions) {
        throw new BadRequest("Permissions are required");
    }

    if (!type) {
        throw new BadRequest("Type is required");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insert(admins).values({
        name,
        nickname: nickname || name,
        phoneNumber,
        email,
        password: hashedPassword,
        avatar,
        type,
        roleId,
        permissions: permissions || [],
    });

    return SuccessResponse(res, { message: "Admin created successfully" }, 200);
}

export async function getAllAdmins(req: Request, res: Response) {
    const AllAdmins = await db.query.admins.findMany();
    return SuccessResponse(res, { message: "Admins fetched successfully", admins: AllAdmins }, 200);
}

export async function getAdminById(req: Request, res: Response) {
    const { id } = req.params;
    const admin = await db.select().from(admins).where(eq(admins.id, id));
    return SuccessResponse(res, { message: "Admin fetched successfully", admin }, 200);
}

export async function updateAdmin(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("Admin id is required");
    }

    const { name, email, password, nickname, type, phoneNumber, avatar, roleId, permissions } = req.body;
    const admin = await db.select().from(admins).where(eq(admins.id, id));

    if (!admin) {
        throw new BadRequest("Admin not found");
    }

    if (roleId && !permissions) {
        throw new BadRequest("Permissions are required");
    }

    if (type) {
        if (type !== "admin" && type !== "teacher") {
            throw new BadRequest("Invalid type");
        }
    }
    await db.update(admins).set({
        name: name || admins.name,
        email: email || admins.email,
        password: password || admins.password,
        nickname: nickname || admins.nickname,
        phoneNumber: phoneNumber || admins.phoneNumber,
        type: type || admins.type,
        avatar: avatar || admins.avatar,
        roleId: roleId || admins.roleId,
        permissions: permissions || admins.permissions,
    }).where(eq(admins.id, id));
    return SuccessResponse(res, { message: "Admin updated successfully" }, 200);
}

export async function deleteAdmin(req: Request, res: Response) {
    const { id } = req.params;
    const admin = await db.delete(admins).where(eq(admins.id, id));
    return SuccessResponse(res, { message: "Admin deleted successfully", admin }, 200);
}