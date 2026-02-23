import { db } from "../models/connection";
import { rawScore } from "../models/schema";
import { eq } from "drizzle-orm";

export async function seedRawScores(courseMap: Record<string, string>) {
    const rawScoresData = [
        {
            name: "Primary 1 Score",
            course: "Primary 1",
            score: 100,
            is_giftingScore: false,
            giftingScore: 0,
        },
        {
            name: "Middle 1 Score",
            course: "Middle 1",
            score: 100,
            is_giftingScore: false,
            giftingScore: 0,
        },
        {
            name: "Middle 2 Score",
            course: "Middle 2",
            score: 120,
            is_giftingScore: true,
            giftingScore: 10,
        },
        {
            name: "Secondary 1 Score",
            course: "Secondary 1",
            score: 100,
            is_giftingScore: false,
            giftingScore: 0,
        },
        {
            name: "IGCSE Math Core",
            course: "IG Year 1",
            score: 200,
            is_giftingScore: true,
            giftingScore: 20,
        },
    ];

    for (const data of rawScoresData) {
        if (!courseMap[data.course]) {
            console.log(`  Expected course "${data.course}" not found in map, skipping raw score.`);
            continue;
        }

        const existing = await db.select().from(rawScore).where(eq(rawScore.name, data.name));

        if (existing.length > 0) {
            console.log(`  Raw Score "${data.name}" already exists`);
            continue;
        }

        await db.insert(rawScore).values({
            name: data.name,
            courseId: courseMap[data.course],
            score: data.score,
            is_giftingScore: data.is_giftingScore,
            giftingScore: data.giftingScore,
        });

        console.log(`  ✅ Raw Score "${data.name}" created`);
    }
}
