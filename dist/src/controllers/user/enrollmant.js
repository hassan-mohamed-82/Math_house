"use strict";
// import { Request, Response } from "express";
// import { v4 as uuidv4 } from "uuid";
// import { db } from "../../models/connection";
// import { enrolledItems, courses, chapters, lessons, semesters, wallet, walletTransaction, paymentMethod, payment, teachers } from "../../models/schema";
// import { prices } from "../../models/schema/admin/prices";
// import { eq, and, or, inArray, aliasedTable, sql, count , isNull} from "drizzle-orm";
// import { SuccessResponse } from "../../utils/response";
// import { BadRequest } from "../../Errors/BadRequest";
// import { validateAndSaveLogo } from "../../utils/handleImages";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnrolledCourseById = exports.getMyPurchases = exports.initiateAutomaticEnrollment = exports.enrollInCourse = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const prices_1 = require("../../models/schema/admin/prices");
const Student_1 = require("../../models/schema/admin/Student");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const handleImages_1 = require("../../utils/handleImages");
const paymob_1 = require("../../utils/paymob");
const promoCodeValidation_1 = require("../../utils/promoCodeValidation");
const schema_2 = require("../../models/schema");
// ─── helpers ────────────────────────────────────────────────────────────────
/** Add `durationDays` to now and return the resulting Date.
 *  Forces the value to a real number to avoid MySQL returning
 *  int columns as strings, which would cause string concatenation
 *  in setDate() instead of numeric addition.
 */
function calcExpiresAt(durationDays, from = new Date()) {
    const days = Math.floor(Number(durationDays) || 0);
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d;
}
/**
 * Shared helper: collect all items to enroll and their total price from the request body.
 * Returns { itemsToEnroll, totalPrice }.
 */
