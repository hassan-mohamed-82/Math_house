"use strict";
// import { db } from "../models/connection";
// import { Exams, ExamSections, SectionQuestions } from "../models/schema/admin/exams";
// import { courses, examCodes, rawScore, Sections, questions } from "../models/schema";
// import { faker } from "@faker-js/faker";
// import { randomUUID } from "crypto";
// export const seedExams = async () => {
//     console.log("📝 Seeding Static Exams...");
//     // 1. Fetch dependencies
//     const allCourses = await db.select().from(courses);
//     const allExamCodes = await db.select().from(examCodes);
//     const allRawScores = await db.select().from(rawScore);
//     const allSections = await db.select().from(Sections);
//     const allQuestions = await db.select().from(questions);
//     if (allCourses.length === 0 || allExamCodes.length === 0 || allRawScores.length === 0) {
//         console.warn("⚠️ Skipping Exam seeding due to missing dependencies (Courses, Codes, or RawScores).");
//         return;
//     }
//     const examsToInsert: any[] = [];
//     const examSectionsToInsert: any[] = [];
//     const sectionQuestionsToInsert: any[] = [];
//     // Create 5 Static Exams
//     for (let i = 0; i < 5; i++) {
//         const examId = randomUUID();
//         const selectedCourse = faker.helpers.arrayElement(allCourses);
//         const selectedCode = faker.helpers.arrayElement(allExamCodes);
//         const selectedRawScore = faker.helpers.arrayElement(allRawScores);
//         examsToInsert.push({
//             id: examId,
//             title: `Mock Exam ${i + 1} - ${selectedCourse.name}`,
//             description: faker.lorem.sentence(),
//             duration: 120, // 2 hours
//             totalScore: 1600,
//             passScore: 800,
//             examType: "static",
//             courseId: selectedCourse.id,
//             year: new Date().getFullYear(),
//             Month: new Date().getMonth() + 1,
//             codeId: selectedCode.id,
//             isActive: true,
//             rawScoreId: selectedRawScore.id
//         });
//         // Add 2 Sections to each Exam
//         const selectedSections = faker.helpers.arrayElements(allSections, 2);
//         selectedSections.forEach((section, index) => {
//             const examSectionId = randomUUID();
//             examSectionsToInsert.push({
//                 id: examSectionId,
//                 examId: examId,
//                 sectionId: section.id,
//                 sectionOrder: index + 1
//             });
//             // Add 10 Random Questions per Section
//             if (allQuestions.length > 0) {
//                 const sectionQuestions = faker.helpers.arrayElements(allQuestions, 10);
//                 const scorePerQuestion = 1600 / (2 * 10); // Simple distribution
//                 sectionQuestions.forEach((q, qIndex) => {
//                     sectionQuestionsToInsert.push({
//                         id: randomUUID(),
//                         sectionId: examSectionId,
//                         questionId: q.id,
//                         questionOrder: qIndex + 1,
//                         score: Math.round(scorePerQuestion)
//                     });
//                 });
//             }
//         });
//     }
//     if (examsToInsert.length > 0) {
//         await db.insert(Exams).values(examsToInsert);
//         if (examSectionsToInsert.length > 0) await db.insert(ExamSections).values(examSectionsToInsert);
//         if (sectionQuestionsToInsert.length > 0) await db.insert(SectionQuestions).values(sectionQuestionsToInsert);
//         console.log(`✅ Seeded ${examsToInsert.length} Exams.`);
//     }
// }
