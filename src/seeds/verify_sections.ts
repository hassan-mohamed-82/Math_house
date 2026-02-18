import { db } from "../models/connection";
import { questions, Sections } from "../models/schema";
import { eq } from "drizzle-orm";

async function verify() {
    console.log("Verifying Questions -> Sections link...");
    const result = await db.select({
        questionId: questions.id,
        sectionName: Sections.sectionName
    })
        .from(questions)
        .innerJoin(Sections, eq(questions.sectionId, Sections.id))
        .limit(5);

    if (result.length > 0) {
        console.log("✅ Verification Successful! Questions are linked to Sections.");
        console.log(result);
    } else {
        console.error("❌ Verification Failed! No questions found linked to sections.");
    }
    process.exit(0);
}

verify();
