// import { Request, Response } from "express";
// import { v4 as uuidv4 } from "uuid";
// import { db } from "../../models/connection";
// import { enrolledItems, courses, chapters, lessons, semesters, wallet, walletTransaction, paymentMethod, payment, teachers } from "../../models/schema";
// import { prices } from "../../models/schema/admin/prices";
// import { eq, and, or, inArray, aliasedTable, sql, count , isNull} from "drizzle-orm";
// import { SuccessResponse } from "../../utils/response";
// import { BadRequest } from "../../Errors/BadRequest";
// import { validateAndSaveLogo } from "../../utils/handleImages";

// // ─── helpers ────────────────────────────────────────────────────────────────

// /** Add `durationDays` to now and return the resulting Date.
//  *  Forces the value to a real number to avoid MySQL returning
//  *  int columns as strings, which would cause string concatenation
//  *  in setDate() instead of numeric addition.
//  */
// function calcExpiresAt(durationDays: number, from: Date = new Date()): Date {
//     const days = Math.floor(Number(durationDays) || 0);
//     const d = new Date(from);
//     d.setDate(d.getDate() + days);
//     return d;
// }

// // ─── 1. Enroll / Purchase Item ───────────────────────────────────────────────
// export const enrollInCourse = async (req: Request, res: Response) => {
//     const studentId = req.user.id;

//     /**
//      * New request body shape:
//      * {
//      *   courses?:  { id: string; priceId: string }[],
//      *
//      *   chapters?: { id: string; priceId: string }[],
//      *   lessons?:  { id: string; priceId: string }[],
//      *
//      *   paymentType:      "wallet" | "method",
//      *   paymentMethodId?: string,        // required when paymentType !== "wallet"
//      *   image?:           string         // receipt for Manual payment methods
//      * }
//      */
//     const {
//         courses: coursesPayload,   
//         chapters: chaptersPayload,
//         lessons: lessonsPayload,
//         paymentType,
//         paymentMethodId,
//         image,
//     } = req.body;

//     // ── Duplicate-enrollment guard ────────────────────────────────────────────
//     const checkConditions: any[] = [];

//     if (Array.isArray(coursesPayload) && coursesPayload.length > 0) {
//         const ids = coursesPayload.map((c: any) => c.id);
//         checkConditions.push(inArray(enrolledItems.courseId, ids));
//     }

//     if (Array.isArray(chaptersPayload) && chaptersPayload.length > 0) {
//         const ids = chaptersPayload.map((c: any) => c.id);
//         checkConditions.push(inArray(enrolledItems.chapterId, ids));
//     }
//     if (Array.isArray(lessonsPayload) && lessonsPayload.length > 0) {
//         const ids = lessonsPayload.map((l: any) => l.id);
//         checkConditions.push(inArray(enrolledItems.lessonId, ids));
//     }

//     if (checkConditions.length > 0) {
//         const existing = await db
//             .select()
//             .from(enrolledItems)
//             .where(
//                 and(
//                     eq(enrolledItems.studentId, studentId),
//                     or(...checkConditions),
//                     // treat "expired" rows as no longer active so re-purchase is allowed
//                     or(
//                         eq(enrolledItems.status, "active"),
//                         eq(enrolledItems.status, "pending")
//                     )
//                 )
//             );

//         if (existing.length > 0) {
//             throw new BadRequest("You have already purchased one or more of the selected items");
//         }
//     }

//     // ── Transaction ───────────────────────────────────────────────────────────
//     await db.transaction(async (tx) => {
//         let totalPrice = 0;

//         // Each entry: { courseId?, chapterId?, lessonId?, priceId, expiresAt }
//         const itemsToEnroll: any[] = [];

//         // 1. Courses (bulk)
//         if (Array.isArray(coursesPayload)) {
//             for (const entry of coursesPayload) {
//                 const { id, priceId } = entry;
//                 if (!priceId) throw new BadRequest(`priceId is required for course ${id}`);

//                 const [item] = await tx.select().from(courses).where(eq(courses.id, id));
//                 if (!item) throw new BadRequest(`Course ${id} not found`);

//                 const [plan] = await tx
//                     .select()
//                     .from(prices)
//                     .where(
//                         and(
//                             eq(prices.id, priceId),
//                             eq(prices.targetType, "course"),
//                             eq(prices.targetId, id)
//                         )
//                     );
//                 if (!plan) throw new BadRequest(`Price plan not found for course ${id}`);

