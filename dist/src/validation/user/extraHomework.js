"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitExtraHomeworkSchema = void 0;
const zod_1 = require("zod");
exports.submitExtraHomeworkSchema = zod_1.z.object({
    pdf: zod_1.z.string().min(1, "ملف الحل بصيغة PDF مطلوب"), // Base64 encoded PDF
    studentNotes: zod_1.z.string().optional(),
});
