"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSemesters = seedSemesters;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedSemesters(courseMap) {
    const semesterMap = {};
    // Courses that we know have semesters based on our courses seed
    const semesterCourses = [
        "Primary 1",
        "Middle 1",
        "Middle 2",
        "Secondary 1",
        "IG Year 1"
    ];
    for (const courseName of semesterCourses) {
        const courseId = courseMap[courseName];
        if (!courseId)
            continue;
        for (const semName of ["Semester 1", "Semester 2"]) {
            const key = `${courseName} - ${semName}`;
            const existing = await connection_1.db.select().from(schema_1.semesters)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.semesters.name, semName), (0, drizzle_orm_1.eq)(schema_1.semesters.courseId, courseId)));
            if (existing.length > 0) {
                semesterMap[key] = existing[0].id;
                console.log(`  Semester "${key}" already exists`);
                continue;
            }
            const id = (0, uuid_1.v4)();
            await connection_1.db.insert(schema_1.semesters).values({
                id,
                name: semName,
                courseId,
            });
            semesterMap[key] = id;
            console.log(`  ✅ Semester "${key}" created`);
        }
    }
    return semesterMap;
}
