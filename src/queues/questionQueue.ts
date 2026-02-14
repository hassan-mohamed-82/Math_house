import { Queue } from 'bullmq';

// 1. Create a connection to Redis
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
};

// 2. Define the Queue Name
export const questionQueue = new Queue('parallel-question-generation', { connection });

// Helper to add jobs easily
export const addGenerationJob = async (questionData: any) => {
    return await questionQueue.add('generate-math-question', questionData, {
        attempts: 3, // Retry 3 times if AI fails
        backoff: 5000 // Wait 5s between retries
    });
};
