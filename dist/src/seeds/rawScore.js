"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRawScores = seedRawScores;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function seedRawScores(courseMap) {
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
        const existing = await connection_1.db.select().from(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.name, data.name));
        if (existing.length > 0) {
            console.log(`  Raw Score "${data.name}" already exists`);
            continue;
        }
        await connection_1.db.insert(schema_1.rawScore).values({
            name: data.name,
            courseId: courseMap[data.course],
            score: data.score,
            is_giftingScore: data.is_giftingScore,
            giftingScore: data.giftingScore,
        });
        console.log(`  ✅ Raw Score "${data.name}" created`);
    }
}
