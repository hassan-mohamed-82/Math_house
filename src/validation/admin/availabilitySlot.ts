import { z } from "zod";

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

export const DaysOfWeekEnum = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
] as const;

export const singleSlotSchema = z.object({
    dayOfWeek: z.enum(DaysOfWeekEnum, {
        errorMap: () => ({ message: "dayOfWeek must be one of: Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday" })
    }),
    timeFrom: z.string().regex(timeRegex, "timeFrom must be HH:MM or HH:MM:SS"),
    timeTo: z.string().regex(timeRegex, "timeTo must be HH:MM or HH:MM:SS"),
    isActive: z.boolean().optional(),
}).refine(
    (slot) => {
        const fromParts = slot.timeFrom.split(":").map(Number);
        const toParts = slot.timeTo.split(":").map(Number);
        const fromMinutes = fromParts[0] * 60 + fromParts[1];
        const toMinutes = toParts[0] * 60 + toParts[1];
        return toMinutes > fromMinutes;
    },
    {
        message: "timeTo must be after timeFrom",
        path: ["timeTo"],
    }
);

// Supports creating a single slot, an object with { slots: [...] }, or a raw array of slots
export const createAdminSlotSchema = z.union([
    singleSlotSchema,
    z.object({
        slots: z.array(singleSlotSchema).min(1, "Please provide at least one slot"),
    }),
    z.array(singleSlotSchema).min(1, "Please provide at least one slot"),
]);

export const updateAdminSlotSchema = z.object({
    dayOfWeek: z.enum(DaysOfWeekEnum).optional(),
    timeFrom: z.string().regex(timeRegex, "timeFrom must be HH:MM or HH:MM:SS").optional(),
    timeTo: z.string().regex(timeRegex, "timeTo must be HH:MM or HH:MM:SS").optional(),
    isActive: z.boolean().optional(),
}).refine(
    (data) => {
        if (data.timeFrom && data.timeTo) {
            const fromParts = data.timeFrom.split(":").map(Number);
            const toParts = data.timeTo.split(":").map(Number);
            const fromMinutes = fromParts[0] * 60 + fromParts[1];
            const toMinutes = toParts[0] * 60 + toParts[1];
            return toMinutes > fromMinutes;
        }
        return true;
    },
    {
        message: "timeTo must be after timeFrom",
        path: ["timeTo"],
    }
);

export const updateAdminSlotStatusSchema = z.object({
    isActive: z.boolean({
        required_error: "isActive is required and must be a boolean",
    }),
});
