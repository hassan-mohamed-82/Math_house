"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDiagnosticExamsbyCourseId = exports.getSelection = exports.deleteDiagnosticExam = exports.updateDiagnosticExam = exports.getDiagnosticExamById = exports.getAllDiagnosticExams = exports.createDiagnosticExam = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const uuid_1 = require("uuid");
// Helper to calculate dynamic scores
const calculateDynamicScores = (exam, rawScoreData) => {
    // 1. Calculate specific total score from RawScore rule
    // total_score = score - (is_gift ? gifting_score : 0)
    const calculatedTotalScore = rawScoreData.score - (rawScoreData.is_giftingScore ? rawScoreData.giftingScore : 0);
    // 2. Calculate grade per question based on Exam's number of questions
    // grade_per_question = calculatedTotalScore / numberOfQuestions
    const gradePerQuestion = exam.numberOfQuestions > 0 ? calculatedTotalScore / exam.numberOfQuestions : 0;
    return {
        ...exam,
        rawScore: rawScoreData,
        calculatedTotalScore,
        gradePerQuestion
    };
};
const createDiagnosticExam = async (req, res) => {
    const { title, description, duration, rawScoreId, courseId, numberOfQuestions, passScore, isActive, questionIds } = req.body;
    if (!title || !duration || !rawScoreId || !numberOfQuestions || !passScore) {
        throw new BadRequest_1.BadRequest("Title, Duration, Raw Score ID, Number of Questions, and Pass Score are required");
    }
    const existingRawScore = await connection_1.db.select().from(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.id, rawScoreId)).limit(1);
    if (!existingRawScore[0]) {
        throw new BadRequest_1.BadRequest("Raw Score not found");
    }
    const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId)).limit(1);
    if (!existingCourse[0]) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    const id = (0, uuid_1.v4)();
    await connection_1.db.insert(schema_1.diagnosticExam).values({
        id,
        title,
        description,
        duration,
        courseId,
        totalScore: existingRawScore[0].score,
        passScore,
        rawScoreId,
        numberOfQuestions,
        isActive: isActive !== undefined ? isActive : true,
    });
    // Calculate grade per question for default score
    const calculatedTotalScore = existingRawScore[0].score - (existingRawScore[0].is_giftingScore ? existingRawScore[0].giftingScore : 0);
    const gradePerQuestion = numberOfQuestions > 0 ? calculatedTotalScore / numberOfQuestions : 0;
    // Handle Questions Linking
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
        for (const questionId of questionIds) {
            // Verify question exists? Optional optimization.
            await connection_1.db.insert(schema_1.diagnosticExamQuestions).values({
                id: (0, uuid_1.v4)(),
                diagnosticExamId: id,
                questionId: questionId,
                score: Math.round(gradePerQuestion)
            });
        }
    }
    const createdExam = {
        id,
        title,
        description,
        duration,
        totalScore: existingRawScore[0].score,
        passScore,
        numberOfQuestions,
        isActive: isActive !== undefined ? isActive : true,
        // Mocking/Using the raw score data we already have
        rawScore: existingRawScore[0],
        course: existingCourse[0],
    };
    const responseData = calculateDynamicScores(createdExam, existingRawScore[0]);
    return (0, response_1.SuccessResponse)(res, { message: "Diagnostic Exam created successfully", data: { ...responseData, questionsCount: questionIds?.length || 0 } }, 201);
};
exports.createDiagnosticExam = createDiagnosticExam;
const getAllDiagnosticExams = async (req, res) => {
    const exams = await connection_1.db
        .select({
        id: schema_1.diagnosticExam.id,
        title: schema_1.diagnosticExam.title,
        description: schema_1.diagnosticExam.description,
        duration: schema_1.diagnosticExam.duration,
        totalScore: schema_1.diagnosticExam.totalScore,
        passScore: schema_1.diagnosticExam.passScore,
        numberOfQuestions: schema_1.diagnosticExam.numberOfQuestions,
        isActive: schema_1.diagnosticExam.isActive,
        createdAt: schema_1.diagnosticExam.createdAt,
        rawScore: {
            id: schema_1.rawScore.id,
            name: schema_1.rawScore.name,
            score: schema_1.rawScore.score,
            is_giftingScore: schema_1.rawScore.is_giftingScore,
            giftingScore: schema_1.rawScore.giftingScore,
        },
        course: {
            id: schema_1.courses.id,
            name: schema_1.courses.name,
        },
        category: {
            id: schema_1.category.id,
            name: schema_1.category.name,
        },
        semester: {
            id: schema_1.semesters.id,
            name: schema_1.semesters.name,
        }
    })
        .from(schema_1.diagnosticExam)
        .leftJoin(schema_1.rawScore, (0, drizzle_orm_1.eq)(schema_1.diagnosticExam.rawScoreId, schema_1.rawScore.id))
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.diagnosticExam.courseId, schema_1.courses.id))
        .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.courses.id, schema_1.semesters.courseId))
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.diagnosticExam.createdAt));
    const processedExams = exams.map(exam => {
        if (exam.rawScore) {
            return calculateDynamicScores(exam, exam.rawScore);
        }
        return exam;
    });
    return (0, response_1.SuccessResponse)(res, { message: "Diagnostic Exams fetched successfully", data: processedExams }, 200);
};
exports.getAllDiagnosticExams = getAllDiagnosticExams;
const getDiagnosticExamById = async (req, res) => {
    const { id } = req.params;
    const exam = await connection_1.db
        .select({
        id: schema_1.diagnosticExam.id,
        title: schema_1.diagnosticExam.title,
        description: schema_1.diagnosticExam.description,
        duration: schema_1.diagnosticExam.duration,
        totalScore: schema_1.diagnosticExam.totalScore,
        passScore: schema_1.diagnosticExam.passScore,
        numberOfQuestions: schema_1.diagnosticExam.numberOfQuestions,
        isActive: schema_1.diagnosticExam.isActive,
        createdAt: schema_1.diagnosticExam.createdAt,
        rawScore: {
            id: schema_1.rawScore.id,
            name: schema_1.rawScore.name,
            score: schema_1.rawScore.score,
            is_giftingScore: schema_1.rawScore.is_giftingScore,
            giftingScore: schema_1.rawScore.giftingScore,
        },
        course: {
            id: schema_1.courses.id,
            name: schema_1.courses.name,
        },
        semester: {
            id: schema_1.semesters.id,
            name: schema_1.semesters.name,
        },
        category: {
            id: schema_1.category.id,
            name: schema_1.category.name,
        }
    })
        .from(schema_1.diagnosticExam)
        .leftJoin(schema_1.rawScore, (0, drizzle_orm_1.eq)(schema_1.diagnosticExam.rawScoreId, schema_1.rawScore.id))
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.diagnosticExam.courseId, schema_1.courses.id))
        .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.courses.id, schema_1.semesters.courseId))
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.id, id))
        .limit(1);
    if (!exam[0]) {
        throw new NotFound_1.NotFound("Diagnostic Exam not found");
    }
    const processedExam = exam[0].rawScore ? calculateDynamicScores(exam[0], exam[0].rawScore) : exam[0];
    // Fetch Linked Questions
    const linkedQuestions = await connection_1.db
        .select({
        id: schema_1.diagnosticExamQuestions.id,
        questionId: schema_1.diagnosticExamQuestions.questionId,
        score: schema_1.diagnosticExamQuestions.score,
        question: schema_1.questions
    })
        .from(schema_1.diagnosticExamQuestions)
        .leftJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.diagnosticExamQuestions.questionId, schema_1.questions.id))
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamQuestions.diagnosticExamId, id));
    return (0, response_1.SuccessResponse)(res, { message: "Diagnostic Exam fetched successfully", data: { ...processedExam, questions: linkedQuestions } }, 200);
};
exports.getDiagnosticExamById = getDiagnosticExamById;
const updateDiagnosticExam = async (req, res) => {
    const { id } = req.params;
    const { title, description, duration, rawScoreId, courseId, numberOfQuestions, passScore, isActive, questionIds } = req.body;
    const existingExam = await connection_1.db.select().from(schema_1.diagnosticExam).where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.id, id)).limit(1);
    if (!existingExam[0]) {
        throw new NotFound_1.NotFound("Diagnostic Exam not found");
    }
    const existingCourse = await connection_1.db.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId)).limit(1);
    if (!existingCourse[0]) {
        throw new BadRequest_1.BadRequest("Course not found");
    }
    let rawScoreData = null;
    if (rawScoreId) {
        const existingRawScore = await connection_1.db.select().from(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.id, rawScoreId)).limit(1);
        if (!existingRawScore[0]) {
            throw new BadRequest_1.BadRequest("Raw Score not found");
        }
        rawScoreData = existingRawScore[0];
    }
    await connection_1.db.update(schema_1.diagnosticExam).set({
        title: title !== undefined ? title : existingExam[0].title,
        description: description !== undefined ? description : existingExam[0].description,
        duration: duration !== undefined ? duration : existingExam[0].duration,
        // Update stored totalScore if rawScore changes, or keep existing? 
        // Best to update it to maintain semantic "base score".
        totalScore: rawScoreData ? rawScoreData.score : existingExam[0].totalScore,
        passScore: passScore !== undefined ? passScore : existingExam[0].passScore,
        rawScoreId: rawScoreId !== undefined ? rawScoreId : existingExam[0].rawScoreId,
        courseId: courseId !== undefined ? courseId : existingExam[0].courseId,
        numberOfQuestions: numberOfQuestions !== undefined ? numberOfQuestions : existingExam[0].numberOfQuestions,
        isActive: isActive !== undefined ? isActive : existingExam[0].isActive,
    }).where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.id, id));
    // Handle Questions Update
    if (questionIds && Array.isArray(questionIds)) {
        // Delete existing questions
        await connection_1.db.delete(schema_1.diagnosticExamQuestions).where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamQuestions.diagnosticExamId, id));
        // Calculate grade per question for default score
        let gradePerQuestion = 0;
        if (rawScoreData) {
            const calculatedTotalScore = rawScoreData.score - (rawScoreData.is_giftingScore ? rawScoreData.giftingScore : 0);
            const effectiveNumQuestions = numberOfQuestions !== undefined ? numberOfQuestions : existingExam[0].numberOfQuestions;
            gradePerQuestion = effectiveNumQuestions > 0 ? calculatedTotalScore / effectiveNumQuestions : 0;
        }
        else if (existingExam[0].rawScoreId) {
            // Fallback to fetch rawscore if not in this request but we need it for calc
            const rs = await connection_1.db.select().from(schema_1.rawScore).where((0, drizzle_orm_1.eq)(schema_1.rawScore.id, existingExam[0].rawScoreId)).limit(1);
            if (rs[0]) {
                const calculatedTotalScore = rs[0].score - (rs[0].is_giftingScore ? rs[0].giftingScore : 0);
                const effectiveNumQuestions = numberOfQuestions !== undefined ? numberOfQuestions : existingExam[0].numberOfQuestions;
                gradePerQuestion = effectiveNumQuestions > 0 ? calculatedTotalScore / effectiveNumQuestions : 0;
            }
        }
        // Insert new questions
        for (const questionId of questionIds) {
            await connection_1.db.insert(schema_1.diagnosticExamQuestions).values({
                id: (0, uuid_1.v4)(),
                diagnosticExamId: id,
                questionId: questionId,
                score: Math.round(gradePerQuestion)
            });
        }
    }
    return (0, response_1.SuccessResponse)(res, { message: "Diagnostic Exam updated successfully" }, 200);
};
exports.updateDiagnosticExam = updateDiagnosticExam;
const deleteDiagnosticExam = async (req, res) => {
    const { id } = req.params;
    const existingExam = await connection_1.db.select().from(schema_1.diagnosticExam).where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.id, id)).limit(1);
    if (!existingExam[0]) {
        throw new NotFound_1.NotFound("Diagnostic Exam not found");
    }
    // Optionally check if questions are linked or other dependencies
    await connection_1.db.delete(schema_1.diagnosticExamQuestions).where((0, drizzle_orm_1.eq)(schema_1.diagnosticExamQuestions.diagnosticExamId, id));
    await connection_1.db.delete(schema_1.diagnosticExam).where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Diagnostic Exam deleted successfully" }, 200);
};
exports.deleteDiagnosticExam = deleteDiagnosticExam;
const getSelection = async (req, res) => {
    // 1. Fetch Raw Scores
    const rawScoresData = await connection_1.db
        .select({
        id: schema_1.rawScore.id,
        name: schema_1.rawScore.name,
        score: schema_1.rawScore.score,
    })
        .from(schema_1.rawScore);
    return (0, response_1.SuccessResponse)(res, {
        message: "Selection options fetched successfully",
        data: {
            rawScores: rawScoresData,
        }
    }, 200);
};
exports.getSelection = getSelection;
const getAllDiagnosticExamsbyCourseId = async (req, res) => {
    const { courseId } = req.params;
    const exams = await connection_1.db
        .select({
        id: schema_1.diagnosticExam.id,
        title: schema_1.diagnosticExam.title,
        description: schema_1.diagnosticExam.description,
        duration: schema_1.diagnosticExam.duration,
        totalScore: schema_1.diagnosticExam.totalScore,
        passScore: schema_1.diagnosticExam.passScore,
        numberOfQuestions: schema_1.diagnosticExam.numberOfQuestions,
        isActive: schema_1.diagnosticExam.isActive,
        createdAt: schema_1.diagnosticExam.createdAt,
        rawScore: {
            id: schema_1.rawScore.id,
            name: schema_1.rawScore.name,
            score: schema_1.rawScore.score,
            is_giftingScore: schema_1.rawScore.is_giftingScore,
            giftingScore: schema_1.rawScore.giftingScore,
        },
        semester: {
            id: schema_1.semesters.id,
            name: schema_1.semesters.name,
        },
        category: {
            id: schema_1.category.id,
            name: schema_1.category.name,
        }
    })
        .from(schema_1.diagnosticExam)
        .leftJoin(schema_1.rawScore, (0, drizzle_orm_1.eq)(schema_1.diagnosticExam.rawScoreId, schema_1.rawScore.id))
        .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.courses.id, schema_1.semesters.courseId))
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(schema_1.diagnosticExam.courseId, courseId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.diagnosticExam.createdAt));
    const processedExams = exams.map(exam => {
        if (exam.rawScore) {
            return calculateDynamicScores(exam, exam.rawScore);
        }
        return exam;
    });
    return (0, response_1.SuccessResponse)(res, { message: "Diagnostic Exams fetched successfully", data: processedExams }, 200);
};
exports.getAllDiagnosticExamsbyCourseId = getAllDiagnosticExamsbyCourseId;