//                 totalPrice += Number(plan.totalPriceEgp || 0);
//                 itemsToEnroll.push({
//                     courseId: id,
//                     priceId: plan.id,
//                     expiresAt: calcExpiresAt(plan.durationDays),
//                 });
//             }
//         }

//         // 2. Chapters (bulk)
//         if (Array.isArray(chaptersPayload)) {
//             for (const entry of chaptersPayload) {
//                 const { id, priceId } = entry;
//                 if (!priceId) throw new BadRequest(`priceId is required for chapter ${id}`);

//                 const [item] = await tx.select().from(chapters).where(eq(chapters.id, id));
//                 if (!item) throw new BadRequest(`Chapter ${id} not found`);

//                 const [plan] = await tx
//                     .select()
//                     .from(prices)
//                     .where(
//                         and(
//                             eq(prices.id, priceId),
//                             eq(prices.targetType, "chapter"),
//                             eq(prices.targetId, id)
//                         )
//                     );
//                 if (!plan) throw new BadRequest(`Price plan not found for chapter ${id}`);

//                 totalPrice += Number(plan.totalPriceEgp || 0);
//                 itemsToEnroll.push({
//                     chapterId: id,
//                     priceId: plan.id,
//                     expiresAt: calcExpiresAt(plan.durationDays),
//                 });
//             }
//         }

//         // 3. Lessons (bulk)
//         if (Array.isArray(lessonsPayload)) {
//             for (const entry of lessonsPayload) {
//                 const { id, priceId } = entry;
//                 if (!priceId) throw new BadRequest(`priceId is required for lesson ${id}`);

//                 const [item] = await tx.select().from(lessons).where(eq(lessons.id, id));
//                 if (!item) throw new BadRequest(`Lesson ${id} not found`);

//                 const [plan] = await tx
//                     .select()
//                     .from(prices)
//                     .where(
//                         and(
//                             eq(prices.id, priceId),
//                             eq(prices.targetType, "lesson"),
//                             eq(prices.targetId, id)
//                         )
//                     );
//                 if (!plan) throw new BadRequest(`Price plan not found for lesson ${id}`);

//                 totalPrice += Number(plan.totalPriceEgp || 0);
//                 itemsToEnroll.push({
//                     lessonId: id,
//                     priceId: plan.id,
//                     expiresAt: calcExpiresAt(plan.durationDays),
//                 });
//             }
//         }

//         if (itemsToEnroll.length === 0) throw new BadRequest("No items selected for enrollment");

//         // ── Payment processing ────────────────────────────────────────────────
//         let paymentRecordId: string | null = null;
//         let enrollmentStatus: "active" | "pending" = "pending";
//         let paymentStatus: "pending" | "completed" | "rejected" = "pending";

//         // a. Wallet
//         if (paymentType === "wallet") {
//             const [sw] = await tx.select().from(wallet).where(eq(wallet.studentId, studentId));
//             if (!sw) throw new BadRequest("No wallet found for this student. Please contact support.");
//             if (sw.balance < totalPrice) {
//                 throw new BadRequest(
//                     `Insufficient balance. Your balance is ${sw.balance} EGP, but total is ${totalPrice} EGP`
//                 );
//             }

//             await tx.update(wallet).set({ balance: sw.balance - totalPrice }).where(eq(wallet.id, sw.id));
//             await tx.insert(walletTransaction).values({
//                 walletId: sw.id,
//                 amount: totalPrice,
//                 type: "withdrawal",
//                 source: "Student",
//             });

//             enrollmentStatus = "active";
//             paymentStatus = "completed";
//         }
//         // b. Payment method (Manual / Automatic)
//         else {
//             if (!paymentMethodId) throw new BadRequest("Payment method ID is required");

//             const [method] = await tx.select().from(paymentMethod).where(eq(paymentMethod.id, paymentMethodId));
//             if (!method) throw new BadRequest("Invalid payment method");

//             let savedImageUrl: string | null = null;

//             if (method.type === "Manual") {
//                 if (!image) throw new BadRequest("Receipt image is required for manual payment");
//                 savedImageUrl = await validateAndSaveLogo(req, image, "payments");
//                 paymentStatus = "pending";
//                 enrollmentStatus = "pending";
//             } else {
//                 // Automatic (Visa / Stripe / etc.)
//                 paymentStatus = "completed";
//                 enrollmentStatus = "active";
//             }

