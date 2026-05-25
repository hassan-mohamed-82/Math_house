"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addGenerationJob = exports.questionQueue = void 0;
const bullmq_1 = require("bullmq");
// 1. Create a connection to Redis
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
};
// 2. Define the Queue Name
exports.questionQueue = new bullmq_1.Queue('parallel-question-generation', { connection });
// Helper to add jobs easily
const addGenerationJob = async (questionData) => {
    return await exports.questionQueue.add('generate-math-question', questionData, {
        attempts: 3, // Retry 3 times if AI fails
        backoff: 5000 // Wait 5s between retries
    });
};
exports.addGenerationJob = addGenerationJob;
