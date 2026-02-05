// controllers/admin.controller.ts

import { Request, Response } from "express";
import { db } from "../../models/connection";
import { parents } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export const createParent = async (req: Request, res: Response) => {
    const { name, email, phoneNumber, password, status } = req.body;

    const existingParent = await db
        .select()
        .from(parents)
        .where(eq(parents.email, email));

    if (existingParent.length > 0) {
        throw new BadRequest("email is already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await db.insert(parents).values({
        id,
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        status: status || "active"
    });

    return SuccessResponse(res,  {message:"create parent success", data: { id }});
};

export const getAllParents = async (req: Request, res: Response) => {
    const allParents = await db
        .select({
            id: parents.id,
            name: parents.name,
            email: parents.email,
            phoneNumber: parents.phoneNumber,
            status: parents.status,
            createdAt: parents.createdAt,
            updatedAt: parents.updatedAt
        })
        .from(parents);

        SuccessResponse(res,  {message:"get all parents success", data: allParents});
};

export const getParentById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const parent = await db
        .select({
            id: parents.id,
            name: parents.name,
            email: parents.email,
            phoneNumber: parents.phoneNumber,
            status: parents.status,
            createdAt: parents.createdAt,
            updatedAt: parents.updatedAt
        })
        .from(parents)
        .where(eq(parents.id, id));

    if (parent.length === 0) {
        throw new NotFound("parent not found");
    }

    return SuccessResponse(res,  {message:"get parent by id success", data: parent[0]});
};

export const updateParent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, phoneNumber, status, oldPassword, newPassword } = req.body;

    const existingParent = await db
        .select()
        .from(parents)
        .where(eq(parents.id, id));

    if (existingParent.length === 0) {
        throw new NotFound("parent not found");
    }

    if (email && email !== existingParent[0].email) {
        const emailExists = await db
            .select()
            .from(parents)
            .where(eq(parents.email, email));

        if (emailExists.length > 0) {
            throw new BadRequest("email is already exists");
        }
    }

    const updateData: any = {
        updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (status) updateData.status = status;

    if (newPassword && oldPassword) {
        const isPasswordValid = await bcrypt.compare(oldPassword, existingParent[0].password);

        if (!isPasswordValid) {
            throw new BadRequest("old password is not correct");
        }

        updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 1) {
        throw new BadRequest("no data to update");
    }

    await db
        .update(parents)
        .set(updateData)
        .where(eq(parents.id, id));

    return SuccessResponse(res,  {message:"update parent success"});
};

export const deleteParent = async (req: Request, res: Response) => {
    const { id } = req.params;

    const parent = await db
        .select()
        .from(parents)
        .where(eq(parents.id, id));

    if (parent.length === 0) {
        throw new NotFound("parent not found");
    }

    await db.delete(parents).where(eq(parents.id, id));

    SuccessResponse(res,  {message:"delete parent success"});
};

export const toggleParentStatus = async (req: Request, res: Response) => {
    const { id } = req.params;

    const parent = await db
        .select()
        .from(parents)
        .where(eq(parents.id, id));

    if (parent.length === 0) {
        throw new NotFound("parent not found");
    }

    const newStatus = parent[0].status === "active" ? "inactive" : "active";

    await db
        .update(parents)
        .set({
            status: newStatus,
            updatedAt: new Date()
        })
        .where(eq(parents.id, id));

    return SuccessResponse(res,  {message:`toggle parent status success`});
};