//             const paymentId = uuidv4();
//             await tx.insert(payment).values({
//                 id: paymentId,
//                 studentId,
//                 paymentMethodId,
//                 amount: totalPrice,
//                 status: paymentStatus,
//                 receiptImg: savedImageUrl,
//                 source: "student",
//                 purpose: "purchase",
//             });

//             paymentRecordId = paymentId;
//         }

//         // ── Insert enrolled rows ──────────────────────────────────────────────
//         for (const item of itemsToEnroll) {
//             await tx.insert(enrolledItems).values({
//                 studentId,
//                 ...item,
//                 ...(paymentRecordId ? { paymentId: paymentRecordId } : {}),
//                 status: enrollmentStatus,
//             });
//         }
//     });

//     return SuccessResponse(res, { message: "Purchase request processed successfully" }, 201);
// };

// // ─── 2. My Purchases ─────────────────────────────────────────────────────────
// // export const getMyPurchases = async (req: Request, res: Response) => {
// //     const studentId = req.user.id;
// //     const { status, paymentStatus } = req.query;

// //     const courseOfSemester = aliasedTable(courses, "course_of_semester");
// //     const courseOfChapter  = aliasedTable(courses, "course_of_chapter");
// //     const chapterOfLesson  = aliasedTable(chapters, "chapter_of_lesson");

// //     let query = db
// //         .select({
// //             enrollmentId: enrolledItems.id,
// //             status:       enrolledItems.status,
// //             createdAt:    enrolledItems.createdAt,
// //             expiresAt:    enrolledItems.expiresAt,
// //             pricePlan: {
// //                 id:            prices.id,
// //                 label:         prices.durationLabel,
// //                 durationDays:  prices.durationDays,
// //                 priceEgp:      prices.totalPriceEgp,
// //                 priceUsd:      prices.totalPriceUsd,
// //             },
// //             course: {
// //                 id:    courses.id,
// //                 name:  courses.name,
// //                 image: courses.image,
// //             },
// //             semester: {
// //                 id:         semesters.id,
// //                 name:       semesters.name,
// //                 courseName: courseOfSemester.name,
// //             },
// //             chapter: {
// //                 id:         chapters.id,
// //                 name:       chapters.name,
// //                 courseName: courseOfChapter.name,
// //             },
// //             lesson: {
// //                 id:          lessons.id,
// //                 name:        lessons.name,
// //                 chapterName: chapterOfLesson.name,
// //             },
// //             paymentDetails: {
// //                 id:      payment.id,
// //                 amount:  payment.amount,
// //                 status:  payment.status,
// //                 method:  paymentMethod.name,
// //                 receipt: payment.receiptImg,
// //             },
// //         })
// //         .from(enrolledItems)
// //         .leftJoin(prices,           eq(enrolledItems.priceId,    prices.id))
// //         .leftJoin(courses,          eq(enrolledItems.courseId,   courses.id))
// //         .leftJoin(semesters,        eq(enrolledItems.semesterId, semesters.id))
// //         .leftJoin(courseOfSemester, eq(semesters.courseId,       courseOfSemester.id))
// //         .leftJoin(chapters,         eq(enrolledItems.chapterId,  chapters.id))
// //         .leftJoin(courseOfChapter,  eq(chapters.courseId,        courseOfChapter.id))
// //         .leftJoin(lessons,          eq(enrolledItems.lessonId,   lessons.id))
// //         .leftJoin(chapterOfLesson,  eq(lessons.chapterId,        chapterOfLesson.id))
// //         .leftJoin(payment,          eq(enrolledItems.paymentId,  payment.id))
// //         .leftJoin(paymentMethod,    eq(payment.paymentMethodId,  paymentMethod.id))
// //         .where(eq(enrolledItems.studentId, studentId))
// //         .$dynamic();

// //     if (status) {
// //         query = query.where(eq(enrolledItems.status, status as any));
// //     }

// //     if (paymentStatus) {
// //         query = query.where(eq(payment.status, paymentStatus as any));
// //     }

// //     const purchases = await query.orderBy(sql`${enrolledItems.createdAt} DESC`);