async function resolveEnrollmentItems(tx, coursesPayload, chaptersPayload, lessonsPayload) {
    let totalPrice = 0;
    const itemsToEnroll = [];
    // 1. Courses
    if (Array.isArray(coursesPayload)) {
        for (const entry of coursesPayload) {
            const { id, priceId } = entry;
            if (!priceId)
                throw new Errors_1.BadRequest(`priceId is required for course ${id}`);
            const [item] = await tx.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
            if (!item)
                throw new Errors_1.BadRequest(`Course ${id} not found`);
            const [plan] = await tx
                .select()
                .from(prices_1.prices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.id, priceId), (0, drizzle_orm_1.eq)(prices_1.prices.targetType, "course"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, id)));
            if (!plan)
                throw new Errors_1.BadRequest(`Price plan not found for course ${id}`);
            totalPrice += Number(plan.totalPriceEgp || 0);
            itemsToEnroll.push({ courseId: id, priceId: plan.id, expiresAt: calcExpiresAt(plan.durationDays) });
        }
    }
    // 2. Chapters
    if (Array.isArray(chaptersPayload)) {
        for (const entry of chaptersPayload) {
            const { id, priceId } = entry;
            if (!priceId)
                throw new Errors_1.BadRequest(`priceId is required for chapter ${id}`);
            const [item] = await tx.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
            if (!item)
                throw new Errors_1.BadRequest(`Chapter ${id} not found`);
            const [plan] = await tx
                .select()
                .from(prices_1.prices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.id, priceId), (0, drizzle_orm_1.eq)(prices_1.prices.targetType, "chapter"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, id)));
            if (!plan)
                throw new Errors_1.BadRequest(`Price plan not found for chapter ${id}`);
            totalPrice += Number(plan.totalPriceEgp || 0);
            itemsToEnroll.push({ chapterId: id, priceId: plan.id, expiresAt: calcExpiresAt(plan.durationDays) });
        }
    }
    // 3. Lessons
    if (Array.isArray(lessonsPayload)) {
        for (const entry of lessonsPayload) {
            const { id, priceId } = entry;
            if (!priceId)
                throw new Errors_1.BadRequest(`priceId is required for lesson ${id}`);
            const [item] = await tx.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, id));
            if (!item)
                throw new Errors_1.BadRequest(`Lesson ${id} not found`);
            const [plan] = await tx
                .select()
                .from(prices_1.prices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.id, priceId), (0, drizzle_orm_1.eq)(prices_1.prices.targetType, "lesson"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, id)));
            if (!plan)
                throw new Errors_1.BadRequest(`Price plan not found for lesson ${id}`);
            totalPrice += Number(plan.totalPriceEgp || 0);
            itemsToEnroll.push({ lessonId: id, priceId: plan.id, expiresAt: calcExpiresAt(plan.durationDays) });
        }
    }
    if (itemsToEnroll.length === 0)
        throw new Errors_1.BadRequest("No items selected for enrollment");
    return { itemsToEnroll, totalPrice };
}
// ─── Duplicate-enrollment guard ──────────────────────────────────────────────
async function checkDuplicateEnrollment(studentId, coursesPayload, chaptersPayload, lessonsPayload) {
    const checkConditions = [];
    if (Array.isArray(coursesPayload) && coursesPayload.length > 0)
        checkConditions.push((0, drizzle_orm_1.inArray)(schema_1.enrolledItems.courseId, coursesPayload.map((c) => c.id)));
    if (Array.isArray(chaptersPayload) && chaptersPayload.length > 0)
        checkConditions.push((0, drizzle_orm_1.inArray)(schema_1.enrolledItems.chapterId, chaptersPayload.map((c) => c.id)));
    if (Array.isArray(lessonsPayload) && lessonsPayload.length > 0)
        checkConditions.push((0, drizzle_orm_1.inArray)(schema_1.enrolledItems.lessonId, lessonsPayload.map((l) => l.id)));
    if (checkConditions.length > 0) {
        const existing = await connection_1.db
            .select()
            .from(schema_1.enrolledItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, studentId), (0, drizzle_orm_1.or)(...checkConditions), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "active"), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "pending"))));
        if (existing.length > 0)
            throw new Errors_1.BadRequest("You have already purchased one or more of the selected items");
    }
}
// ─── 1. Enroll / Purchase Item (Wallet & Manual) ─────────────────────────────
const enrollInCourse = async (req, res) => {
    const studentId = req.user.id;
    /**
     * Request body shape:
     * {
     *   courses?:  { id: string; priceId: string }[],
     *   chapters?: { id: string; priceId: string }[],
     *   lessons?:  { id: string; priceId: string }[],
     *
     *   paymentType:      "wallet" | "manual",
     *   paymentMethodId?: string,   // required when paymentType === "manual"
     *   image?:           string    // receipt for manual payment
     * }
     */
    const { courses: coursesPayload, chapters: chaptersPayload, lessons: lessonsPayload, paymentType, paymentMethodId, image, promoCode, } = req.body;
    if (paymentType === "automatic") {
        throw new Errors_1.BadRequest("For automatic (Paymob) payments, use POST /enroll/automatic");
    }
    await checkDuplicateEnrollment(studentId, coursesPayload, chaptersPayload, lessonsPayload);
    await connection_1.db.transaction(async (tx) => {
        let { itemsToEnroll, totalPrice } = await resolveEnrollmentItems(tx, coursesPayload, chaptersPayload, lessonsPayload);
        let appliedPromoCodeId;
        if (promoCode) {
            const promo = await (0, promoCodeValidation_1.validatePromoCode)(promoCode, studentId, {
                courseIds: coursesPayload?.map((c) => c.id),
                chapterIds: chaptersPayload?.map((c) => c.id),
                lessonIds: lessonsPayload?.map((c) => c.id)
            });
            appliedPromoCodeId = promo.id;
            const discountVal = totalPrice * (promo.discountAmount / 100);
            totalPrice = Math.round(Math.max(0, totalPrice - discountVal));
        }
        let paymentRecordId = null;
        let enrollmentStatus = "pending";
        let paymentStatus = "pending";
        // a. Wallet
        if (paymentType === "wallet") {
            const [sw] = await tx.select().from(schema_1.wallet).where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId));
            if (!sw)
                throw new Errors_1.BadRequest("No wallet found for this student. Please contact support.");
            if (sw.balance < totalPrice) {
                throw new Errors_1.BadRequest(`Insufficient balance. Your balance is ${sw.balance} EGP, but total is ${totalPrice} EGP`);
            }
            await tx.update(schema_1.wallet).set({ balance: sw.balance - totalPrice }).where((0, drizzle_orm_1.eq)(schema_1.wallet.id, sw.id));
            await tx.insert(schema_1.walletTransaction).values({
                walletId: sw.id,
                amount: totalPrice,
                type: "withdrawal",
                source: "Student",
            });
            enrollmentStatus = "active";
            paymentStatus = "completed";
            if (appliedPromoCodeId) {
                await tx.insert(schema_2.promoCodesUsers).values({
                    promoCodeId: appliedPromoCodeId,
                    userId: studentId,
                });
            }
        }
        // b. Manual payment method
        else {
            if (!paymentMethodId)
                throw new Errors_1.BadRequest("Payment method ID is required");
            const [method] = await tx.select().from(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, paymentMethodId));
            if (!method)
                throw new Errors_1.BadRequest("Invalid payment method");
            if (!method.isActive)
                throw new Errors_1.BadRequest("Payment method is not active");
            if (method.type !== "Manual")
                throw new Errors_1.BadRequest("Only manual payment methods are accepted here. Use /enroll/automatic for Paymob.");
            if (!image)
                throw new Errors_1.BadRequest("Receipt image is required for manual payment");
            const savedImageUrl = await (0, handleImages_1.validateAndSaveLogo)(req, image, "payments");
            const paymentId = (0, uuid_1.v4)();
            await tx.insert(schema_1.payment).values({
                id: paymentId,
                studentId,
                paymentMethodId,
                amount: totalPrice,
                status: "pending",
                receiptImg: savedImageUrl,
                source: "student",
                purpose: "purchase",
                promoCodeId: appliedPromoCodeId,
            });
            paymentRecordId = paymentId;
            paymentStatus = "pending";
            enrollmentStatus = "pending";
        }
        for (const item of itemsToEnroll) {
            await tx.insert(schema_1.enrolledItems).values({
                studentId,
                ...item,
                ...(paymentRecordId ? { paymentId: paymentRecordId } : {}),
                status: enrollmentStatus,
            });
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Purchase request processed successfully" }, 201);
};
exports.enrollInCourse = enrollInCourse;
// ─── 1b. Initiate Automatic Enrollment via Paymob ────────────────────────────
const initiateAutomaticEnrollment = async (req, res) => {
    const studentId = req.user.id;
    /**
     * Request body shape:
     * {
     *   courses?:  { id: string; priceId: string }[],
     *   chapters?: { id: string; priceId: string }[],
     *   lessons?:  { id: string; priceId: string }[],
     *   paymentMethodId: string,  // must be an Automatic (Paymob) method
     * }
     */
    const { courses: coursesPayload, chapters: chaptersPayload, lessons: lessonsPayload, paymentMethodId, promoCode, } = req.body;
    if (!paymentMethodId)
        throw new Errors_1.BadRequest("Payment method ID is required");
    // 1. Validate payment method is Paymob Automatic
    const [method] = await connection_1.db.select({
        id: schema_1.paymentMethod.id,
        name: schema_1.paymentMethod.name,
        isActive: schema_1.paymentMethod.isActive,
        type: schema_1.paymentMethod.type,
    }).from(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, paymentMethodId)).limit(1);
    if (!method)
        throw new Errors_1.NotFound("Payment method not found");
    if (!method.isActive)
        throw new Errors_1.BadRequest("Payment method is not active");
    if (method.type !== "Automatic")
        throw new Errors_1.BadRequest("Selected payment method is not an automatic payment method");
    if (method.name.toLowerCase() !== "paymob")
        throw new Errors_1.BadRequest("Automatic payments are currently available only through Paymob");
    // 2. Check for duplicate enrollments
    await checkDuplicateEnrollment(studentId, coursesPayload, chaptersPayload, lessonsPayload);
    // 3. Resolve items and total price (use db directly, not a transaction yet)
    let { itemsToEnroll, totalPrice } = await resolveEnrollmentItems(connection_1.db, coursesPayload, chaptersPayload, lessonsPayload);
    let appliedPromoCodeId;
    if (promoCode) {
        const promo = await (0, promoCodeValidation_1.validatePromoCode)(promoCode, studentId, {
            courseIds: coursesPayload?.map((c) => c.id),
            chapterIds: chaptersPayload?.map((c) => c.id),
            lessonIds: lessonsPayload?.map((c) => c.id)
        });
        appliedPromoCodeId = promo.id;
        const discountVal = totalPrice * (promo.discountAmount / 100);
        totalPrice = Math.round(Math.max(0, totalPrice - discountVal));
    }
    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
        throw new Errors_1.BadRequest("Total price for selected items is invalid or zero");
    }
    // 4. Get student info for Paymob billing data
    const [student] = await connection_1.db.select({
        id: Student_1.Student.id,
        firstname: Student_1.Student.firstname,
        lastname: Student_1.Student.lastname,
        email: Student_1.Student.email,
        phone: Student_1.Student.phone,
    }).from(Student_1.Student).where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId)).limit(1);
    if (!student)
        throw new Errors_1.NotFound("Student not found");
    // 5. Create pending payment record and pending enrolled items
    const paymentId = (0, uuid_1.v4)();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.payment).values({
            id: paymentId,
            studentId,
            paymentMethodId,
            amount: totalPrice,
            status: "pending",
            source: "student",
            purpose: "purchase",
            promoCodeId: appliedPromoCodeId,
        });
        for (const item of itemsToEnroll) {
            await tx.insert(schema_1.enrolledItems).values({
                studentId,
                ...item,
                paymentId,
                status: "pending",
            });
        }
    });
    // 6. Initiate Paymob checkout session
    try {
        const checkoutSession = await (0, paymob_1.createPaymobCheckoutSession)({
            amountCents: Math.round(totalPrice * 100),
            merchantOrderId: paymentId,
            student,
        });
        return (0, response_1.SuccessResponse)(res, {
            message: "Automatic enrollment payment session created. Complete payment on the checkout URL.",
            paymentId,
            totalAmount: totalPrice,
            paymentMethod: method.name,
            checkoutUrl: checkoutSession.checkoutUrl,
            iframeUrl: checkoutSession.iframeUrl,
            paymobOrderId: checkoutSession.paymobOrderId,
            callbackUrl: checkoutSession.callbackUrl,
        }, 201);
    }
    catch (error) {
        // Rollback pending records if Paymob fails
        await connection_1.db.delete(schema_1.enrolledItems).where((0, drizzle_orm_1.eq)(schema_1.enrolledItems.paymentId, paymentId));
        await connection_1.db.delete(schema_1.payment).where((0, drizzle_orm_1.eq)(schema_1.payment.id, paymentId));
        throw new Errors_1.BadRequest(error?.message || "Failed to initialize automatic enrollment payment");
    }
};
exports.initiateAutomaticEnrollment = initiateAutomaticEnrollment;
// ─── 2. My Purchases ─────────────────────────────────────────────────────────
const getMyPurchases = async (req, res) => {
    const studentId = req.user.id;
    const { status, paymentStatus } = req.query;
    const courseOfSemester = (0, drizzle_orm_1.aliasedTable)(schema_1.courses, "course_of_semester");
    const courseOfChapter = (0, drizzle_orm_1.aliasedTable)(schema_1.courses, "course_of_chapter");
    const chapterOfLesson = (0, drizzle_orm_1.aliasedTable)(schema_1.chapters, "chapter_of_lesson");
    // 1. Base conditions on the payment table to preserve rejected invoices
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.payment.studentId, studentId),
        (0, drizzle_orm_1.eq)(schema_1.payment.purpose, "purchase")
    ];
    if (paymentStatus && typeof paymentStatus === "string" && paymentStatus.trim() !== "") {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.payment.status, paymentStatus));
    }
    if (status && typeof status === "string" && status.trim() !== "") {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, status));
    }
    const purchases = await connection_1.db
        .select({
        enrollmentId: schema_1.enrolledItems.id,
        status: schema_1.enrolledItems.status,
        createdAt: schema_1.payment.createdAt,
        expiresAt: schema_1.enrolledItems.expiresAt,
        pricePlan: {
            id: prices_1.prices.id,
            label: prices_1.prices.durationLabel,
            durationDays: prices_1.prices.durationDays,
            priceEgp: prices_1.prices.totalPriceEgp,
            priceUsd: prices_1.prices.totalPriceUsd,
        },
        course: {
            id: schema_1.courses.id,
            name: schema_1.courses.name,
            image: schema_1.courses.image,
        },
        semester: {
            id: schema_1.semesters.id,
            name: schema_1.semesters.name,
            courseName: courseOfSemester.name,
        },
        chapter: {
            id: schema_1.chapters.id,
            name: schema_1.chapters.name,
            courseName: courseOfChapter.name,
        },
        lesson: {
            id: schema_1.lessons.id,
            name: schema_1.lessons.name,
            chapterName: chapterOfLesson.name,
        },
        paymentDetails: {
            id: schema_1.payment.id,
            amount: schema_1.payment.amount,
            status: schema_1.payment.status,
            method: schema_1.paymentMethod.name,
            receipt: schema_1.payment.receiptImg,
            purpose: schema_1.payment.purpose,
            reason: schema_1.payment.reason,
        },
    })
        .from(schema_1.payment)
        .leftJoin(schema_1.enrolledItems, (0, drizzle_orm_1.eq)(schema_1.enrolledItems.paymentId, schema_1.payment.id))
        .leftJoin(prices_1.prices, (0, drizzle_orm_1.eq)(schema_1.enrolledItems.priceId, prices_1.prices.id))
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.enrolledItems.courseId, schema_1.courses.id))
        .leftJoin(schema_1.semesters, (0, drizzle_orm_1.eq)(schema_1.enrolledItems.semesterId, schema_1.semesters.id))
        .leftJoin(courseOfSemester, (0, drizzle_orm_1.eq)(schema_1.semesters.courseId, courseOfSemester.id))
        .leftJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.enrolledItems.chapterId, schema_1.chapters.id))
        .leftJoin(courseOfChapter, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courseOfChapter.id))
        .leftJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.enrolledItems.lessonId, schema_1.lessons.id))
        .leftJoin(chapterOfLesson, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, chapterOfLesson.id))
        .leftJoin(schema_1.paymentMethod, (0, drizzle_orm_1.eq)(schema_1.payment.paymentMethodId, schema_1.paymentMethod.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.sql) `${schema_1.payment.createdAt} DESC`);
    const formattedPurchases = purchases.map((item) => {
        let type = "lesson";
        let details = item.lesson;
        if (item.course?.id) {
            type = "course";
            details = item.course;
        }
        else if (item.semester?.id) {
            type = "semester";
            details = item.semester;
        }
        else if (item.chapter?.id) {
            type = "chapter";
            details = item.chapter;
        }
        return {
            id: item.enrollmentId ?? `inv-${item.paymentDetails.id}`,
            status: item.status ?? "pending",
            paymentStatus: item.paymentDetails.status,
            date: item.createdAt,
            expiresAt: item.expiresAt ?? null,
            type,
            details: item.course?.id || item.semester?.id || item.chapter?.id || item.lesson?.id || null,
            pricePlan: item.pricePlan?.id ? item.pricePlan : null,
            payment: {
                id: item.paymentDetails.id,
                amount: item.paymentDetails.amount,
                status: item.paymentDetails.status,
                method: item.paymentDetails.method,
                receipt: item.paymentDetails.receipt,
                reason: item.paymentDetails.reason,
            },
        };
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "My Library retrieved successfully",
        count: formattedPurchases.length,
        purchases: formattedPurchases,
    }, 200);
};
exports.getMyPurchases = getMyPurchases;
// ─── 3. Course content for enrolled student ───────────────────────────────────
const getEnrolledCourseById = async (req, res) => {
    const { id: courseId } = req.params;
    const studentId = req.user.id;
    const [enrollment] = await connection_1.db
        .select()
        .from(schema_1.enrolledItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, studentId), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.courseId, courseId), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "active")));
    if (!enrollment) {
        throw new Errors_1.BadRequest("Access denied. You are not enrolled in this course.");
    }
    // Check if the enrollment has expired
    if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
        throw new Errors_1.BadRequest("Your enrollment for this course has expired. Please renew your subscription.");
    }
    const courseContent = await connection_1.db
        .select()
        .from(schema_1.semesters)
        .leftJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.semesters.id, schema_1.chapters.semesterId))
        .leftJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.chapters.id, schema_1.lessons.chapterId))
        .where((0, drizzle_orm_1.eq)(schema_1.semesters.courseId, courseId))
        .orderBy(schema_1.semesters.id, schema_1.chapters.id, schema_1.lessons.id);
    return (0, response_1.SuccessResponse)(res, { message: "Course content retrieved", content: courseContent }, 200);
};
exports.getEnrolledCourseById = getEnrolledCourseById;
