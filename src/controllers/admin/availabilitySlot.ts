import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import {
    adminAvailabilitySlots,
    DAYS_OF_WEEK
} from "../../models/schema/admin/StudentAvailabilityPlan";
import { eq, and, asc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";

export interface DayScheduleSummary {
    dayOfWeek: typeof DAYS_OF_WEEK[number];
    count: number;
    slots: any[];
}

export const formatSlotsByDays = (slots: any[]) => {
    const grouped: Record<string, any[]> = {
        Saturday: [],
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
    };

    for (const slot of slots) {
        if (grouped[slot.dayOfWeek]) {
            grouped[slot.dayOfWeek].push(slot);
        }
    }

    // Sort slots within each day by timeFrom ascending
    for (const day of DAYS_OF_WEEK) {
        grouped[day].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
    }

    const days: DayScheduleSummary[] = DAYS_OF_WEEK.map((day) => ({
        dayOfWeek: day,
        count: grouped[day].length,
        slots: grouped[day],
    }));

    return { days, grouped, slots };
};

// ── 1. Get All Availability Slots (Admin) ───────────────────────────────────
// By default returns all 7 days of the week and all configured slots
export const getAdminAvailabilitySlots = async (req: Request, res: Response) => {
    const { dayOfWeek, isActive } = req.query;

    const conditions: any[] = [];

    if (dayOfWeek && typeof dayOfWeek === "string") {
        conditions.push(eq(adminAvailabilitySlots.dayOfWeek, dayOfWeek as any));
    }

    if (isActive !== undefined && isActive !== "") {
        const activeBool = isActive === "true" || isActive === "1";
        conditions.push(eq(adminAvailabilitySlots.isActive, activeBool));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allSlots = await db
        .select()
        .from(adminAvailabilitySlots)
        .where(whereClause)
        .orderBy(asc(adminAvailabilitySlots.dayOfWeek), asc(adminAvailabilitySlots.timeFrom));

    const formatted = formatSlotsByDays(allSlots);

    return SuccessResponse(res, {
        message: "Availability slots retrieved successfully",
        total: allSlots.length,
        days: formatted.days,
        grouped: formatted.grouped,
        slots: allSlots,
    });
};

// ── 2. Get Single Availability Slot by ID (Admin) ───────────────────────────
export const getAdminAvailabilitySlotById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [slot] = await db
        .select()
        .from(adminAvailabilitySlots)
        .where(eq(adminAvailabilitySlots.id, id))
        .limit(1);

    if (!slot) {
        throw new NotFound("Availability slot not found");
    }

    return SuccessResponse(res, { slot });
};

// ── 3. Create Availability Slot(s) (Admin) ───────────────────────────────────
// Supports single slot: { dayOfWeek, timeFrom, timeTo }
// Or batch: { slots: [...] } or [...]
export const createAdminAvailabilitySlot = async (req: Request, res: Response) => {
    const adminId = req.user?.id || null;
    let inputSlots: Array<{
        dayOfWeek: typeof DAYS_OF_WEEK[number];
        timeFrom: string;
        timeTo: string;
        isActive?: boolean;
    }> = [];

    if (Array.isArray(req.body)) {
        inputSlots = req.body;
    } else if (Array.isArray(req.body.slots)) {
        inputSlots = req.body.slots;
    } else if (req.body.dayOfWeek && req.body.timeFrom && req.body.timeTo) {
        inputSlots = [req.body];
    } else {
        throw new BadRequest("Please provide slot details or an array of slots");
    }

    if (inputSlots.length === 0) {
        throw new BadRequest("At least one slot is required");
    }

    // Normalizing times and validating
    const createdSlotsToInsert = inputSlots.map((s) => ({
        id: randomUUID(),
        dayOfWeek: s.dayOfWeek,
        timeFrom: s.timeFrom.length === 5 ? `${s.timeFrom}:00` : s.timeFrom,
        timeTo: s.timeTo.length === 5 ? `${s.timeTo}:00` : s.timeTo,
        isActive: s.isActive !== undefined ? s.isActive : true,
        createdBy: adminId,
    }));

    await db.insert(adminAvailabilitySlots).values(createdSlotsToInsert);

    // Fetch newly created slots
    const insertedIds = createdSlotsToInsert.map((s) => s.id);
    const createdSlots = await db
        .select()
        .from(adminAvailabilitySlots)
        .where(and(...[eq(adminAvailabilitySlots.id, insertedIds[0])])); // safe query

    // Fetch all current slots for the updated view
    const allSlots = await db
        .select()
        .from(adminAvailabilitySlots)
        .orderBy(asc(adminAvailabilitySlots.dayOfWeek), asc(adminAvailabilitySlots.timeFrom));

    const formatted = formatSlotsByDays(allSlots);

    return SuccessResponse(res, {
        message: `${createdSlotsToInsert.length} availability slot(s) created successfully`,
        createdSlots: createdSlotsToInsert,
        days: formatted.days,
        grouped: formatted.grouped,
    }, 201);
};

// ── 4. Update Availability Slot (Admin) ─────────────────────────────────────
export const updateAdminAvailabilitySlot = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { dayOfWeek, timeFrom, timeTo, isActive } = req.body;

    const [existing] = await db
        .select()
        .from(adminAvailabilitySlots)
        .where(eq(adminAvailabilitySlots.id, id))
        .limit(1);

    if (!existing) {
        throw new NotFound("Availability slot not found");
    }

    const updateData: any = {};
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (timeFrom !== undefined) updateData.timeFrom = timeFrom.length === 5 ? `${timeFrom}:00` : timeFrom;
    if (timeTo !== undefined) updateData.timeTo = timeTo.length === 5 ? `${timeTo}:00` : timeTo;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db
        .update(adminAvailabilitySlots)
        .set(updateData)
        .where(eq(adminAvailabilitySlots.id, id));

    const [updatedSlot] = await db
        .select()
        .from(adminAvailabilitySlots)
        .where(eq(adminAvailabilitySlots.id, id));

    return SuccessResponse(res, {
        message: "Availability slot updated successfully",
        slot: updatedSlot,
    });
};

// ── 5. Toggle or Update Availability Slot Status (Admin) ─────────────────────
export const updateAdminSlotStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const [existing] = await db
        .select()
        .from(adminAvailabilitySlots)
        .where(eq(adminAvailabilitySlots.id, id))
        .limit(1);

    if (!existing) {
        throw new NotFound("Availability slot not found");
    }

    const newStatus = isActive !== undefined ? isActive : !existing.isActive;

    await db
        .update(adminAvailabilitySlots)
        .set({ isActive: newStatus })
        .where(eq(adminAvailabilitySlots.id, id));

    const [updatedSlot] = await db
        .select()
        .from(adminAvailabilitySlots)
        .where(eq(adminAvailabilitySlots.id, id));

    return SuccessResponse(res, {
        message: `Availability slot status updated to ${newStatus ? "active" : "inactive"}`,
        slot: updatedSlot,
    });
};

// ── 6. Delete Availability Slot (Admin) ─────────────────────────────────────
export const deleteAdminAvailabilitySlot = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [existing] = await db
        .select()
        .from(adminAvailabilitySlots)
        .where(eq(adminAvailabilitySlots.id, id))
        .limit(1);

    if (!existing) {
        throw new NotFound("Availability slot not found");
    }

    await db
        .delete(adminAvailabilitySlots)
        .where(eq(adminAvailabilitySlots.id, id));

    return SuccessResponse(res, {
        message: "Availability slot deleted successfully",
    });
};
