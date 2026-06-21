import { Request, Response } from "express";
import { db } from "../../models/connection";
import { eq, max, asc, and, gt, sql, like, or, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { chapters, lessons, lessonIdeas, category, courses, teachers, semesters, prices } from "../../models/schema";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";
import { randomUUID } from "crypto";


const lessonDetailedQuery = () =>
    db.select({
        lesson: {
            id: lessons.id,
            name: lessons.name,
            description: lessons.description,
            image: lessons.image,
            preRequisition: lessons.preRequisition,
            whatYouGain: lessons.whatYouGain,
            order: lessons.order,
            createdAt: lessons.createdAt,
            updatedAt: lessons.updatedAt,
        },
        chapter: {
            id: chapters.id,
            name: chapters.name,
            description: chapters.description,
            image: chapters.image,

        },
        course: {
            id: courses.id,
            name: courses.name,
            description: courses.description,
            image: courses.image,
        },
        category: {
            id: category.id,
            name: category.name,
            description: category.description,
            image: category.image,
        },
        teacher: {
            id: teachers.id,
            name: teachers.name,
            email: teachers.email,
            avatar: teachers.avatar,
        },
        semester: {
            id: semesters.id,
            name: semesters.name,
        }
    })
        .from(lessons)
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(courses, eq(lessons.courseId, courses.id))
        .leftJoin(category, eq(lessons.categoryId, category.id))
        .leftJoin(teachers, eq(lessons.teacherId, teachers.id))
        .leftJoin(semesters, eq(chapters.semesterId, semesters.id));

export const createLesson = async (req: Request, res: Response) => {
    const { name, chapterId, description, image, teacherId, preRequisition, whatYouGain, pricePlans } = req.body;

    if (!name || !chapterId || !teacherId) {
        throw new BadRequest("Name, Chapter ID, and Teacher ID are required");
    }

    // validation of price plans
    if (!pricePlans || pricePlans.length === 0) {
        throw new BadRequest("Price Plans are required");
    }
    for (const plan of pricePlans) {
        if (plan.hasDiscount) {
            if (Number(plan.discountEgp) > Number(plan.priceEgp)) {
                throw new BadRequest(`EGP Discount cannot be greater than price in plan: ${plan.label}`);
            }
            if (Number(plan.discountUsd) > Number(plan.priceUsd)) {
                throw new BadRequest(`USD Discount cannot be greater than price in plan: ${plan.label}`);
            }
        }
    }

    // Validate chapter and derive courseId & categoryId
    const [existingChapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId));
    if (!existingChapter) {
        throw new NotFound("Chapter not found");
    }
    const courseId = existingChapter.courseId;
    const categoryId = existingChapter.categoryId;

    // Validate teacher
    const [existingTeacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId));
    if (!existingTeacher) {
        throw new NotFound("Teacher not found");
    }

    // Check for duplicate name within the same chapter
    const duplicate = await db.select().from(lessons).where(and(eq(lessons.chapterId, chapterId), eq(lessons.name, name)));
    if (duplicate.length > 0) {
        throw new BadRequest("A lesson with this name already exists in this chapter");
    }

    // Auto-compute order: MAX(order) + 1 for this chapter
    const [maxOrderResult] = await db.select({ maxOrder: max(lessons.order) }).from(lessons).where(eq(lessons.chapterId, chapterId));
    const nextOrder = (maxOrderResult?.maxOrder ?? 0) + 1;

    // Handle image
    let imageURL: string | undefined;
    if (image) {
        imageURL = await validateAndSaveLogo(req, image, "lessons");
    }

    const lessonId = randomUUID();

    await db.transaction(async (tx) => {
        await tx.insert(lessons).values({
            id: lessonId,
            name,
            chapterId,
            courseId,
            categoryId,
            teacherId,
            description,
            image: imageURL,
            preRequisition,
            whatYouGain,
            order: nextOrder,
        });

        const priceValues = pricePlans.map((plan: any, index: number) => ({
            id: randomUUID(),
            targetId: lessonId,
            targetType: "lesson" as const,
            durationLabel: plan.label,
            durationDays: plan.days,
            priceEgp: plan.priceEgp,
            priceUsd: plan.priceUsd,
            discountEgp: plan.discountEgp || "0.00",
            discountUsd: plan.discountUsd || "0.00",
            hasDiscount: plan.hasDiscount || false,
            isDefault: index === 0,
        }));
        await tx.insert(prices).values(priceValues);
    });

    return SuccessResponse(res, { message: "Lesson created successfully", order: nextOrder }, 200);
};

