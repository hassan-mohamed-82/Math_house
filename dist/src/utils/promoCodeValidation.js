"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePromoCode = void 0;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_orm_2 = require("drizzle-orm");
const Errors_1 = require("../Errors");
const validatePromoCode = async (code, studentId, itemsToPurchase) => {
    const [promoCode] = await connection_1.db.select().from(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.code, code));
    if (!promoCode)
        throw new Errors_1.BadRequest("Invalid promo code");
    const now = new Date();
    // Use string comparison if dates are strings, or date comparison if they are dates.
    // Drizzle with MySQL date type returns string or Date depending on config, but Date constructor handles both.
    if (now < new Date(promoCode.startDate) || now > new Date(promoCode.endDate)) {
        throw new Errors_1.BadRequest("Promo code is expired or not yet active");
    }
    // Check usage limits
    const [usageCount] = await connection_1.db
        .select({ value: (0, drizzle_orm_2.count)() })
        .from(schema_1.promoCodesUsers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.promoCodesUsers.promoCodeId, promoCode.id), (0, drizzle_orm_1.eq)(schema_1.promoCodesUsers.userId, studentId)));
    if (usageCount.value >= promoCode.numberOfUsages) {
        throw new Errors_1.BadRequest(`Promo code usage limit exceeded. You can only use it ${promoCode.numberOfUsages} times.`);
    }
    // Check restricted access
    if (promoCode.type === "restricted") {
        const [allowed] = await connection_1.db
            .select()
            .from(schema_1.promoCodesAllowedStudents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.promoCodesAllowedStudents.promoCodeId, promoCode.id), (0, drizzle_orm_1.eq)(schema_1.promoCodesAllowedStudents.studentId, studentId)));
        if (!allowed) {
            throw new Errors_1.BadRequest("This promo code is restricted and not available for your account.");
        }
    }
    // Check applicability
    const [packagesLinks, coursesLinks, chaptersLinks, lessonsLinks] = await Promise.all([
        connection_1.db.select().from(schema_1.promoCodesPackages).where((0, drizzle_orm_1.eq)(schema_1.promoCodesPackages.promoCodeId, promoCode.id)),
        connection_1.db.select().from(schema_1.promoCodesCourses).where((0, drizzle_orm_1.eq)(schema_1.promoCodesCourses.promoCodeId, promoCode.id)),
        connection_1.db.select().from(schema_1.promoCodesChapters).where((0, drizzle_orm_1.eq)(schema_1.promoCodesChapters.promoCodeId, promoCode.id)),
        connection_1.db.select().from(schema_1.promoCodesLessons).where((0, drizzle_orm_1.eq)(schema_1.promoCodesLessons.promoCodeId, promoCode.id))
    ]);
    const hasLinks = packagesLinks.length > 0 || coursesLinks.length > 0 || chaptersLinks.length > 0 || lessonsLinks.length > 0;
    if (hasLinks) {
        let isApplicable = false;
        if (itemsToPurchase.packageId && packagesLinks.some(p => p.packageId === itemsToPurchase.packageId)) {
            isApplicable = true;
        }
        if (itemsToPurchase.courseIds) {
            if (itemsToPurchase.courseIds.some(id => coursesLinks.some(c => c.courseId === id)))
                isApplicable = true;
        }
        if (itemsToPurchase.chapterIds) {
            if (itemsToPurchase.chapterIds.some(id => chaptersLinks.some(c => c.chapterId === id)))
                isApplicable = true;
        }
        if (itemsToPurchase.lessonIds) {
            if (itemsToPurchase.lessonIds.some(id => lessonsLinks.some(l => l.lessonId === id)))
                isApplicable = true;
        }
        if (!isApplicable) {
            throw new Errors_1.BadRequest("This promo code does not apply to the selected items.");
        }
    }
    return promoCode;
};
exports.validatePromoCode = validatePromoCode;