// //     const formattedPurchases = purchases.map((item) => {
// //         let type: "course" | "semester" | "chapter" | "lesson" = "lesson";
// //         let details: any = item.lesson;

// //         if (item.course?.id) {
// //             type = "course";
// //             details = item.course;
// //         } else if (item.semester?.id) {
// //             type = "semester";
// //             details = item.semester;
// //         } else if (item.chapter?.id) {
// //             type = "chapter";
// //             details = item.chapter;
// //         }

// //         return {
// //             id:            item.enrollmentId,
// //             status:        item.status,
// //             paymentStatus: item.paymentDetails.status ?? null,
// //             date:          item.createdAt,
// //             expiresAt:     item.expiresAt,
// //             type,
// //             details,
// //             pricePlan: item.pricePlan?.id ? item.pricePlan : null,
// //             payment:   item.paymentDetails.amount ? {
// //                 id:      item.paymentDetails.id,
// //                 amount:  item.paymentDetails.amount,
// //                 status:  item.paymentDetails.status,
// //                 method:  item.paymentDetails.method,
// //                 receipt: item.paymentDetails.receipt,
// //             } : null,
// //         };
// //     });

// //     return SuccessResponse(
// //         res,
// //         {
// //             message:   "My Library retrieved successfully",
// //             count:     formattedPurchases.length,
// //             purchases: formattedPurchases,
// //         },
// //         200
// //     );
// // };

// export const getMyPurchases = async (req: Request, res: Response) => {
//     const studentId = req.user.id;
//     const { status, paymentStatus } = req.query;

//     const courseOfSemester = aliasedTable(courses, "course_of_semester");
//     const courseOfChapter  = aliasedTable(courses, "course_of_chapter");
//     const chapterOfLesson  = aliasedTable(chapters, "chapter_of_lesson");

//     // 1. الشروط الأساسية مبنية على جدول الـ payment مباشرة لضمان عدم سقوط الـ rejected
//     const conditions = [
//         eq(payment.studentId, studentId),
//         eq(payment.purpose, "purchase") // جلب المشتريات فقط وتجاهل شحن المحفظة
//     ];

//     // 2. فلاتر اختيارية من الـ Query
//     if (paymentStatus && typeof paymentStatus === "string" && paymentStatus.trim() !== "") {
//         conditions.push(eq(payment.status, paymentStatus as any));
//     }
//     if (status && typeof status === "string" && status.trim() !== "") {
//         conditions.push(eq(enrolledItems.status, status as any));
//     }

//     // 3. الاستعلام يبدأ من الـ payment لضمان ظهور الفاتورة المرفوضة
//     const purchases = await db
//         .select({
//             enrollmentId:  enrolledItems.id,
//             status:        enrolledItems.status, 
//             createdAt:     payment.createdAt,    
//             expiresAt:     enrolledItems.expiresAt,
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
//                 status:  payment.status, // pending, completed, rejected
//                 method:  paymentMethod.name,
//                 receipt: payment.receiptImg,
//                 purpose: payment.purpose,
//                 reason:  payment.reason,
//             },
//         })
//         .from(payment) // 👈 الانطلاق من هنا يضمن ألا تختفي أي فاتورة مرفوضة
//         .leftJoin(enrolledItems,    eq(enrolledItems.paymentId,  payment.id))
//         .leftJoin(prices,           eq(enrolledItems.priceId,    prices.id))
//         .leftJoin(courses,          eq(enrolledItems.courseId,   courses.id))
//         .leftJoin(semesters,        eq(enrolledItems.semesterId, semesters.id))
//         .leftJoin(courseOfSemester, eq(semesters.courseId,       courseOfSemester.id))
//         .leftJoin(chapters,         eq(enrolledItems.chapterId,  chapters.id))
//         .leftJoin(courseOfChapter,  eq(chapters.courseId,        courseOfChapter.id))
//         .leftJoin(lessons,          eq(enrolledItems.lessonId,   lessons.id))
//         .leftJoin(chapterOfLesson,  eq(lessons.chapterId,        chapterOfLesson.id))
//         .leftJoin(paymentMethod,    eq(payment.paymentMethodId,  paymentMethod.id))
//         .where(and(...conditions))
//         .orderBy(sql`${payment.createdAt} DESC`);

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

