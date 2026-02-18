import { Request, Response } from "express";
import { db } from "../../models/connection";
import { Sections } from "../../models/schema";
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { eq, desc } from "drizzle-orm";

export const createSection = async (req: Request, res: Response) => {
    const { sectionName, sectionDescription, sectionTime } = req.body;
    if (!sectionName || !sectionDescription || !sectionTime) {
        throw new BadRequest("All fields are required");
    }

    await db.insert(Sections).values({
        sectionName,
        sectionDescription,
        sectionTime
    });

    return SuccessResponse(res, { message: "Section Created Successfully" }, 201);
}

export const getAllSections = async (req: Request, res: Response) => {
    const sections = await db.select().from(Sections).orderBy(desc(Sections.createdAt));
    return SuccessResponse(res, { message: "Sections Fetched Successfully", sections }, 200);
}

export const getSectionById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Section Id is required");
    }
    const section = await db.select().from(Sections).where(eq(Sections.id, id));
    if (section.length === 0) {
        throw new BadRequest("Section not found");
    }
    return SuccessResponse(res, { message: "Section Fetched Successfully", section: section[0] }, 200);
}


export const updateSection = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Section Id is required");
    }
    const { sectionName, sectionDescription, sectionTime } = req.body;

    const section = await db.select().from(Sections).where(eq(Sections.id, id));
    if (section.length === 0) {
        throw new BadRequest("Section not found");
    }

    await db.update(Sections).set({
        sectionName,
        sectionDescription,
        sectionTime,
        updatedAt: new Date()
    }).where(eq(Sections.id, id));

    return SuccessResponse(res, { message: "Section Updated Successfully" }, 200);
}

export const deleteSection = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Section Id is required");
    }

    const section = await db.select().from(Sections).where(eq(Sections.id, id));
    if (section.length === 0) {
        throw new BadRequest("Section not found");
    }

    await db.delete(Sections).where(eq(Sections.id, id));

    return SuccessResponse(res, { message: "Section Deleted Successfully" }, 200);
}