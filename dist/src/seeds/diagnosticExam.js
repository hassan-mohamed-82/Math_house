"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDiagnosticExams = seedDiagnosticExams;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedDiagnosticExams() {
    console.log("  Fetching Raw Scores for reference...");
    const rawScores = await connection_1.db.select().from(schema_1.rawScore);
    const rawScoreMap = {};
    rawScores.forEach(rs => {
        rawScoreMap[rs.name] = rs.id;
    });
    const diagnosticExamsData = [
        {
            title: "Algebra I Placement Test",
            description: "Diagnostic exam to assess Algebra I readiness.",
            duration: 60,
            rawScoreName: "Algebra Basics Score",
            numberOfQuestions: 20,
            passScore: 70,
            isActive: true,
        },
        {
            title: "Geometry Fundamentals Assessment",
            description: "Evaluation of core geometry concepts.",
            duration: 90,
            rawScoreName: "Geometry Standard",
            numberOfQuestions: 25,
            passScore: 65,
            isActive: true,
        },
        {
            title: "Trigonometry Readiness",
            description: "Check for understanding of Trig functions.",
            duration: 45,
            rawScoreName: "Trig Excellence",
            numberOfQuestions: 15,
            passScore: 60,
            isActive: true,
        }
    ];
    console.log("  Fetching Questions for linking...");
    const allQuestions = await connection_1.db.select().from(schema_1.questions);
    if (allQuestions.length === 0) {
        console.log("  ⚠️ No questions found. Skipping linking.");
    }
    let questionIndex = 0;
    for (const data of diagnosticExamsData) {
        if (!rawScoreMap[data.rawScoreName]) {
            console.log(`  ⚠️ Raw Score "${data.rawScoreName}" not found, skipping exam "${data.title}".`);
            continue;
        }
        const existing = await connection_1.db.select().from(schema_1.diagnosticExam).where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.title, data.title));
        if (existing.length > 0) {
            console.log(`  Diagnostic Exam "${data.title}" already exists`);
            // Optionally fetch existing ID and link questions if not linked? 
            // For now, assuming fresh seed or clean state.
            continue;
        }
        const rawScoreId = rawScoreMap[data.rawScoreName];
        const selectedRawScore = rawScores.find(r => r.id === rawScoreId);
        const totalScore = selectedRawScore ? selectedRawScore.score : 100;
        // Calculate scores
        const calculatedTotalScore = totalScore - (selectedRawScore?.is_giftingScore ? selectedRawScore.giftingScore : 0);
        const gradePerQuestion = data.numberOfQuestions > 0 ? calculatedTotalScore / data.numberOfQuestions : 0;
        const examId = (0, uuid_1.v4)();
        await connection_1.db.insert(schema_1.diagnosticExam).values({
            id: examId,
            title: data.title,
            description: data.description,
            duration: data.duration,
            totalScore: totalScore,
            passScore: data.passScore,
            rawScoreId: rawScoreId,
            numberOfQuestions: data.numberOfQuestions,
            isActive: data.isActive,
        });
        console.log(`  ✅ Diagnostic Exam "${data.title}" created`);
        // Link Questions
        if (allQuestions.length > 0) {
            const questionsToLink = [];
            // Cycle through questions if we run out
            for (let i = 0; i < data.numberOfQuestions; i++) {
                questionsToLink.push(allQuestions[questionIndex % allQuestions.length]);
                questionIndex++;
            }
            const examQuestionsData = questionsToLink.map(q => ({
                id: (0, uuid_1.v4)(),
                diagnosticExamId: examId,
                questionId: q.id,
                score: Math.round(gradePerQuestion)
            }));
            // Insert in chunks to be safe? Drizzle handles batch reasonably well.
            // But let's import the table first.
            const { diagnosticExamQuestions } = await Promise.resolve().then(() => __importStar(require("../models/schema")));
            await connection_1.db.insert(diagnosticExamQuestions).values(examQuestionsData);
            console.log(`    🔗 Linked ${questionsToLink.length} questions (Score per question: ${Math.round(gradePerQuestion)})`);
        }
    }
}
