"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminSlotStatusSchema = exports.updateAdminSlotSchema = exports.createAdminSlotSchema = exports.singleSlotSchema = exports.DaysOfWeekEnum = void 0;
const zod_1 = require("zod");
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
exports.DaysOfWeekEnum = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
];
exports.singleSlotSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.enum(exports.DaysOfWeekEnum, {
        errorMap: () => ({ message: "dayOfWeek must be one of: Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday" })
    }),
    timeFrom: zod_1.z.string().regex(timeRegex, "timeFrom must be HH:MM or HH:MM:SS"),
    timeTo: zod_1.z.string().regex(timeRegex, "timeTo must be HH:MM or HH:MM:SS"),
    isActive: zod_1.z.boolean().optional(),
}).refine((slot) => {
    const fromParts = slot.timeFrom.split(":").map(Number);
    const toParts = slot.timeTo.split(":").map(Number);
    const fromMinutes = fromParts[0] * 60 + fromParts[1];
    const toMinutes = toParts[0] * 60 + toParts[1];
    return toMinutes > fromMinutes;
}, {
    message: "timeTo must be after timeFrom",
    path: ["timeTo"],
});
// Supports creating a single slot, an object with { slots: [...] }, or a raw array of slots
exports.createAdminSlotSchema = zod_1.z.union([
    exports.singleSlotSchema,
    zod_1.z.object({
        slots: zod_1.z.array(exports.singleSlotSchema).min(1, "Please provide at least one slot"),
    }),
    zod_1.z.array(exports.singleSlotSchema).min(1, "Please provide at least one slot"),
]);
exports.updateAdminSlotSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.enum(exports.DaysOfWeekEnum).optional(),
    timeFrom: zod_1.z.string().regex(timeRegex, "timeFrom must be HH:MM or HH:MM:SS").optional(),
    timeTo: zod_1.z.string().regex(timeRegex, "timeTo must be HH:MM or HH:MM:SS").optional(),
    isActive: zod_1.z.boolean().optional(),
}).refine((data) => {
    if (data.timeFrom && data.timeTo) {
        const fromParts = data.timeFrom.split(":").map(Number);
        const toParts = data.timeTo.split(":").map(Number);
        const fromMinutes = fromParts[0] * 60 + fromParts[1];
        const toMinutes = toParts[0] * 60 + toParts[1];
        return toMinutes > fromMinutes;
    }
    return true;
}, {
    message: "timeTo must be after timeFrom",
    path: ["timeTo"],
});
exports.updateAdminSlotStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean({
        required_error: "isActive is required and must be a boolean",
    }),
});
