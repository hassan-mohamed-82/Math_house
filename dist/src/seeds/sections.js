"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSections = void 0;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const seedSections = async () => {
    const sectionsData = [
        { sectionName: "Section 1", sectionDescription: "Math Section 1", sectionTime: 60 },
        { sectionName: "Section 2", sectionDescription: "Math Section 2", sectionTime: 60 },
        { sectionName: "Section 3", sectionDescription: "Math Section 3", sectionTime: 45 },
        { sectionName: "Section 4", sectionDescription: "Math Section 4", sectionTime: 45 },
    ];
    console.log("  Seeding Sections...");
    for (const section of sectionsData) {
        const existingSection = await connection_1.db.select().from(schema_1.Sections).where((0, drizzle_orm_1.eq)(schema_1.Sections.sectionName, section.sectionName)).limit(1);
        if (!existingSection[0]) {
            await connection_1.db.insert(schema_1.Sections).values(section);
        }
    }
    console.log("  ✅ Sections seeded successfully.");
};
exports.seedSections = seedSections;
