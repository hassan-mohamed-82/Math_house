import { z } from "zod";

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const DaysOfWeek = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
] as const;

export const studentSelectSlotSchema = z.object({
    slotId: z.string().min(1, "slotId is required").optional(),
    dayOfWeek: z.enum(DaysOfWeek).optional(),
    specificDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD").optional(),
    timeFrom: z.string().regex(timeRegex, "timeFrom must be HH:MM or HH:MM:SS").optional(),
    timeTo: z.string().regex(timeRegex, "timeTo must be HH:MM or HH:MM:SS").optional(),
}).refine(
    (slot) => {
        // If slotId is provided, that's sufficient!
        if (slot.slotId) return true;
        // Otherwise, must have either dayOfWeek or specificDate, and both timeFrom and timeTo
        return (slot.dayOfWeek !== undefined || slot.specificDate !== undefined) && !!slot.timeFrom && !!slot.timeTo;
    },
    {
        message: "Each slot must specify either a valid slotId, or a dayOfWeek/specificDate with timeFrom and timeTo",
        path: ["slotId"],
    }
).refine(
    (slot) => {
        if (slot.timeFrom && slot.timeTo) {
            const fromMinutes = (slot.timeFrom.split(":").map(Number)[0] * 60) + slot.timeFrom.split(":").map(Number)[1];
            const toMinutes = (slot.timeTo.split(":").map(Number)[0] * 60) + slot.timeTo.split(":").map(Number)[1];
            return toMinutes > fromMinutes;
        }
        return true;
    },
    {
        message: "timeTo must be after timeFrom",
        path: ["timeTo"],
    }
);

export const createAvailabilityPlanSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters").max(255),
    notes: z.string().optional(),
    slotIds: z.array(z.string().min(1, "Invalid slot ID")).min(1, "Please select at least one availability slot").optional(),
    slots: z.array(studentSelectSlotSchema).min(1, "Please provide at least one availability slot").optional(),
}).refine(
    (data) => {
        const hasSlotIds = Array.isArray(data.slotIds) && data.slotIds.length > 0;
        const hasSlots = Array.isArray(data.slots) && data.slots.length > 0;
        return hasSlotIds || hasSlots;
    },
    {
        message: "Please select at least one availability slot using slotIds or slots",
        path: ["slotIds"],
    }
);

export const updateAvailabilityPlanSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters").max(255).optional(),
    notes: z.string().optional(),
    slotIds: z.array(z.string().min(1, "Invalid slot ID")).optional(),
    slots: z.array(studentSelectSlotSchema).optional(),
});

export const respondToPlanSchema = z.object({
    action: z.enum(["accept", "reject"]),
    feedback: z.string().max(1000).optional(),
});
