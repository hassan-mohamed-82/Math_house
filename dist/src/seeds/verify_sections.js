"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function verify() {
    console.log("Verifying Questions -> Sections link...");
    const result = await connection_1.db.select({
        questionId: schema_1.questions.id,
        sectionName: schema_1.Sections.sectionName
    })
        .from(schema_1.questions)
        .innerJoin(schema_1.Sections, (0, drizzle_orm_1.eq)(schema_1.questions.sectionId, schema_1.Sections.id))
        .limit(5);
    if (result.length > 0) {
        console.log("✅ Verification Successful! Questions are linked to Sections.");
        console.log(result);
    }
    else {
        console.error("❌ Verification Failed! No questions found linked to sections.");
    }
    process.exit(0);
}
verify();
