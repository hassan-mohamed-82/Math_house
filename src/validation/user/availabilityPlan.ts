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

export const availabilitySlotSchema = z.object({
    dayOfWeek: z.enum(DaysOfWeek).optional(),
    specificDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD").optional(),
    timeFrom: z.string().regex(timeRegex, "timeFrom must be HH:MM or HH:MM:SS"),
    timeTo: z.string().regex(timeRegex, "timeTo must be HH:MM or HH:MM:SS"),
}).refine(
    (slot) => slot.dayOfWeek !== undefined || slot.specificDate !== undefined,
    {
        message: "Each slot must specify either a dayOfWeek or a specificDate",
        path: ["dayOfWeek"],
    }
).refine(
    (slot) => {
        // Compare times if in same format
        const fromMinutes = (slot.timeFrom.split(":").map(Number)[0] * 60) + slot.timeFrom.split(":").map(Number)[1];
        const toMinutes = (slot.timeTo.split(":").map(Number)[0] * 60) + slot.timeTo.split(":").map(Number)[1];
        return toMinutes > fromMinutes;
    },
    {
        message: "timeTo must be after timeFrom",
        path: ["timeTo"],
    }
);

export const createAvailabilityPlanSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters").max(255),
    notes: z.string().optional(),
    slots: z.array(availabilitySlotSchema).min(1, "Please provide at least one availability slot"),
});

export const respondToPlanSchema = z.object({
    action: z.enum(["accept", "reject"]),
    feedback: z.string().max(1000).optional(),
});
