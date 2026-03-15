"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizQuestions = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const getQuizQuestions = async (req, res) => {
    const { quizId } = req.params;
    const existingQuiz = await connection_1.db.select({ id: schema_1.quizzes.id }).from(schema_1.quizzes).where((0, drizzle_orm_1.eq)(schema_1.quizzes.id, quizId));
    if (existingQuiz.length === 0) {
        throw new Errors_1.NotFound("Quiz not found");
    }
    const AllQuizQuestions = await connection_1.db.select({
        id: schema_1.quizQuestions.quizId,
        question: {
            id: schema_1.questions.id,
            question: schema_1.questions.question,
            image: schema_1.questions.image,
            answerType: schema_1.questions.answerType,
            difficulty: schema_1.questions.difficulty,
            questionType: schema_1.questions.questionType,
            year: schema_1.questions.year,
            month: schema_1.questions.month,
        }
    }).from(schema_1.quizQuestions)
        .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.quizQuestions.questionId, schema_1.questions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.quizQuestions.quizId, quizId))
        .orderBy(schema_1.questions.createdAt);
    const questionIds = AllQuizQuestions.map(q => q.question.id);
    let options = [];
    if (questionIds.length > 0) {
        options = await connection_1.db.select({
            id: schema_1.questionOptions.id,
            questionId: schema_1.questionOptions.questionId,
            answer: schema_1.questionOptions.answer,
            order: schema_1.questionOptions.order,
        }).from(schema_1.questionOptions)
            .where((0, drizzle_orm_1.inArray)(schema_1.questionOptions.questionId, questionIds));
    }
    const formattedQuestions = AllQuizQuestions.map((q) => {
        return {
            ...q.question,
            options: options.filter(o => o.questionId === q.question.id).map(({ questionId, ...rest }) => rest),
        };
    });
    return (0, response_1.SuccessResponse)(res, { message: "Quiz questions retrieved successfully", data: formattedQuestions });
};
exports.getQuizQuestions = getQuizQuestions;