export const getLessonById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await lessonDetailedQuery().where(eq(lessons.id, id));
    if (result.length === 0) {
        throw new NotFound("Lesson not found");
    }

    // Fetch ideas for this lesson
    const ideas = await db.select().from(lessonIdeas)
        .where(eq(lessonIdeas.lessonId, id))
        .orderBy(asc(lessonIdeas.ideaOrder));

    const lessonPrices = await db.select()
        .from(prices)
        .where(and(eq(prices.targetId, id), eq(prices.targetType, "lesson")));

    return SuccessResponse(res, { message: "Lesson fetched successfully", ...result[0], ideas, prices: lessonPrices }, 200);
};

export const getAllLessons = async (req: Request, res: Response) => {
    // Fetch all lessons with details, ordered by chapter then lesson order
    const allLessons = await lessonDetailedQuery().orderBy(asc(lessons.order));

    // Group lessons by chapter
    const chapterMap = new Map<string, { chapter: typeof allLessons[0]["chapter"]; lessons: any[] }>();

    for (const row of allLessons) {
        const chapterId = row.chapter?.id;
        if (!chapterId) continue;

        if (!chapterMap.has(chapterId)) {
            chapterMap.set(chapterId, {
                chapter: row.chapter,
                lessons: [],
            });
        }

        chapterMap.get(chapterId)!.lessons.push({
            ...row.lesson,
            course: row.course,
            category: row.category,
            teacher: row.teacher,
            semester: row.semester,
        });
    }

    // Fetch all related prices for these lessons
    const lessonIds = allLessons.map(l => l.lesson.id);
    let allPrices: any[] = [];
    if (lessonIds.length > 0) {
        allPrices = await db.select().from(prices).where(and(inArray(prices.targetId, lessonIds), eq(prices.targetType, "lesson")));
    }

    // Fetch ideas for each lesson and nest them
    const result = await Promise.all(
        Array.from(chapterMap.values()).map(async (group) => {
            const lessonsWithIdeas = await Promise.all(
                group.lessons.map(async (lesson: any) => {
                    const ideas = await db.select().from(lessonIdeas)
                        .where(eq(lessonIdeas.lessonId, lesson.id))
                        .orderBy(asc(lessonIdeas.ideaOrder));
                    const lessonPrices = allPrices.filter(p => p.targetId === lesson.id);
                    return { ...lesson, ideas, prices: lessonPrices };
                })
            );
            return { chapter: group.chapter, lessons: lessonsWithIdeas };
        })
    );

    return SuccessResponse(res, { message: "Lessons fetched successfully", chapters: result }, 200);
};

export const getLessonsByChapterId = async (req: Request, res: Response) => {
    const { chapterId } = req.params;
    const allLessons = await lessonDetailedQuery()
        .where(eq(lessons.chapterId, chapterId))
        .orderBy(asc(lessons.order));

    const lessonIds = allLessons.map(l => l.lesson.id);
    let allPrices: any[] = [];
    if (lessonIds.length > 0) {
        allPrices = await db.select().from(prices).where(and(inArray(prices.targetId, lessonIds), eq(prices.targetType, "lesson")));
    }

    const lessonsWithIdeas = await Promise.all(
        allLessons.map(async (lessonRow) => {
            const ideas = await db.select().from(lessonIdeas)
                .where(eq(lessonIdeas.lessonId, lessonRow.lesson.id))
                .orderBy(asc(lessonIdeas.ideaOrder));
            const lessonPrices = allPrices.filter(p => p.targetId === lessonRow.lesson.id);
            return { ...lessonRow, ideas, prices: lessonPrices };
        })
    );

    return SuccessResponse(res, { message: "Lessons fetched successfully", lessons: lessonsWithIdeas }, 200);
};

export const swapLessonOrder = async (req: Request, res: Response) => {
    const { lessonIdA, lessonIdB } = req.body;
    if (!lessonIdA || !lessonIdB) {
        throw new BadRequest("lessonIdA and lessonIdB are required");
    }

    const [lessonA] = await db.select().from(lessons).where(eq(lessons.id, lessonIdA));
    const [lessonB] = await db.select().from(lessons).where(eq(lessons.id, lessonIdB));

    if (!lessonA || !lessonB) {
        throw new NotFound("One or both lessons not found");
    }

    if (lessonA.chapterId !== lessonB.chapterId) {
        throw new BadRequest("Both lessons must belong to the same chapter");
    }

    // Swap orders
    await db.update(lessons).set({ order: lessonB.order }).where(eq(lessons.id, lessonIdA));
    await db.update(lessons).set({ order: lessonA.order }).where(eq(lessons.id, lessonIdB));

    return SuccessResponse(res, { message: "Lesson order swapped successfully" }, 200);
};

