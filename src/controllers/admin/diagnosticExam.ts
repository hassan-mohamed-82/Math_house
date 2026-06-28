import { Request, Response } from "express";
import { db } from "../../models/connection";
import { diagnosticExam, rawScore, diagnosticExamQuestions, questions, courses, semesters, category } from "../../models/schema";
import { eq, desc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { v4 as uuidv4 } from "uuid";
import { CALCULATOR_TYPES } from "../../constants/calculators";

// Helper to calculate dynamic scores
const calculateDynamicScores = (exam: any, rawScoreData: any) => {
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

export const createDiagnosticExam = async (req: Request, res: Response) => {
    const { title, description, duration, rawScoreId, courseId, numberOfQuestions, passScore, isActive, questionIds, calculators } = req.body;

    if (!title || !duration || !rawScoreId || !numberOfQuestions || !passScore) {
        throw new BadRequest("Title, Duration, Raw Score ID, Number of Questions, and Pass Score are required");
    }

    // Validate calculators if provided
    const validatedCalculators: string[] = [];
    if (calculators && Array.isArray(calculators)) {
        for (const calc of calculators) {
            if (!(CALCULATOR_TYPES as readonly string[]).includes(calc)) {
                throw new BadRequest(`Invalid calculator type: "${calc}". Allowed values: ${CALCULATOR_TYPES.join(", ")}`);
            }
            validatedCalculators.push(calc);
        }
    }

    const existingRawScore = await db.select().from(rawScore).where(eq(rawScore.id, rawScoreId)).limit(1);
    if (!existingRawScore[0]) {
        throw new BadRequest("Raw Score not found");
    }
    const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!existingCourse[0]) {
        throw new BadRequest("Course not found");
    }
    const id = uuidv4();

    await db.insert(diagnosticExam).values({
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
        calculators: validatedCalculators,
    });

    // Calculate grade per question for default score
    const calculatedTotalScore = existingRawScore[0].score - (existingRawScore[0].is_giftingScore ? existingRawScore[0].giftingScore : 0);
    const gradePerQuestion = numberOfQuestions > 0 ? calculatedTotalScore / numberOfQuestions : 0;

    // Handle Questions Linking
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
        for (const questionId of questionIds) {
            // Verify question exists? Optional optimization.
            await db.insert(diagnosticExamQuestions).values({
                id: uuidv4(),
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

    return SuccessResponse(res, { message: "Diagnostic Exam created successfully", data: { ...responseData, questionsCount: questionIds?.length || 0 } }, 201);
};

export const getAllDiagnosticExams = async (req: Request, res: Response) => {
    const exams = await db
        .select({
            id: diagnosticExam.id,
            title: diagnosticExam.title,
            description: diagnosticExam.description,
            duration: diagnosticExam.duration,
            totalScore: diagnosticExam.totalScore,
            passScore: diagnosticExam.passScore,
            numberOfQuestions: diagnosticExam.numberOfQuestions,
            isActive: diagnosticExam.isActive,
            createdAt: diagnosticExam.createdAt,
            rawScore: {
                id: rawScore.id,
                name: rawScore.name,
                score: rawScore.score,
                is_giftingScore: rawScore.is_giftingScore,
                giftingScore: rawScore.giftingScore,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
            category: {
                id: category.id,
                name: category.name,
            },
            semester: {
                id: semesters.id,
                name: semesters.name,
            }
        })
        .from(diagnosticExam)
        .leftJoin(rawScore, eq(diagnosticExam.rawScoreId, rawScore.id))
        .leftJoin(courses, eq(diagnosticExam.courseId, courses.id))
        .leftJoin(semesters, eq(courses.id, semesters.courseId))
        .leftJoin(category, eq(courses.categoryId, category.id))
        .orderBy(desc(diagnosticExam.createdAt));

    const processedExams = exams.map(exam => {
        if (exam.rawScore) {
            return calculateDynamicScores(exam, exam.rawScore);
        }
        return exam;
    });

    return SuccessResponse(res, { message: "Diagnostic Exams fetched successfully", data: processedExams }, 200);
};

export const getDiagnosticExamById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const exam = await db
        .select({
            id: diagnosticExam.id,
            title: diagnosticExam.title,
            description: diagnosticExam.description,
            duration: diagnosticExam.duration,
            totalScore: diagnosticExam.totalScore,
            passScore: diagnosticExam.passScore,
            numberOfQuestions: diagnosticExam.numberOfQuestions,
            isActive: diagnosticExam.isActive,
            createdAt: diagnosticExam.createdAt,
            rawScore: {
                id: rawScore.id,
                name: rawScore.name,
                score: rawScore.score,
                is_giftingScore: rawScore.is_giftingScore,
                giftingScore: rawScore.giftingScore,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
            semester: {
                id: semesters.id,
                name: semesters.name,
            },
            category: {
                id: category.id,
                name: category.name,
            }
        })
        .from(diagnosticExam)
        .leftJoin(rawScore, eq(diagnosticExam.rawScoreId, rawScore.id))
        .leftJoin(courses, eq(diagnosticExam.courseId, courses.id))
        .leftJoin(semesters, eq(courses.id, semesters.courseId))
        .leftJoin(category, eq(courses.categoryId, category.id))
        .where(eq(diagnosticExam.id, id))
        .limit(1);

    if (!exam[0]) {
        throw new NotFound("Diagnostic Exam not found");
    }

    const processedExam = exam[0].rawScore ? calculateDynamicScores(exam[0], exam[0].rawScore) : exam[0];

    // Fetch Linked Questions
    const linkedQuestions = await db
        .select({
            id: diagnosticExamQuestions.id,
            questionId: diagnosticExamQuestions.questionId,
            score: diagnosticExamQuestions.score,
            question: questions
        })
        .from(diagnosticExamQuestions)
        .leftJoin(questions, eq(diagnosticExamQuestions.questionId, questions.id))
        .where(eq(diagnosticExamQuestions.diagnosticExamId, id));

    return SuccessResponse(res, { message: "Diagnostic Exam fetched successfully", data: { ...processedExam, questions: linkedQuestions } }, 200);
};

export const updateDiagnosticExam = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, duration, rawScoreId, courseId, numberOfQuestions, passScore, isActive, questionIds, calculators } = req.body;

    const existingExam = await db.select().from(diagnosticExam).where(eq(diagnosticExam.id, id)).limit(1);
    if (!existingExam[0]) {
        throw new NotFound("Diagnostic Exam not found");
    }
    const existingCourse = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!existingCourse[0]) {
        throw new BadRequest("Course not found");
    }

    let rawScoreData = null;
    if (rawScoreId) {
        const existingRawScore = await db.select().from(rawScore).where(eq(rawScore.id, rawScoreId)).limit(1);
        if (!existingRawScore[0]) {
            throw new BadRequest("Raw Score not found");
        }
        rawScoreData = existingRawScore[0];
    }

    // Validate calculators if provided
    let validatedCalculators: string[] | undefined = undefined;
    if (calculators !== undefined) {
        if (!Array.isArray(calculators)) throw new BadRequest("calculators must be an array");
        validatedCalculators = [];
        for (const calc of calculators) {
            if (!(CALCULATOR_TYPES as readonly string[]).includes(calc)) {
                throw new BadRequest(`Invalid calculator type: "${calc}". Allowed values: ${CALCULATOR_TYPES.join(", ")}`);
            }
            validatedCalculators.push(calc);
        }
    }

    await db.update(diagnosticExam).set({
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
        ...(validatedCalculators !== undefined ? { calculators: validatedCalculators } : {}),
    }).where(eq(diagnosticExam.id, id));

    // Handle Questions Update
    if (questionIds && Array.isArray(questionIds)) {
        // Delete existing questions
        await db.delete(diagnosticExamQuestions).where(eq(diagnosticExamQuestions.diagnosticExamId, id));

        // Calculate grade per question for default score
        let gradePerQuestion = 0;
        if (rawScoreData) {
            const calculatedTotalScore = rawScoreData.score - (rawScoreData.is_giftingScore ? rawScoreData.giftingScore : 0);
            const effectiveNumQuestions = numberOfQuestions !== undefined ? numberOfQuestions : existingExam[0].numberOfQuestions;
            gradePerQuestion = effectiveNumQuestions > 0 ? calculatedTotalScore / effectiveNumQuestions : 0;
        } else if (existingExam[0].rawScoreId) {
            // Fallback to fetch rawscore if not in this request but we need it for calc
            const rs = await db.select().from(rawScore).where(eq(rawScore.id, existingExam[0].rawScoreId)).limit(1);
            if (rs[0]) {
                const calculatedTotalScore = rs[0].score - (rs[0].is_giftingScore ? rs[0].giftingScore : 0);
                const effectiveNumQuestions = numberOfQuestions !== undefined ? numberOfQuestions : existingExam[0].numberOfQuestions;
                gradePerQuestion = effectiveNumQuestions > 0 ? calculatedTotalScore / effectiveNumQuestions : 0;
            }
        }

        // Insert new questions
        for (const questionId of questionIds) {
            await db.insert(diagnosticExamQuestions).values({
                id: uuidv4(),
                diagnosticExamId: id,
                questionId: questionId,
                score: Math.round(gradePerQuestion)
            });
        }
    }

    return SuccessResponse(res, { message: "Diagnostic Exam updated successfully" }, 200);
};

export const deleteDiagnosticExam = async (req: Request, res: Response) => {
    const { id } = req.params;

    const existingExam = await db.select().from(diagnosticExam).where(eq(diagnosticExam.id, id)).limit(1);
    if (!existingExam[0]) {
        throw new NotFound("Diagnostic Exam not found");
    }

    // Optionally check if questions are linked or other dependencies
    await db.delete(diagnosticExamQuestions).where(eq(diagnosticExamQuestions.diagnosticExamId, id));
    await db.delete(diagnosticExam).where(eq(diagnosticExam.id, id));
    return SuccessResponse(res, { message: "Diagnostic Exam deleted successfully" }, 200);
};

export const getSelection = async (req: Request, res: Response) => {
    // 1. Fetch Raw Scores
    const rawScoresData = await db
        .select({
            id: rawScore.id,
            name: rawScore.name,
            score: rawScore.score,
        })
        .from(rawScore);

    return SuccessResponse(res, {
        message: "Selection options fetched successfully",
        data: {
            rawScores: rawScoresData,
        }
    }, 200);
};

export const getAllDiagnosticExamsbyCourseId = async (req: Request, res: Response) => {
    const { courseId } = req.params;
    
    const exams = await db
        .select({
            id: diagnosticExam.id,
            title: diagnosticExam.title,
            description: diagnosticExam.description,
            duration: diagnosticExam.duration,
            totalScore: diagnosticExam.totalScore,
            passScore: diagnosticExam.passScore,
            numberOfQuestions: diagnosticExam.numberOfQuestions,
            isActive: diagnosticExam.isActive,
            createdAt: diagnosticExam.createdAt,
            rawScore: {
                id: rawScore.id,
                name: rawScore.name,
                score: rawScore.score,
                is_giftingScore: rawScore.is_giftingScore,
                giftingScore: rawScore.giftingScore,
            },
            semester: {
                id: semesters.id,
                name: semesters.name,
            },
            category: {
                id: category.id,
                name: category.name,
            }
        })
        .from(diagnosticExam)
        .leftJoin(rawScore, eq(diagnosticExam.rawScoreId, rawScore.id))
        .leftJoin(courses, eq(diagnosticExam.courseId, courses.id)) 
        .leftJoin(semesters, eq(courses.id, semesters.courseId))
        .leftJoin(category, eq(courses.categoryId, category.id))
        .where(eq(diagnosticExam.courseId, courseId))
        .orderBy(desc(diagnosticExam.createdAt));

    const processedExams = exams.map(exam => {
        if (exam.rawScore) {
            return calculateDynamicScores(exam, exam.rawScore);
        }
        return exam;
    });

    return SuccessResponse(res, { message: "Diagnostic Exams fetched successfully", data: processedExams }, 200);
};