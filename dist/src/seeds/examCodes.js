"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedExamCodes = seedExamCodes;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const uuid_1 = require("uuid");
const drizzle_orm_1 = require("drizzle-orm");
async function seedExamCodes() {
    const codes = ["Generic", "EDEXCEL", "CAMBRIDGE", "OXFORD", "SAT", "ACT", "EST"];
    const codeMap = {};
    for (const code of codes) {
        const existing = await connection_1.db.select().from(schema_1.examCodes).where((0, drizzle_orm_1.eq)(schema_1.examCodes.code, code));
        if (existing.length > 0) {
            console.log(`  Exam Code "${code}" already exists`);
            codeMap[code] = existing[0].id;
            continue;
        }
        const id = (0, uuid_1.v4)();
        await connection_1.db.insert(schema_1.examCodes).values({
            id,
            code,
        });
        console.log(`  ✅ Exam Code "${code}" created`);
        codeMap[code] = id;
    }
    return codeMap;
}
