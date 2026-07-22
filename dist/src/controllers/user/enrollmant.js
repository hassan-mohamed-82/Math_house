"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnrolledCourseById = exports.getMyPurchases = exports.enrollInCourse = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const prices_1 = require("../../models/schema/admin/prices");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
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
// ─── 1. Enroll / Purchase Item ───────────────────────────────────────────────
const enrollInCourse = async (req, res) => {
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
    const { courses: coursesPayload, chapters: chaptersPayload, lessons: lessonsPayload, paymentType, paymentMethodId, image, } = req.body;
    // ── Duplicate-enrollment guard ────────────────────────────────────────────
    const checkConditions = [];
    if (Array.isArray(coursesPayload) && coursesPayload.length > 0) {
        const ids = coursesPayload.map((c) => c.id);
        checkConditions.push((0, drizzle_orm_1.inArray)(schema_1.enrolledItems.courseId, ids));
    }
    if (Array.isArray(chaptersPayload) && chaptersPayload.length > 0) {
        const ids = chaptersPayload.map((c) => c.id);
        checkConditions.push((0, drizzle_orm_1.inArray)(schema_1.enrolledItems.chapterId, ids));
    }
    if (Array.isArray(lessonsPayload) && lessonsPayload.length > 0) {
        const ids = lessonsPayload.map((l) => l.id);
        checkConditions.push((0, drizzle_orm_1.inArray)(schema_1.enrolledItems.lessonId, ids));
    }
    if (checkConditions.length > 0) {
        const existing = await connection_1.db
            .select()
            .from(schema_1.enrolledItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, studentId), (0, drizzle_orm_1.or)(...checkConditions), 
        // treat "expired" rows as no longer active so re-purchase is allowed
        (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "active"), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "pending"))));
        if (existing.length > 0) {
            throw new BadRequest_1.BadRequest("You have already purchased one or more of the selected items");
        }
    }
    // ── Transaction ───────────────────────────────────────────────────────────
    await connection_1.db.transaction(async (tx) => {
        let totalPrice = 0;
        // Each entry: { courseId?, chapterId?, lessonId?, priceId, expiresAt }
        const itemsToEnroll = [];
        // 1. Courses (bulk)
        if (Array.isArray(coursesPayload)) {
            for (const entry of coursesPayload) {
                const { id, priceId } = entry;
                if (!priceId)
                    throw new BadRequest_1.BadRequest(`priceId is required for course ${id}`);
                const [item] = await tx.select().from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.id, id));
                if (!item)
                    throw new BadRequest_1.BadRequest(`Course ${id} not found`);
                const [plan] = await tx
                    .select()
                    .from(prices_1.prices)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.id, priceId), (0, drizzle_orm_1.eq)(prices_1.prices.targetType, "course"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, id)));
                if (!plan)
                    throw new BadRequest_1.BadRequest(`Price plan not found for course ${id}`);
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
                if (!priceId)
                    throw new BadRequest_1.BadRequest(`priceId is required for chapter ${id}`);
                const [item] = await tx.select().from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.id, id));
                if (!item)
                    throw new BadRequest_1.BadRequest(`Chapter ${id} not found`);
                const [plan] = await tx
                    .select()
                    .from(prices_1.prices)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.id, priceId), (0, drizzle_orm_1.eq)(prices_1.prices.targetType, "chapter"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, id)));
                if (!plan)
                    throw new BadRequest_1.BadRequest(`Price plan not found for chapter ${id}`);
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
                if (!priceId)
                    throw new BadRequest_1.BadRequest(`priceId is required for lesson ${id}`);
                const [item] = await tx.select().from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.id, id));
                if (!item)
                    throw new BadRequest_1.BadRequest(`Lesson ${id} not found`);
                const [plan] = await tx
                    .select()
                    .from(prices_1.prices)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(prices_1.prices.id, priceId), (0, drizzle_orm_1.eq)(prices_1.prices.targetType, "lesson"), (0, drizzle_orm_1.eq)(prices_1.prices.targetId, id)));
                if (!plan)
                    throw new BadRequest_1.BadRequest(`Price plan not found for lesson ${id}`);
                totalPrice += Number(plan.totalPriceEgp || 0);
                itemsToEnroll.push({
                    lessonId: id,
                    priceId: plan.id,
                    expiresAt: calcExpiresAt(plan.durationDays),
                });
            }
        }
        if (itemsToEnroll.length === 0)
            throw new BadRequest_1.BadRequest("No items selected for enrollment");
        // ── Payment processing ────────────────────────────────────────────────
        let paymentRecordId = null;
        let enrollmentStatus = "pending";
        let paymentStatus = "pending";
        // a. Wallet
        if (paymentType === "wallet") {
            const [sw] = await tx.select().from(schema_1.wallet).where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId));
            if (!sw)
                throw new BadRequest_1.BadRequest("No wallet found for this student. Please contact support.");
            if (sw.balance < totalPrice) {
                throw new BadRequest_1.BadRequest(`Insufficient balance. Your balance is ${sw.balance} EGP, but total is ${totalPrice} EGP`);
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
        }
        // b. Payment method (Manual / Automatic)
        else {
            if (!paymentMethodId)
                throw new BadRequest_1.BadRequest("Payment method ID is required");
            const [method] = await tx.select().from(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, paymentMethodId));
            if (!method)
                throw new BadRequest_1.BadRequest("Invalid payment method");
            let savedImageUrl = null;
            if (method.type === "Manual") {
                if (!image)
                    throw new BadRequest_1.BadRequest("Receipt image is required for manual payment");
                savedImageUrl = await (0, handleImages_1.validateAndSaveLogo)(req, image, "payments");
                paymentStatus = "pending";
                enrollmentStatus = "pending";
            }
            else {
                // Automatic (Visa / Stripe / etc.)
                paymentStatus = "completed";
                enrollmentStatus = "active";
            }
            const paymentId = (0, uuid_1.v4)();
            await tx.insert(schema_1.payment).values({
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
// ─── 2. My Purchases ─────────────────────────────────────────────────────────
// export const getMyPurchases = async (req: Request, res: Response) => {
//     const studentId = req.user.id;
//     const { status, paymentStatus } = req.query;
//     const courseOfSemester = aliasedTable(courses, "course_of_semester");
//     const courseOfChapter  = aliasedTable(courses, "course_of_chapter");
//     const chapterOfLesson  = aliasedTable(chapters, "chapter_of_lesson");
//     let query = db
//         .select({
//             enrollmentId: enrolledItems.id,
//             status:       enrolledItems.status,
//             createdAt:    enrolledItems.createdAt,
//             expiresAt:    enrolledItems.expiresAt,
//             pricePlan: {
//                 id:            prices.id,
//                 label:         prices.durationLabel,
//                 durationDays:  prices.durationDays,
//                 priceEgp:      prices.totalPriceEgp,
//                 priceUsd:      prices.totalPriceUsd,
//             },
//             course: {
//                 id:    courses.id,
//                 name:  courses.name,
//                 image: courses.image,
//             },
//             semester: {
//                 id:         semesters.id,
//                 name:       semesters.name,
//                 courseName: courseOfSemester.name,
//             },
//             chapter: {
//                 id:         chapters.id,
//                 name:       chapters.name,
//                 courseName: courseOfChapter.name,
//             },
//             lesson: {
//                 id:          lessons.id,
//                 name:        lessons.name,
//                 chapterName: chapterOfLesson.name,
//             },
//             paymentDetails: {
//                 id:      payment.id,
//                 amount:  payment.amount,
//                 status:  payment.status,
//                 method:  paymentMethod.name,
//                 receipt: payment.receiptImg,
//             },
//         })
//         .from(enrolledItems)
//         .leftJoin(prices,           eq(enrolledItems.priceId,    prices.id))
//         .leftJoin(courses,          eq(enrolledItems.courseId,   courses.id))
//         .leftJoin(semesters,        eq(enrolledItems.semesterId, semesters.id))
//         .leftJoin(courseOfSemester, eq(semesters.courseId,       courseOfSemester.id))
//         .leftJoin(chapters,         eq(enrolledItems.chapterId,  chapters.id))
//         .leftJoin(courseOfChapter,  eq(chapters.courseId,        courseOfChapter.id))
//         .leftJoin(lessons,          eq(enrolledItems.lessonId,   lessons.id))
//         .leftJoin(chapterOfLesson,  eq(lessons.chapterId,        chapterOfLesson.id))
//         .leftJoin(payment,          eq(enrolledItems.paymentId,  payment.id))
//         .leftJoin(paymentMethod,    eq(payment.paymentMethodId,  paymentMethod.id))
//         .where(eq(enrolledItems.studentId, studentId))
//         .$dynamic();
//     if (status) {
//         query = query.where(eq(enrolledItems.status, status as any));
//     }
//     if (paymentStatus) {
//         query = query.where(eq(payment.status, paymentStatus as any));
//     }
//     const purchases = await query.orderBy(sql`${enrolledItems.createdAt} DESC`);
//     const formattedPurchases = purchases.map((item) => {
//         let type: "course" | "semester" | "chapter" | "lesson" = "lesson";
//         let details: any = item.lesson;
//         if (item.course?.id) {
//             type = "course";
//             details = item.course;
//         } else if (item.semester?.id) {
//             type = "semester";
//             details = item.semester;
//         } else if (item.chapter?.id) {
//             type = "chapter";
//             details = item.chapter;
//         }
//         return {
//             id:            item.enrollmentId,
//             status:        item.status,
//             paymentStatus: item.paymentDetails.status ?? null,
//             date:          item.createdAt,
//             expiresAt:     item.expiresAt,
//             type,
//             details,
//             pricePlan: item.pricePlan?.id ? item.pricePlan : null,
//             payment:   item.paymentDetails.amount ? {
//                 id:      item.paymentDetails.id,
//                 amount:  item.paymentDetails.amount,
//                 status:  item.paymentDetails.status,
//                 method:  item.paymentDetails.method,
//                 receipt: item.paymentDetails.receipt,
//             } : null,
//         };
//     });
//     return SuccessResponse(
//         res,
//         {
//             message:   "My Library retrieved successfully",
//             count:     formattedPurchases.length,
//             purchases: formattedPurchases,
//         },
//         200
//     );
// };
const getMyPurchases = async (req, res) => {
    const studentId = req.user.id;
    const { status, paymentStatus } = req.query;
    const courseOfSemester = (0, drizzle_orm_1.aliasedTable)(schema_1.courses, "course_of_semester");
    const courseOfChapter = (0, drizzle_orm_1.aliasedTable)(schema_1.courses, "course_of_chapter");
    const chapterOfLesson = (0, drizzle_orm_1.aliasedTable)(schema_1.chapters, "chapter_of_lesson");
    // 1. الشروط الأساسية مبنية على جدول الـ payment مباشرة لضمان عدم سقوط الـ rejected
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.payment.studentId, studentId),
        (0, drizzle_orm_1.eq)(schema_1.payment.purpose, "purchase") // جلب المشتريات فقط وتجاهل شحن المحفظة
    ];
    // 2. فلاتر اختيارية من الـ Query
    if (paymentStatus && typeof paymentStatus === "string" && paymentStatus.trim() !== "") {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.payment.status, paymentStatus));
    }
    if (status && typeof status === "string" && status.trim() !== "") {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, status));
    }
    // 3. الاستعلام يبدأ من الـ payment لضمان ظهور الفاتورة المرفوضة
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
            status: schema_1.payment.status, // pending, completed, rejected
            method: schema_1.paymentMethod.name,
            receipt: schema_1.payment.receiptImg,
            purpose: schema_1.payment.purpose,
            reason: schema_1.payment.reason,
        },
    })
        .from(schema_1.payment) // 👈 الانطلاق من هنا يضمن ألا تختفي أي فاتورة مرفوضة
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
        // إذا كانت الفاتورة مرفوضة ولم ينشأ لها سجل اشتراك، نضع تفاصيل تقريبية من الـ Price Plan أو نترك الـ details كما هي
        return {
            id: item.enrollmentId ?? `inv-${item.paymentDetails.id}`, // fallback id للفرونت إند
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
        throw new BadRequest_1.BadRequest("Access denied. You are not enrolled in this course.");
    }
    // Check if the enrollment has expired
    if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
        throw new BadRequest_1.BadRequest("Your enrollment for this course has expired. Please renew your subscription.");
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
