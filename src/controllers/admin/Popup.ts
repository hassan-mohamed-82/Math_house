import { Request, Response } from "express";
import { db } from "../../models/connection";
import { popups } from "../../models/schema/admin/Popup";
import { eq, and, gte, lte } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { validateAndSaveLogo, handleImageUpdate, deleteImage } from "../../utils/handleImages";
import { randomUUID } from "crypto";

// ===================== CRUD =====================

export const createPopup = async (req: Request, res: Response) => {
    const { name, image, destination, startDate, endDate } = req.body;

    if (!name || !image || !destination || !startDate || !endDate) {
        throw new BadRequest("Name, image, destination, start date and end date are required");
    }

    if (new Date(endDate) <= new Date(startDate)) {
        throw new BadRequest("End date must be after start date");
    }

    const imageURL = await validateAndSaveLogo(req, image, "popups");

    await db.insert(popups).values({
        id: randomUUID(),
        name,
        image: imageURL,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
    });

    return SuccessResponse(res, { message: "Popup created successfully" }, 201);
};

export const getAllPopups = async (req: Request, res: Response) => {
    const allPopups = await db.select().from(popups);

    const now = new Date();
    const result = allPopups.map(p => ({
        ...p,
        isActive: new Date(p.endDate) >= now && new Date(p.startDate) <= now,
    }));

    return SuccessResponse(res, { popups: result }, 200);
};

export const getPopupById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const popup = await db.select().from(popups).where(eq(popups.id, id));
    if (popup.length === 0) {
        throw new NotFound("Popup not found");
    }

    const now = new Date();
    const result = {
        ...popup[0],
        isActive: new Date(popup[0].endDate) >= now && new Date(popup[0].startDate) <= now,
    };

    return SuccessResponse(res, { popup: result }, 200);
};

export const updatePopup = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, image, destination, startDate, endDate } = req.body;

    const existing = await db.select().from(popups).where(eq(popups.id, id));
    if (existing.length === 0) {
        throw new NotFound("Popup not found");
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        throw new BadRequest("End date must be after start date");
    }

    const imageURL = await handleImageUpdate(req, existing[0].image, image, "popups");

    await db.update(popups).set({
        ...(name && { name }),
        ...(imageURL && { image: imageURL }),
        ...(destination && { destination }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
    }).where(eq(popups.id, id));

    return SuccessResponse(res, { message: "Popup updated successfully" }, 200);
};

export const deletePopup = async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await db.select().from(popups).where(eq(popups.id, id));
    if (existing.length === 0) {
        throw new NotFound("Popup not found");
    }

    if (existing[0].image) {
        await deleteImage(existing[0].image);
    }

    await db.delete(popups).where(eq(popups.id, id));
    return SuccessResponse(res, { message: "Popup deleted successfully" }, 200);
};

// ===================== USER-FACING =====================

// Returns only active popups for a given destination (student/parent/teacher)
export const getActivePopups = async (req: Request, res: Response) => {
    const { destination } = req.query;

    if (!destination) {
        throw new BadRequest("Destination is required (student, parent, teacher)");
    }

    const now = new Date();

    const activePopups = await db
        .select()
        .from(popups)
        .where(
            and(
                eq(popups.destination, destination as "student" | "parent" | "teacher"),
                lte(popups.startDate, now),
                gte(popups.endDate, now)
            )
        );

    return SuccessResponse(res, { popups: activePopups }, 200);
};
