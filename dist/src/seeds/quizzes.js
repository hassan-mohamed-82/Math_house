"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedQuizzes = void 0;
const connection_1 = require("../models/connection");
const Quiz_1 = require("../models/schema/admin/Quiz");
const schema_1 = require("../models/schema");
const faker_1 = require("@faker-js/faker");
const crypto_1 = require("crypto");
const seedQuizzes = async () => {
    console.log("📝 Seeding Quizzes...");
    // 1. Fetch dependencies
    const allCourses = await connection_1.db.select().from(schema_1.courses);
    const allQuestions = await connection_1.db.select().from(schema_1.questions);
    const allCategories = await connection_1.db.select().from(schema_1.category);
    const allChapters = await connection_1.db.select().from(schema_1.chapters);
    const allLessons = await connection_1.db.select().from(schema_1.lessons);
    if (allCategories.length === 0) {
        console.warn("⚠️ Skipping Quiz seeding due to missing Categories.");
        return;
    }
    const quizzesToInsert = [];
    const quizQuestionsToInsert = [];
    // Create 10 Quizzes
    for (let i = 0; i < 10; i++) {
        const quizId = (0, crypto_1.randomUUID)();
        const selectedCategory = faker_1.faker.helpers.arrayElement(allCategories);
        const selectedCourse = faker_1.faker.helpers.arrayElement(allCourses);
        // Try to link to hierarchy if available, else null
        const selectedChapter = allChapters.length > 0 ? faker_1.faker.helpers.arrayElement(allChapters) : null;
        const selectedLesson = allLessons.length > 0 ? faker_1.faker.helpers.arrayElement(allLessons) : null;
        quizzesToInsert.push({
            id: quizId,
            title: `Quiz ${i + 1}: ${faker_1.faker.lorem.words(3)}`,
            description: faker_1.faker.lorem.sentence(),
            durationHours: 0,
            durationMinutes: 45,
            totalScore: 100,
            passScore: 50,
            quizOrder: i + 1,
            isActive: true,
            categoryId: selectedCategory?.id,
            courseId: selectedCourse?.id,
            chapterId: selectedChapter?.id, // Optional
            lessonId: selectedLesson?.id // Optional
        });
        // Add 5 Questions per Quiz
        if (allQuestions.length > 0) {
            const quizQs = faker_1.faker.helpers.arrayElements(allQuestions, 5);
            quizQs.forEach((q, qIndex) => {
                quizQuestionsToInsert.push({
                    id: (0, crypto_1.randomUUID)(),
                    quizId: quizId,
                    questionId: q.id,
                    questionOrder: qIndex + 1
                });
            });
        }
    }
    if (quizzesToInsert.length > 0) {
        await connection_1.db.insert(Quiz_1.quizzes).values(quizzesToInsert);
        if (quizQuestionsToInsert.length > 0)
            await connection_1.db.insert(Quiz_1.quizQuestions).values(quizQuestionsToInsert);
        console.log(`✅ Seeded ${quizzesToInsert.length} Quizzes.`);
    }
};
exports.seedQuizzes = seedQuizzes;
