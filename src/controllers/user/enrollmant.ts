import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../models/connection";
import { enrolledItems, courses, chapters, lessons, semesters, wallet, walletTransaction, paymentMethod, payment, teachers } from "../../models/schema";
import { prices } from "../../models/schema/admin/prices";
import { eq, and, or, inArray, aliasedTable, sql, count } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { validateAndSaveLogo } from "../../utils/handleImages";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Add `durationDays` to now and return the resulting Date. */
function calcExpiresAt(durationDays: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    return d;
}

// ─── 1. Enroll / Purchase Item ───────────────────────────────────────────────
export const enrollInCourse = async (req: Request, res: Response) => {
    const studentId = req.user.id;

    /**
     * New request body shape:
     * {
     *   courses?:  { id: string; priceId: string }[],
     *
     *   chapters?: { id: string; priceId: string }[],
     *   lessons?:  { id: string; priceId: string }[],
     *
     *   paymentType:      "wallet" | "method",
     *   paymentMethodId?: string,        // required when paymentType !== "wallet"
     *   image?:           string         // receipt for Manual payment methods
     * }
     */
    const {
        courses: coursesPayload,   
        chapters: chaptersPayload,
        lessons: lessonsPayload,
        paymentType,
        paymentMethodId,
        image,
    } = req.body;

    // ── Duplicate-enrollment guard ────────────────────────────────────────────
    const checkConditions: any[] = [];

    if (Array.isArray(coursesPayload) && coursesPayload.length > 0) {
        const ids = coursesPayload.map((c: any) => c.id);
        checkConditions.push(inArray(enrolledItems.courseId, ids));
    }

    if (Array.isArray(chaptersPayload) && chaptersPayload.length > 0) {
        const ids = chaptersPayload.map((c: any) => c.id);
        checkConditions.push(inArray(enrolledItems.chapterId, ids));
    }
    if (Array.isArray(lessonsPayload) && lessonsPayload.length > 0) {
        const ids = lessonsPayload.map((l: any) => l.id);
        checkConditions.push(inArray(enrolledItems.lessonId, ids));
    }

    if (checkConditions.length > 0) {
        const existing = await db
            .select()
            .from(enrolledItems)
            .where(
                and(
                    eq(enrolledItems.studentId, studentId),
                    or(...checkConditions),
                    // treat "expired" rows as no longer active so re-purchase is allowed
                    or(
                        eq(enrolledItems.status, "active"),
                        eq(enrolledItems.status, "pending")
                    )
                )
            );

        if (existing.length > 0) {
            throw new BadRequest("You have already purchased one or more of the selected items");
        }
    }

    // ── Transaction ───────────────────────────────────────────────────────────
    await db.transaction(async (tx) => {
        let totalPrice = 0;

        // Each entry: { courseId?, chapterId?, lessonId?, priceId, expiresAt }
        const itemsToEnroll: any[] = [];

        // 1. Courses (bulk)
        if (Array.isArray(coursesPayload)) {
            for (const entry of coursesPayload) {
                const { id, priceId } = entry;
                if (!priceId) throw new BadRequest(`priceId is required for course ${id}`);

                const [item] = await tx.select().from(courses).where(eq(courses.id, id));
                if (!item) throw new BadRequest(`Course ${id} not found`);

                const [plan] = await tx
                    .select()
                    .from(prices)
                    .where(
                        and(
                            eq(prices.id, priceId),
                            eq(prices.targetType, "course"),
                            eq(prices.targetId, id)
                        )
                    );
                if (!plan) throw new BadRequest(`Price plan not found for course ${id}`);

                totalPrice += Number(plan.totalPriceEgp || 0);
                itemsToEnroll.push({
                    courseId: id,
                    priceId: plan.id,
                    expiresAt: calcExpiresAt(plan.durationDays),
                });
            }
        }

        // 2. Chapters (bulk)
        if (Array.isArray(chaptersPayload)) {
            for (const entry of chaptersPayload) {
                const { id, priceId } = entry;
                if (!priceId) throw new BadRequest(`priceId is required for chapter ${id}`);

                const [item] = await tx.select().from(chapters).where(eq(chapters.id, id));
                if (!item) throw new BadRequest(`Chapter ${id} not found`);

                const [plan] = await tx
                    .select()
                    .from(prices)
                    .where(
                        and(
                            eq(prices.id, priceId),
                            eq(prices.targetType, "chapter"),
                            eq(prices.targetId, id)
                        )
                    );
                if (!plan) throw new BadRequest(`Price plan not found for chapter ${id}`);

                totalPrice += Number(plan.totalPriceEgp || 0);
                itemsToEnroll.push({
                    chapterId: id,
                    priceId: plan.id,
                    expiresAt: calcExpiresAt(plan.durationDays),
                });
            }
        }

        // 3. Lessons (bulk)
        if (Array.isArray(lessonsPayload)) {
            for (const entry of lessonsPayload) {
                const { id, priceId } = entry;
                if (!priceId) throw new BadRequest(`priceId is required for lesson ${id}`);

                const [item] = await tx.select().from(lessons).where(eq(lessons.id, id));
                if (!item) throw new BadRequest(`Lesson ${id} not found`);

                const [plan] = await tx
                    .select()
                    .from(prices)
                    .where(
                        and(
                            eq(prices.id, priceId),
                            eq(prices.targetType, "lesson"),
                            eq(prices.targetId, id)
                        )
                    );
                if (!plan) throw new BadRequest(`Price plan not found for lesson ${id}`);

                totalPrice += Number(plan.totalPriceEgp || 0);
                itemsToEnroll.push({
                    lessonId: id,
                    priceId: plan.id,
                    expiresAt: calcExpiresAt(plan.durationDays),
                });
            }
        }

        if (itemsToEnroll.length === 0) throw new BadRequest("No items selected for enrollment");

        // ── Payment processing ────────────────────────────────────────────────
        let paymentRecordId: string | null = null;
        let enrollmentStatus: "active" | "pending" = "pending";
        let paymentStatus: "pending" | "completed" | "rejected" = "pending";

        // a. Wallet
        if (paymentType === "wallet") {
            const [sw] = await tx.select().from(wallet).where(eq(wallet.studentId, studentId));
            if (!sw) throw new BadRequest("No wallet found for this student. Please contact support.");
            if (sw.balance < totalPrice) {
                throw new BadRequest(
                    `Insufficient balance. Your balance is ${sw.balance} EGP, but total is ${totalPrice} EGP`
                );
            }

            await tx.update(wallet).set({ balance: sw.balance - totalPrice }).where(eq(wallet.id, sw.id));
            await tx.insert(walletTransaction).values({
                walletId: sw.id,
                amount: totalPrice,
                type: "withdrawal",
                source: "Student",
            });

            enrollmentStatus = "active";
            paymentStatus = "completed";
        }
        // b. Payment method (Manual / Automatic)
        else {
            if (!paymentMethodId) throw new BadRequest("Payment method ID is required");

            const [method] = await tx.select().from(paymentMethod).where(eq(paymentMethod.id, paymentMethodId));
            if (!method) throw new BadRequest("Invalid payment method");

            let savedImageUrl: string | null = null;

            if (method.type === "Manual") {
                if (!image) throw new BadRequest("Receipt image is required for manual payment");
                savedImageUrl = await validateAndSaveLogo(req, image, "payments");
                paymentStatus = "pending";
                enrollmentStatus = "pending";
            } else {
                // Automatic (Visa / Stripe / etc.)
                paymentStatus = "completed";
                enrollmentStatus = "active";
            }

            const paymentId = uuidv4();
            await tx.insert(payment).values({
                id: paymentId,
                studentId,
                paymentMethodId,
                amount: totalPrice,
                status: paymentStatus,
                receiptImg: savedImageUrl,
                source: "student",
                purpose: "purchase",
            });

            paymentRecordId = paymentId;
        }

        // ── Insert enrolled rows ──────────────────────────────────────────────
        for (const item of itemsToEnroll) {
            await tx.insert(enrolledItems).values({
                studentId,
                ...item,
                ...(paymentRecordId ? { paymentId: paymentRecordId } : {}),
                status: enrollmentStatus,
            });
        }
    });

    return SuccessResponse(res, { message: "Purchase request processed successfully" }, 201);
};

