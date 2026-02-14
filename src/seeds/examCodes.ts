import { db } from "../models/connection";
import { examCodes } from "../models/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

export async function seedExamCodes() {
    const codes = ["Generic", "EDEXCEL", "CAMBRIDGE", "OXFORD", "SAT", "ACT", "EST"];

    const codeMap: Record<string, string> = {};

    for (const code of codes) {
        const existing = await db.select().from(examCodes).where(eq(examCodes.code, code));

        if (existing.length > 0) {
            console.log(`  Exam Code "${code}" already exists`);
            codeMap[code] = existing[0].id;
            continue;
        }

        const id = uuidv4();
        await db.insert(examCodes).values({
            id,
            code,
        });

        console.log(`  ✅ Exam Code "${code}" created`);
        codeMap[code] = id;
    }

    return codeMap;
}