//         // إذا كانت الفاتورة مرفوضة ولم ينشأ لها سجل اشتراك، نضع تفاصيل تقريبية من الـ Price Plan أو نترك الـ details كما هي
//         return {
//             id:            item.enrollmentId ?? `inv-${item.paymentDetails.id}`, // fallback id للفرونت إند
//             status:        item.status ?? "pending", 
//             paymentStatus: item.paymentDetails.status,
//             date:          item.createdAt,
//             expiresAt:     item.expiresAt ?? null,
//             type,
//             details:       item.course?.id || item.semester?.id || item.chapter?.id || item.lesson?.id || null,
//             pricePlan:     item.pricePlan?.id ? item.pricePlan : null,
//             payment: {
//                 id:      item.paymentDetails.id,
//                 amount:  item.paymentDetails.amount,
//                 status:  item.paymentDetails.status,
//                 method:  item.paymentDetails.method,
//                 receipt: item.paymentDetails.receipt,
//                 reason:  item.paymentDetails.reason,
//             },
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

// // ─── 3. Course content for enrolled student ───────────────────────────────────
// export const getEnrolledCourseById = async (req: Request, res: Response) => {
//     const { id: courseId } = req.params;
//     const studentId = req.user.id;

//     const [enrollment] = await db
//         .select()
//         .from(enrolledItems)
//         .where(
//             and(
//                 eq(enrolledItems.studentId, studentId),
//                 eq(enrolledItems.courseId, courseId),
//                 eq(enrolledItems.status, "active")
//             )
//         );

//     if (!enrollment) {
//         throw new BadRequest("Access denied. You are not enrolled in this course.");
//     }

//     // Check if the enrollment has expired
//     if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
//         throw new BadRequest("Your enrollment for this course has expired. Please renew your subscription.");
//     }

//     const courseContent = await db
//         .select()
//         .from(semesters)
//         .leftJoin(chapters, eq(semesters.id, chapters.semesterId))
//         .leftJoin(lessons,  eq(chapters.id,  lessons.chapterId))
//         .where(eq(semesters.courseId, courseId))
//         .orderBy(semesters.id, chapters.id, lessons.id);

//     return SuccessResponse(res, { message: "Course content retrieved", content: courseContent }, 200);
// };



import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../models/connection";
import { enrolledItems, courses, chapters, lessons, semesters, wallet, walletTransaction, paymentMethod, payment, teachers } from "../../models/schema";
import { prices } from "../../models/schema/admin/prices";
import { Student } from "../../models/schema/admin/Student";
import { eq, and, or, inArray, aliasedTable, sql, count , isNull} from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { validateAndSaveLogo } from "../../utils/handleImages";
import { createPaymobCheckoutSession } from "../../utils/paymob";
import { validatePromoCode } from "../../utils/promoCodeValidation";
import { promoCodesUsers } from "../../models/schema";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Add `durationDays` to now and return the resulting Date.
 *  Forces the value to a real number to avoid MySQL returning
 *  int columns as strings, which would cause string concatenation
 *  in setDate() instead of numeric addition.
 */