export const updateLesson = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, chapterId, description, image, teacherId, preRequisition, whatYouGain, pricePlans } = req.body;

    const [existingLesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    if (!existingLesson) {
        throw new NotFound("Lesson not found");
    }

    // validation of price plans
    if (pricePlans && pricePlans.length > 0) {
        for (const plan of pricePlans) {
            if (plan.hasDiscount) {
                if (Number(plan.discountEgp) > Number(plan.priceEgp)) {
                    throw new BadRequest(`EGP Discount cannot be greater than price in plan: ${plan.label}`);
                }
                if (Number(plan.discountUsd) > Number(plan.priceUsd)) {
                    throw new BadRequest(`USD Discount cannot be greater than price in plan: ${plan.label}`);
                }
            }
        }
    }

    // If name is being changed within the same chapter, check for duplicates
    const effectiveChapterId = chapterId ?? existingLesson.chapterId;
    if (name && name !== existingLesson.name) {
        const duplicate = await db.select().from(lessons).where(and(eq(lessons.chapterId, effectiveChapterId), eq(lessons.name, name)));
        if (duplicate.length > 0) {
            throw new BadRequest("A lesson with this name already exists in this chapter");
        }
    }

    // If chapterId is changing, validate and derive new courseId & categoryId
    let categoryId = existingLesson.categoryId;
    let courseId = existingLesson.courseId;
    if (chapterId && chapterId !== existingLesson.chapterId) {
        const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId));
        if (!chapter) {
            throw new NotFound("Chapter not found");
        }
        courseId = chapter.courseId;
        categoryId = chapter.categoryId;
    }

    // If teacherId is changing, validate
    if (teacherId && teacherId !== existingLesson.teacherId) {
        const [teacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId));
        if (!teacher) {
            throw new NotFound("Teacher not found");
        }
    }

    // Handle image update
    const updatedImage = await handleImageUpdate(req, existingLesson.image, image, "lessons");

    await db.transaction(async (tx) => {
        await tx.update(lessons).set({
            name: name ?? existingLesson.name,
            chapterId: chapterId ?? existingLesson.chapterId,
            courseId,
            categoryId,
            teacherId: teacherId ?? existingLesson.teacherId,
            description: description !== undefined ? description : existingLesson.description,
            image: updatedImage ?? existingLesson.image,
            preRequisition: preRequisition !== undefined ? preRequisition : existingLesson.preRequisition,
            whatYouGain: whatYouGain !== undefined ? whatYouGain : existingLesson.whatYouGain,
        }).where(eq(lessons.id, id));

        // Update Price Plans
        if (pricePlans && pricePlans.length > 0) {
            await tx.delete(prices).where(and(eq(prices.targetId, id), eq(prices.targetType, "lesson")));
            const priceValues = pricePlans.map((plan: any, index: number) => ({
                id: randomUUID(),
                targetId: id,
                targetType: "lesson" as const,
                durationLabel: plan.label,
                durationDays: plan.days,
                priceEgp: plan.priceEgp,
                priceUsd: plan.priceUsd,
                discountEgp: plan.discountEgp || "0.00",
                discountUsd: plan.discountUsd || "0.00",
                hasDiscount: plan.hasDiscount || false,
                isDefault: index === 0,
            }));
            await tx.insert(prices).values(priceValues);
        }
    });

    return SuccessResponse(res, { message: "Lesson updated successfully" }, 200);
};

export const deleteLesson = async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existingLesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    if (!existingLesson) {
        throw new NotFound("Lesson not found");
    }

    const deletedOrder = existingLesson.order;
    const parentChapterId = existingLesson.chapterId;

    // Cascade: delete all ideas under this lesson
    await db.delete(lessonIdeas).where(eq(lessonIdeas.lessonId, id));

    // Delete lesson image if exists
    if (existingLesson.image) {
        await deleteImage(existingLesson.image);
    }

    await db.delete(prices).where(and(eq(prices.targetId, id), eq(prices.targetType, "lesson")));
    await db.delete(lessons).where(eq(lessons.id, id));

    // Re-sequence: decrement order for all lessons after the deleted one in the same chapter
    await db.update(lessons)
        .set({ order: sql`${lessons.order} - 1` })
        .where(and(eq(lessons.chapterId, parentChapterId), gt(lessons.order, deletedOrder)));

    return SuccessResponse(res, { message: "Lesson deleted successfully" }, 200);
};

