"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedExams = void 0;
const connection_1 = require("../models/connection");
const exams_1 = require("../models/schema/admin/exams");
const schema_1 = require("../models/schema");
const faker_1 = require("@faker-js/faker");
const crypto_1 = require("crypto");
const seedExams = async () => {
    console.log("📝 Seeding Static Exams...");
    // 1. Fetch dependencies
    const allCourses = await connection_1.db.select().from(schema_1.courses);
    const allExamCodes = await connection_1.db.select().from(schema_1.examCodes);
    const allRawScores = await connection_1.db.select().from(schema_1.rawScore);
    const allSections = await connection_1.db.select().from(schema_1.Sections);
    const allQuestions = await connection_1.db.select().from(schema_1.questions);
    if (allCourses.length === 0 || allExamCodes.length === 0 || allRawScores.length === 0) {
        console.warn("⚠️ Skipping Exam seeding due to missing dependencies (Courses, Codes, or RawScores).");
        return;
    }
    const examsToInsert = [];
    const examSectionsToInsert = [];
    const sectionQuestionsToInsert = [];
    // Create 5 Static Exams
    for (let i = 0; i < 5; i++) {
        const examId = (0, crypto_1.randomUUID)();
        const selectedCourse = faker_1.faker.helpers.arrayElement(allCourses);
        const selectedCode = faker_1.faker.helpers.arrayElement(allExamCodes);
        const selectedRawScore = faker_1.faker.helpers.arrayElement(allRawScores);
        examsToInsert.push({
            id: examId,
            title: `Mock Exam ${i + 1} - ${selectedCourse.name}`,
            description: faker_1.faker.lorem.sentence(),
            duration: 120, // 2 hours
            totalScore: 1600,
            passScore: 800,
            examType: "static",
            courseId: selectedCourse.id,
            year: new Date().getFullYear(),
            Month: new Date().getMonth() + 1,
            codeId: selectedCode.id,
            isActive: true,
            rawScoreId: selectedRawScore.id
        });
        // Add 2 Sections to each Exam
        const selectedSections = faker_1.faker.helpers.arrayElements(allSections, 2);
        selectedSections.forEach((section, index) => {
            const examSectionId = (0, crypto_1.randomUUID)();
            examSectionsToInsert.push({
                id: examSectionId,
                examId: examId,
                sectionId: section.id,
                sectionOrder: index + 1
            });
            // Add 10 Random Questions per Section
            if (allQuestions.length > 0) {
                const sectionQuestions = faker_1.faker.helpers.arrayElements(allQuestions, 10);
                const scorePerQuestion = 1600 / (2 * 10); // Simple distribution
                sectionQuestions.forEach((q, qIndex) => {
                    sectionQuestionsToInsert.push({
                        id: (0, crypto_1.randomUUID)(),
                        sectionId: examSectionId,
                        questionId: q.id,
                        questionOrder: qIndex + 1,
                        score: Math.round(scorePerQuestion)
                    });
                });
            }
        });
    }
    if (examsToInsert.length > 0) {
        await connection_1.db.insert(exams_1.Exams).values(examsToInsert);
        if (examSectionsToInsert.length > 0)
            await connection_1.db.insert(exams_1.ExamSections).values(examSectionsToInsert);
        if (sectionQuestionsToInsert.length > 0)
            await connection_1.db.insert(exams_1.SectionQuestions).values(sectionQuestionsToInsert);
        console.log(`✅ Seeded ${examsToInsert.length} Exams.`);
    }
};
exports.seedExams = seedExams;