function calcExpiresAt(durationDays: number, from: Date = new Date()): Date {
    const days = Math.floor(Number(durationDays) || 0);
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * Shared helper: collect all items to enroll and their total price from the request body.
 * Returns { itemsToEnroll, totalPrice }.
 */
async function resolveEnrollmentItems(
    tx: any,
    coursesPayload: any[],
    chaptersPayload: any[],
    lessonsPayload: any[]
): Promise<{ itemsToEnroll: any[]; totalPrice: number }> {
    let totalPrice = 0;
    const itemsToEnroll: any[] = [];

    // 1. Courses
    if (Array.isArray(coursesPayload)) {
        for (const entry of coursesPayload) {
            const { id, priceId } = entry;
            if (!priceId) throw new BadRequest(`priceId is required for course ${id}`);

            const [item] = await tx.select().from(courses).where(eq(courses.id, id));
            if (!item) throw new BadRequest(`Course ${id} not found`);

            const [plan] = await tx
                .select()
                .from(prices)
                .where(and(eq(prices.id, priceId), eq(prices.targetType, "course"), eq(prices.targetId, id)));
            if (!plan) throw new BadRequest(`Price plan not found for course ${id}`);

            totalPrice += Number(plan.totalPriceEgp || 0);
            itemsToEnroll.push({ courseId: id, priceId: plan.id, expiresAt: calcExpiresAt(plan.durationDays) });
        }
    }

    // 2. Chapters
    if (Array.isArray(chaptersPayload)) {
        for (const entry of chaptersPayload) {
            const { id, priceId } = entry;
            if (!priceId) throw new BadRequest(`priceId is required for chapter ${id}`);

            const [item] = await tx.select().from(chapters).where(eq(chapters.id, id));
            if (!item) throw new BadRequest(`Chapter ${id} not found`);

            const [plan] = await tx
                .select()
                .from(prices)
                .where(and(eq(prices.id, priceId), eq(prices.targetType, "chapter"), eq(prices.targetId, id)));
            if (!plan) throw new BadRequest(`Price plan not found for chapter ${id}`);

            totalPrice += Number(plan.totalPriceEgp || 0);
            itemsToEnroll.push({ chapterId: id, priceId: plan.id, expiresAt: calcExpiresAt(plan.durationDays) });
        }
    }

    // 3. Lessons
    if (Array.isArray(lessonsPayload)) {
        for (const entry of lessonsPayload) {
            const { id, priceId } = entry;
            if (!priceId) throw new BadRequest(`priceId is required for lesson ${id}`);

            const [item] = await tx.select().from(lessons).where(eq(lessons.id, id));
            if (!item) throw new BadRequest(`Lesson ${id} not found`);

            const [plan] = await tx
                .select()
                .from(prices)
                .where(and(eq(prices.id, priceId), eq(prices.targetType, "lesson"), eq(prices.targetId, id)));
            if (!plan) throw new BadRequest(`Price plan not found for lesson ${id}`);

            totalPrice += Number(plan.totalPriceEgp || 0);
            itemsToEnroll.push({ lessonId: id, priceId: plan.id, expiresAt: calcExpiresAt(plan.durationDays) });
        }
    }

    if (itemsToEnroll.length === 0) throw new BadRequest("No items selected for enrollment");

    return { itemsToEnroll, totalPrice };
}

// ─── Duplicate-enrollment guard ──────────────────────────────────────────────
async function checkDuplicateEnrollment(
    studentId: string,
    coursesPayload: any[],
    chaptersPayload: any[],
    lessonsPayload: any[]
) {
    const checkConditions: any[] = [];

    if (Array.isArray(coursesPayload) && coursesPayload.length > 0)
        checkConditions.push(inArray(enrolledItems.courseId, coursesPayload.map((c: any) => c.id)));

    if (Array.isArray(chaptersPayload) && chaptersPayload.length > 0)
        checkConditions.push(inArray(enrolledItems.chapterId, chaptersPayload.map((c: any) => c.id)));

    if (Array.isArray(lessonsPayload) && lessonsPayload.length > 0)
        checkConditions.push(inArray(enrolledItems.lessonId, lessonsPayload.map((l: any) => l.id)));

    if (checkConditions.length > 0) {
        const existing = await db
            .select()
            .from(enrolledItems)
            .where(
                and(
                    eq(enrolledItems.studentId, studentId),
                    or(...checkConditions),
                    or(eq(enrolledItems.status, "active"), eq(enrolledItems.status, "pending"))
                )
            );

        if (existing.length > 0)
            throw new BadRequest("You have already purchased one or more of the selected items");
    }
}

// ─── 1. Enroll / Purchase Item (Wallet & Manual) ─────────────────────────────
export const enrollInCourse = async (req: Request, res: Response) => {
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
    const {
        courses: coursesPayload,
        chapters: chaptersPayload,
        lessons: lessonsPayload,
        paymentType,
        paymentMethodId,
        image,
        promoCode,
    } = req.body;

    if (paymentType === "automatic") {
        throw new BadRequest("For automatic (Paymob) payments, use POST /enroll/automatic");
    }

    await checkDuplicateEnrollment(studentId, coursesPayload, chaptersPayload, lessonsPayload);

    await db.transaction(async (tx) => {
        let { itemsToEnroll, totalPrice } = await resolveEnrollmentItems(tx, coursesPayload, chaptersPayload, lessonsPayload);

        let appliedPromoCodeId: string | undefined;
        if (promoCode) {
            const promo = await validatePromoCode(promoCode, studentId, { 
                courseIds: coursesPayload?.map((c: any) => c.id), 
                chapterIds: chaptersPayload?.map((c: any) => c.id), 
                lessonIds: lessonsPayload?.map((c: any) => c.id) 
            });
            appliedPromoCodeId = promo.id;
            const discountVal = totalPrice * (promo.discountAmount / 100);
            totalPrice = Math.round(Math.max(0, totalPrice - discountVal));
        }

        let paymentRecordId: string | null = null;
        let enrollmentStatus: "active" | "pending" = "pending";
        let paymentStatus: "pending" | "completed" | "rejected" = "pending";

        // a. Wallet
        if (paymentType === "wallet") {
            const [sw] = await tx.select().from(wallet).where(eq(wallet.studentId, studentId));
            if (!sw) throw new BadRequest("No wallet found for this student. Please contact support.");
            if (sw.balance < totalPrice) {
                throw new BadRequest(`Insufficient balance. Your balance is ${sw.balance} EGP, but total is ${totalPrice} EGP`);
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

            if (appliedPromoCodeId) {
                await tx.insert(promoCodesUsers).values({
                    promoCodeId: appliedPromoCodeId,
                    userId: studentId,
                });
            }
        }
        // b. Manual payment method
        else {
            if (!paymentMethodId) throw new BadRequest("Payment method ID is required");

            const [method] = await tx.select().from(paymentMethod).where(eq(paymentMethod.id, paymentMethodId));
            if (!method) throw new BadRequest("Invalid payment method");
            if (!method.isActive) throw new BadRequest("Payment method is not active");
            if (method.type !== "Manual") throw new BadRequest("Only manual payment methods are accepted here. Use /enroll/automatic for Paymob.");

            if (!image) throw new BadRequest("Receipt image is required for manual payment");
            const savedImageUrl = await validateAndSaveLogo(req, image, "payments");

            const paymentId = uuidv4();
            await tx.insert(payment).values({
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

// ─── 1b. Initiate Automatic Enrollment via Paymob ────────────────────────────
export const initiateAutomaticEnrollment = async (req: Request, res: Response) => {
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
    const {
        courses: coursesPayload,
        chapters: chaptersPayload,
        lessons: lessonsPayload,
        paymentMethodId,
        promoCode,
    } = req.body;

    if (!paymentMethodId) throw new BadRequest("Payment method ID is required");

    // 1. Validate payment method is Paymob Automatic
    const [method] = await db.select({
        id: paymentMethod.id,
        name: paymentMethod.name,
        isActive: paymentMethod.isActive,
        type: paymentMethod.type,
    }).from(paymentMethod).where(eq(paymentMethod.id, paymentMethodId)).limit(1);

    if (!method) throw new NotFound("Payment method not found");
    if (!method.isActive) throw new BadRequest("Payment method is not active");
    if (method.type !== "Automatic") throw new BadRequest("Selected payment method is not an automatic payment method");
    if (method.name.toLowerCase() !== "paymob") throw new BadRequest("Automatic payments are currently available only through Paymob");

    // 2. Check for duplicate enrollments
    await checkDuplicateEnrollment(studentId, coursesPayload, chaptersPayload, lessonsPayload);

    // 3. Resolve items and total price (use db directly, not a transaction yet)
    let { itemsToEnroll, totalPrice } = await resolveEnrollmentItems(db, coursesPayload, chaptersPayload, lessonsPayload);

    let appliedPromoCodeId: string | undefined;
    if (promoCode) {
        const promo = await validatePromoCode(promoCode, studentId, { 
            courseIds: coursesPayload?.map((c: any) => c.id), 
            chapterIds: chaptersPayload?.map((c: any) => c.id), 
            lessonIds: lessonsPayload?.map((c: any) => c.id) 
        });
        appliedPromoCodeId = promo.id;
        const discountVal = totalPrice * (promo.discountAmount / 100);
        totalPrice = Math.round(Math.max(0, totalPrice - discountVal));
    }

    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
        throw new BadRequest("Total price for selected items is invalid or zero");
    }

    // 4. Get student info for Paymob billing data
    const [student] = await db.select({
        id: Student.id,
        firstname: Student.firstname,
        lastname: Student.lastname,
        email: Student.email,
        phone: Student.phone,
    }).from(Student).where(eq(Student.id, studentId)).limit(1);

    if (!student) throw new NotFound("Student not found");

    // 5. Create pending payment record and pending enrolled items
    const paymentId = uuidv4();

    await db.transaction(async (tx) => {
        await tx.insert(payment).values({
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
            await tx.insert(enrolledItems).values({
                studentId,
                ...item,
                paymentId,
                status: "pending",
            });
        }
    });

    // 6. Initiate Paymob checkout session
    try {
        const checkoutSession = await createPaymobCheckoutSession({
            amountCents: Math.round(totalPrice * 100),
            merchantOrderId: paymentId,
            student,
        });

        return SuccessResponse(res, {
            message: "Automatic enrollment payment session created. Complete payment on the checkout URL.",
            paymentId,
            totalAmount: totalPrice,
            paymentMethod: method.name,
            checkoutUrl: checkoutSession.checkoutUrl,
            iframeUrl: checkoutSession.iframeUrl,
            paymobOrderId: checkoutSession.paymobOrderId,
            callbackUrl: checkoutSession.callbackUrl,
        }, 201);
    } catch (error: any) {
        // Rollback pending records if Paymob fails
        await db.delete(enrolledItems).where(eq(enrolledItems.paymentId, paymentId));
        await db.delete(payment).where(eq(payment.id, paymentId));
        throw new BadRequest(error?.message || "Failed to initialize automatic enrollment payment");
    }
};

// ─── 2. My Purchases ─────────────────────────────────────────────────────────
export const getMyPurchases = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const { status, paymentStatus } = req.query;

    const courseOfSemester = aliasedTable(courses, "course_of_semester");
    const courseOfChapter  = aliasedTable(courses, "course_of_chapter");
    const chapterOfLesson  = aliasedTable(chapters, "chapter_of_lesson");

    // 1. Base conditions on the payment table to preserve rejected invoices
    const conditions = [
        eq(payment.studentId, studentId),
        eq(payment.purpose, "purchase")
    ];

    if (paymentStatus && typeof paymentStatus === "string" && paymentStatus.trim() !== "") {
        conditions.push(eq(payment.status, paymentStatus as any));
    }
    if (status && typeof status === "string" && status.trim() !== "") {
        conditions.push(eq(enrolledItems.status, status as any));
    }

    const purchases = await db
        .select({
            enrollmentId:  enrolledItems.id,
            status:        enrolledItems.status,
            createdAt:     payment.createdAt,
            expiresAt:     enrolledItems.expiresAt,
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
                purpose: payment.purpose,
                reason:  payment.reason,
            },
        })
        .from(payment)
        .leftJoin(enrolledItems,    eq(enrolledItems.paymentId,  payment.id))
        .leftJoin(prices,           eq(enrolledItems.priceId,    prices.id))
        .leftJoin(courses,          eq(enrolledItems.courseId,   courses.id))
        .leftJoin(semesters,        eq(enrolledItems.semesterId, semesters.id))
        .leftJoin(courseOfSemester, eq(semesters.courseId,       courseOfSemester.id))
        .leftJoin(chapters,         eq(enrolledItems.chapterId,  chapters.id))
        .leftJoin(courseOfChapter,  eq(chapters.courseId,        courseOfChapter.id))
        .leftJoin(lessons,          eq(enrolledItems.lessonId,   lessons.id))
        .leftJoin(chapterOfLesson,  eq(lessons.chapterId,        chapterOfLesson.id))
        .leftJoin(paymentMethod,    eq(payment.paymentMethodId,  paymentMethod.id))
        .where(and(...conditions))
        .orderBy(sql`${payment.createdAt} DESC`);

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
            id:            item.enrollmentId ?? `inv-${item.paymentDetails.id}`,
            status:        item.status ?? "pending",
            paymentStatus: item.paymentDetails.status,
            date:          item.createdAt,
            expiresAt:     item.expiresAt ?? null,
            type,
            details:       item.course?.id || item.semester?.id || item.chapter?.id || item.lesson?.id || null,
            pricePlan:     item.pricePlan?.id ? item.pricePlan : null,
            payment: {
                id:      item.paymentDetails.id,
                amount:  item.paymentDetails.amount,
                status:  item.paymentDetails.status,
                method:  item.paymentDetails.method,
                receipt: item.paymentDetails.receipt,
                reason:  item.paymentDetails.reason,
            },
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