export const getLessonsbyCourseId = async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const { page = "1", limit = "10", search, chapterId, categoryId, teacherId } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(lessons.courseId, courseId)];

    if (search) {
        conditions.push(or(
            like(lessons.name, `%${search}%`),
            like(lessons.description, `%${search}%`)
        ));
    }

    if (chapterId) conditions.push(eq(lessons.chapterId, chapterId as string));
    if (categoryId) conditions.push(eq(lessons.categoryId, categoryId as string));
    if (teacherId) conditions.push(eq(lessons.teacherId, teacherId as string));

    const whereClause = and(...conditions);

    const allLessons = await lessonDetailedQuery()
        .where(whereClause)
        .limit(limitNum)
        .offset(offset)
        .orderBy(asc(lessons.order));

    const [totalResult] = await db.select({ count: sql<number>`count(*)` })
        .from(lessons)
        .where(whereClause);

    const total = Number(totalResult?.count || 0);

    const lessonIds = allLessons.map(l => l.lesson.id);
    let allPrices: any[] = [];
    if (lessonIds.length > 0) {
        allPrices = await db.select().from(prices).where(and(inArray(prices.targetId, lessonIds), eq(prices.targetType, "lesson")));
    }

    const lessonsWithPrices = allLessons.map(lessonRow => {
        const lessonPrices = allPrices.filter(p => p.targetId === lessonRow.lesson.id);
        return { ...lessonRow, prices: lessonPrices };
    });

    return SuccessResponse(res, {
        message: "Lessons fetched successfully",
        lessons: lessonsWithPrices,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        }
    }, 200);
};
// Lesson Ideas

export const createLessonIdea = async (req: Request, res: Response) => {
    const { lessonId, idea, pdf, video, bunnyGuid } = req.body;

    if (!lessonId || !idea) {
        throw new BadRequest("Lesson ID and Idea are required");
    }

    // Validate that video and bunnyGuid are not both provided
    if (video && bunnyGuid) {
        throw new BadRequest("Provide either an external video link OR a Drive bunnyGuid, not both");
    }

    // Validate lesson exists
    const [existingLesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!existingLesson) {
        throw new NotFound("Lesson not found");
    }

    // Validate bunnyGuid exists in drive_assets if provided
    if (bunnyGuid) {
        const { driveAssets } = await import("../../models/schema");
        const [asset] = await db.select({ id: driveAssets.id, status: driveAssets.status })
            .from(driveAssets)
            .where(eq(driveAssets.bunnyGuid, bunnyGuid));
        if (!asset) {
            throw new NotFound("Video not found in Drive. Please upload the video first.");
        }
        if (asset.status === "failed") {
            throw new BadRequest("The selected video failed to process. Please re-upload it.");
        }
    }

    // Handle PDF: base64 upload OR external link
    let pdfUrl = pdf;
    if (pdf && pdf.startsWith("data:application/pdf;base64,")) {
        const { validateAndSavePdf } = await import("../../utils/handleImages");
        pdfUrl = await validateAndSavePdf(req, pdf, "ideas");
    }

    // Auto-compute ideaOrder: MAX(ideaOrder) + 1 for this lesson
    const [maxOrderResult] = await db.select({ maxOrder: max(lessonIdeas.ideaOrder) }).from(lessonIdeas).where(eq(lessonIdeas.lessonId, lessonId));
    const nextOrder = (maxOrderResult?.maxOrder ?? 0) + 1;

    await db.insert(lessonIdeas).values({
        lessonId,
        idea,
        ideaOrder: nextOrder,
        pdf: pdfUrl,
        video: video ?? null,
        bunnyGuid: bunnyGuid ?? null,
    });

    return SuccessResponse(res, { message: "Lesson idea created successfully", ideaOrder: nextOrder }, 200);
};

export const getIdeasByLessonId = async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const ideas = await db.select().from(lessonIdeas)
        .where(eq(lessonIdeas.lessonId, lessonId))
        .orderBy(asc(lessonIdeas.ideaOrder));
    return SuccessResponse(res, { message: "Lesson ideas fetched successfully", ideas }, 200);
};

