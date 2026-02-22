"use strict";
// import { db } from "../models/connection";
// import { quizzes, quizQuestions } from "../models/schema/admin/Quiz";
// import { courses, questions, category, chapters, lessons } from "../models/schema";
// import { faker } from "@faker-js/faker";
// import { randomUUID } from "crypto";
// export const seedQuizzes = async () => {
//     console.log("📝 Seeding Quizzes...");
//     // 1. Fetch dependencies
//     const allCourses = await db.select().from(courses);
//     const allQuestions = await db.select().from(questions);
//     const allCategories = await db.select().from(category);
//     const allChapters = await db.select().from(chapters);
//     const allLessons = await db.select().from(lessons);
//     if (allCategories.length === 0) {
//         console.warn("⚠️ Skipping Quiz seeding due to missing Categories.");
//         return;
//     }
//     const quizzesToInsert: any[] = [];
//     const quizQuestionsToInsert: any[] = [];
//     // Create 10 Quizzes
//     for (let i = 0; i < 10; i++) {
//         const quizId = randomUUID();
//         const selectedCategory = faker.helpers.arrayElement(allCategories);
//         const selectedCourse = faker.helpers.arrayElement(allCourses);
//         // Try to link to hierarchy if available, else null
//         const selectedChapter = allChapters.length > 0 ? faker.helpers.arrayElement(allChapters) : null;
//         const selectedLesson = allLessons.length > 0 ? faker.helpers.arrayElement(allLessons) : null;
//         quizzesToInsert.push({
//             id: quizId,
//             title: `Quiz ${i + 1}: ${faker.lorem.words(3)}`,
//             description: faker.lorem.sentence(),
//             durationHours: 0,
//             durationMinutes: 45,
//             totalScore: 100,
//             passScore: 50,
//             quizOrder: i + 1,
//             isActive: true,
//             categoryId: selectedCategory?.id,
//             courseId: selectedCourse?.id,
//             chapterId: selectedChapter?.id, // Optional
//             lessonId: selectedLesson?.id   // Optional
//         });
//         // Add 5 Questions per Quiz
//         if (allQuestions.length > 0) {
//             const quizQs = faker.helpers.arrayElements(allQuestions, 5);
//             quizQs.forEach((q, qIndex) => {
//                 quizQuestionsToInsert.push({
//                     id: randomUUID(),
//                     quizId: quizId,
//                     questionId: q.id,
//                     questionOrder: qIndex + 1
//                 });
//             });
//         }
//     }
//     if (quizzesToInsert.length > 0) {
//         await db.insert(quizzes).values(quizzesToInsert);
//         if (quizQuestionsToInsert.length > 0) await db.insert(quizQuestions).values(quizQuestionsToInsert);
//         console.log(`✅ Seeded ${quizzesToInsert.length} Quizzes.`);
//     }
// }
