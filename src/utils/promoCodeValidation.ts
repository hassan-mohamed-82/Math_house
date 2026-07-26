import { db } from "../models/connection";
import { 
    promoCodes, 
    promoCodesUsers, 
    promoCodesAllowedStudents, 
    promoCodesPackages, 
    promoCodesCourses, 
    promoCodesChapters, 
    promoCodesLessons 
} from "../models/schema";
import { eq, and } from "drizzle-orm";
import { count } from "drizzle-orm";
import { BadRequest } from "../Errors";

export const validatePromoCode = async (
    code: string,
    studentId: string,
    itemsToPurchase: {
        packageId?: string;
        courseIds?: string[];
        chapterIds?: string[];
        lessonIds?: string[];
    }
) => {
    const [promoCode] = await db.select().from(promoCodes).where(eq(promoCodes.code, code));

    if (!promoCode) throw new BadRequest("Invalid promo code");

    const now = new Date();
    // Use string comparison if dates are strings, or date comparison if they are dates.
    // Drizzle with MySQL date type returns string or Date depending on config, but Date constructor handles both.
    if (now < new Date(promoCode.startDate) || now > new Date(promoCode.endDate)) {
        throw new BadRequest("Promo code is expired or not yet active");
    }

    // Check usage limits
    const [usageCount] = await db
        .select({ value: count() })
        .from(promoCodesUsers)
        .where(
            and(
                eq(promoCodesUsers.promoCodeId, promoCode.id),
                eq(promoCodesUsers.userId, studentId)
            )
        );

    if (usageCount.value >= promoCode.numberOfUsages) {
        throw new BadRequest(`Promo code usage limit exceeded. You can only use it ${promoCode.numberOfUsages} times.`);
    }

    // Check restricted access
    if (promoCode.type === "restricted") {
        const [allowed] = await db
            .select()
            .from(promoCodesAllowedStudents)
            .where(
                and(
                    eq(promoCodesAllowedStudents.promoCodeId, promoCode.id),
                    eq(promoCodesAllowedStudents.studentId, studentId)
                )
            );
        
        if (!allowed) {
            throw new BadRequest("This promo code is restricted and not available for your account.");
        }
    }

    // Check applicability
    const [
        packagesLinks,
        coursesLinks,
        chaptersLinks,
        lessonsLinks
    ] = await Promise.all([
        db.select().from(promoCodesPackages).where(eq(promoCodesPackages.promoCodeId, promoCode.id)),
        db.select().from(promoCodesCourses).where(eq(promoCodesCourses.promoCodeId, promoCode.id)),
        db.select().from(promoCodesChapters).where(eq(promoCodesChapters.promoCodeId, promoCode.id)),
        db.select().from(promoCodesLessons).where(eq(promoCodesLessons.promoCodeId, promoCode.id))
    ]);

    const hasLinks = packagesLinks.length > 0 || coursesLinks.length > 0 || chaptersLinks.length > 0 || lessonsLinks.length > 0;

    if (hasLinks) {
        let isApplicable = false;

        if (itemsToPurchase.packageId && packagesLinks.some(p => p.packageId === itemsToPurchase.packageId)) {
            isApplicable = true;
        }

        if (itemsToPurchase.courseIds) {
            if (itemsToPurchase.courseIds.some(id => coursesLinks.some(c => c.courseId === id))) isApplicable = true;
        }

        if (itemsToPurchase.chapterIds) {
            if (itemsToPurchase.chapterIds.some(id => chaptersLinks.some(c => c.chapterId === id))) isApplicable = true;
        }

        if (itemsToPurchase.lessonIds) {
            if (itemsToPurchase.lessonIds.some(id => lessonsLinks.some(l => l.lessonId === id))) isApplicable = true;
        }

        if (!isApplicable) {
            throw new BadRequest("This promo code does not apply to the selected items.");
        }
    }

    return promoCode;
};
