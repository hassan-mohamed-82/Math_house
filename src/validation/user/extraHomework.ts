import { z } from "zod";

export const submitExtraHomeworkSchema = z.object({
    pdf: z.string().min(1, "ملف الحل بصيغة PDF مطلوب"), // Base64 encoded PDF
    studentNotes: z.string().optional(),
});