// ─── 2. My Purchases ─────────────────────────────────────────────────────────
export const getMyPurchases = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const { status, paymentStatus } = req.query;

    const courseOfSemester = aliasedTable(courses, "course_of_semester");
    const courseOfChapter  = aliasedTable(courses, "course_of_chapter");
    const chapterOfLesson  = aliasedTable(chapters, "chapter_of_lesson");

    let query = db
        .select({
            enrollmentId: enrolledItems.id,
            status:       enrolledItems.status,
            createdAt:    enrolledItems.createdAt,
            expiresAt:    enrolledItems.expiresAt,
            pricePlan: {
                id:            prices.id,
                label:         prices.durationLabel,
                durationDays:  prices.durationDays,
                priceEgp:      prices.totalPriceEgp,
                priceUsd:      prices.totalPriceUsd,
            },
            course: {
                id:    courses.id,
                name:  courses.name,
                image: courses.image,
            },
            semester: {
                id:         semesters.id,
                name:       semesters.name,
                courseName: courseOfSemester.name,
            },
            chapter: {
                id:         chapters.id,
                name:       chapters.name,
                courseName: courseOfChapter.name,
            },
            lesson: {
                id:          lessons.id,
                name:        lessons.name,
                chapterName: chapterOfLesson.name,
            },
            paymentDetails: {
                id:      payment.id,
                amount:  payment.amount,
                status:  payment.status,
                method:  paymentMethod.name,
                receipt: payment.receiptImg,
            },
        })
        .from(enrolledItems)
        .leftJoin(prices,           eq(enrolledItems.priceId,    prices.id))
        .leftJoin(courses,          eq(enrolledItems.courseId,   courses.id))
        .leftJoin(semesters,        eq(enrolledItems.semesterId, semesters.id))
        .leftJoin(courseOfSemester, eq(semesters.courseId,       courseOfSemester.id))
        .leftJoin(chapters,         eq(enrolledItems.chapterId,  chapters.id))
        .leftJoin(courseOfChapter,  eq(chapters.courseId,        courseOfChapter.id))
        .leftJoin(lessons,          eq(enrolledItems.lessonId,   lessons.id))
        .leftJoin(chapterOfLesson,  eq(lessons.chapterId,        chapterOfLesson.id))
        .leftJoin(payment,          eq(enrolledItems.paymentId,  payment.id))
        .leftJoin(paymentMethod,    eq(payment.paymentMethodId,  paymentMethod.id))
        .where(eq(enrolledItems.studentId, studentId))
        .$dynamic();

    if (status) {
        query = query.where(eq(enrolledItems.status, status as any));
    }

    if (paymentStatus) {
        query = query.where(eq(payment.status, paymentStatus as any));
    }

    const purchases = await query.orderBy(sql`${enrolledItems.createdAt} DESC`);

    const formattedPurchases = purchases.map((item) => {
        let type: "course" | "semester" | "chapter" | "lesson" = "lesson";
        let details: any = item.lesson;

        if (item.course?.id) {
            type = "course";
            details = item.course;
        } else if (item.semester?.id) {
            type = "semester";
            details = item.semester;
        } else if (item.chapter?.id) {
            type = "chapter";
            details = item.chapter;
        }

        return {
            id:            item.enrollmentId,
            status:        item.status,
            paymentStatus: item.paymentDetails.status ?? null,
            date:          item.createdAt,
            expiresAt:     item.expiresAt,
            type,
            details,
            pricePlan: item.pricePlan?.id ? item.pricePlan : null,
            payment:   item.paymentDetails.amount ? {
                id:      item.paymentDetails.id,
                amount:  item.paymentDetails.amount,
                status:  item.paymentDetails.status,
                method:  item.paymentDetails.method,
                receipt: item.paymentDetails.receipt,
            } : null,
        };
    });

    return SuccessResponse(
        res,
        {
            message:   "My Library retrieved successfully",
            count:     formattedPurchases.length,
            purchases: formattedPurchases,
        },
        200
    );
};

// ─── 3. Course content for enrolled student ───────────────────────────────────
export const getEnrolledCourseById = async (req: Request, res: Response) => {
    const { id: courseId } = req.params;
    const studentId = req.user.id;

    const [enrollment] = await db
        .select()
        .from(enrolledItems)
        .where(
            and(
                eq(enrolledItems.studentId, studentId),
                eq(enrolledItems.courseId, courseId),
                eq(enrolledItems.status, "active")
            )
        );

    if (!enrollment) {
        throw new BadRequest("Access denied. You are not enrolled in this course.");
    }

    // Check if the enrollment has expired
    if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
        throw new BadRequest("Your enrollment for this course has expired. Please renew your subscription.");
    }

    const courseContent = await db
        .select()
        .from(semesters)
        .leftJoin(chapters, eq(semesters.id, chapters.semesterId))
        .leftJoin(lessons,  eq(chapters.id,  lessons.chapterId))
        .where(eq(semesters.courseId, courseId))
        .orderBy(semesters.id, chapters.id, lessons.id);

    return SuccessResponse(res, { message: "Course content retrieved", content: courseContent }, 200);
};