export const swapIdeaOrder = async (req: Request, res: Response) => {
    const { ideaIdA, ideaIdB } = req.body;
    if (!ideaIdA || !ideaIdB) {
        throw new BadRequest("ideaIdA and ideaIdB are required");
    }

    const [ideaA] = await db.select().from(lessonIdeas).where(eq(lessonIdeas.id, ideaIdA));
    const [ideaB] = await db.select().from(lessonIdeas).where(eq(lessonIdeas.id, ideaIdB));

    if (!ideaA || !ideaB) {
        throw new NotFound("One or both ideas not found");
    }

    if (ideaA.lessonId !== ideaB.lessonId) {
        throw new BadRequest("Both ideas must belong to the same lesson");
    }

    // Swap orders
    await db.update(lessonIdeas).set({ ideaOrder: ideaB.ideaOrder }).where(eq(lessonIdeas.id, ideaIdA));
    await db.update(lessonIdeas).set({ ideaOrder: ideaA.ideaOrder }).where(eq(lessonIdeas.id, ideaIdB));

    return SuccessResponse(res, { message: "Idea order swapped successfully" }, 200);
};

export const updateLessonIdea = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { idea, pdf, video, bunnyGuid } = req.body;

    const [existingIdea] = await db.select().from(lessonIdeas).where(eq(lessonIdeas.id, id));
    if (!existingIdea) {
        throw new NotFound("Lesson idea not found");
    }

    // Validate that video and bunnyGuid are not both provided
    if (video && bunnyGuid) {
        throw new BadRequest("Provide either an external video link OR a Drive bunnyGuid, not both");
    }

    // Validate bunnyGuid exists in drive_assets if provided
    if (bunnyGuid) {
        const { driveAssets } = await import("../../models/schema");
        const [asset] = await db.select({ id: driveAssets.id, status: driveAssets.status })
            .from(driveAssets)
            .where(eq(driveAssets.bunnyGuid, bunnyGuid));
        if (!asset) {
            throw new NotFound("Video not found in Drive. Please upload the video first.");
        }
        if (asset.status === "failed") {
            throw new BadRequest("The selected video failed to process. Please re-upload it.");
        }
    }

    // Handle PDF: base64 upload OR external link
    let pdfUrl = pdf !== undefined ? pdf : existingIdea.pdf;
    if (pdf && pdf.startsWith("data:application/pdf;base64,")) {
        const { validateAndSavePdf, deleteImage } = await import("../../utils/handleImages");
        pdfUrl = await validateAndSavePdf(req, pdf, "ideas");
        // delete old pdf if it was a local upload
        if (existingIdea.pdf && existingIdea.pdf.includes("/uploads/")) {
            await deleteImage(existingIdea.pdf);
        }
    }

    // Determine final video / bunnyGuid values
    // Passing null explicitly clears the field; undefined keeps the existing value
    const finalVideo = video !== undefined ? video : (bunnyGuid !== undefined ? null : existingIdea.video);
    const finalBunnyGuid = bunnyGuid !== undefined ? bunnyGuid : (video !== undefined ? null : existingIdea.bunnyGuid);

    await db.update(lessonIdeas).set({
        idea: idea ?? existingIdea.idea,
        pdf: pdfUrl,
        video: finalVideo,
        bunnyGuid: finalBunnyGuid,
    }).where(eq(lessonIdeas.id, id));

    return SuccessResponse(res, { message: "Lesson idea updated successfully" }, 200);
};

export const deleteLessonIdea = async (req: Request, res: Response) => {
    const { id } = req.params;
    const [existingIdea] = await db.select().from(lessonIdeas).where(eq(lessonIdeas.id, id));
    if (!existingIdea) {
        throw new NotFound("Lesson idea not found");
    }

    const deletedOrder = existingIdea.ideaOrder;
    const parentLessonId = existingIdea.lessonId;

    await db.delete(lessonIdeas).where(eq(lessonIdeas.id, id));

    // Re-sequence: decrement ideaOrder for all ideas after the deleted one in the same lesson
    await db.update(lessonIdeas)
        .set({ ideaOrder: sql`${lessonIdeas.ideaOrder} - 1` })
        .where(and(eq(lessonIdeas.lessonId, parentLessonId), gt(lessonIdeas.ideaOrder, deletedOrder)));

    return SuccessResponse(res, { message: "Lesson idea deleted successfully" }, 200);
};

// ===================== SELECTION APIs =====================

export const selectChapters = async (req: Request, res: Response) => {
    const allChapters = await db.select({
        id: chapters.id,
        name: chapters.name,
    }).from(chapters);

    return SuccessResponse(res, { data: allChapters.map(c => ({ value: c.id, label: c.name })) }, 200);
};


export const selectLessons = async (req: Request, res: Response) => {
    const allLessons = await db.select({
        id: lessons.id,
        name: lessons.name,
    }).from(lessons);

    return SuccessResponse(res, { data: allLessons.map(l => ({ value: l.id, label: l.name })) }, 200);
};


