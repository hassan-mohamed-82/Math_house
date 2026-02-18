import { db } from "../models/connection";
import { Sections } from "../models/schema";
import { eq } from "drizzle-orm";

export const seedSections = async () => {
    const sectionsData = [
        { sectionName: "Section 1", sectionDescription: "Math Section 1", sectionTime: 60 },
        { sectionName: "Section 2", sectionDescription: "Math Section 2", sectionTime: 60 },
        { sectionName: "Section 3", sectionDescription: "Math Section 3", sectionTime: 45 },
        { sectionName: "Section 4", sectionDescription: "Math Section 4", sectionTime: 45 },
    ];

    console.log("  Seeding Sections...");

    for (const section of sectionsData) {
        const existingSection = await db.select().from(Sections).where(eq(Sections.sectionName, section.sectionName)).limit(1);
        if (!existingSection[0]) {
            await db.insert(Sections).values(section);
        }
    }
    console.log("  ✅ Sections seeded successfully.");
};
