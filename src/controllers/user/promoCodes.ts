import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { db } from "../../models/connection";
import { promoCodes, promoCodesAllowedStudents } from "../../models/schema";
import { eq, and, or } from "drizzle-orm";
import { validatePromoCode } from "../../utils/promoCodeValidation";

export const getAvailablePromoCodes = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const now = new Date();

    const availableCodes = await db.select({
        id: promoCodes.id,
        promoName: promoCodes.promoName,
        code: promoCodes.code,
        discountAmount: promoCodes.discountAmount, // This acts as percentage
        type: promoCodes.type,
        startDate: promoCodes.startDate,
        endDate: promoCodes.endDate
    })
    .from(promoCodes)
    .leftJoin(promoCodesAllowedStudents, eq(promoCodes.id, promoCodesAllowedStudents.promoCodeId))
    .where(
        or(
            eq(promoCodes.type, "generic"),
            and(
                eq(promoCodes.type, "restricted"),
                eq(promoCodesAllowedStudents.studentId, studentId)
            )
        )
    );

    const activeCodes = availableCodes.filter(c => {
        const start = new Date(c.startDate);
        const end = new Date(c.endDate);
        // Set end time to end of day just in case
        end.setHours(23, 59, 59, 999);
        return now >= start && now <= end;
    });

    // Remove potential duplicates
    const uniqueCodes = Array.from(new Map(activeCodes.map(item => [item.id, item])).values());

    return SuccessResponse(res, { message: "Available promo codes retrieved successfully", promoCodes: uniqueCodes });
};

export const checkPromoCode = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const { code, packageId, courseIds, chapterIds, lessonIds } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Promo code is required" });
    }

    const promoCode = await validatePromoCode(code, studentId, { packageId, courseIds, chapterIds, lessonIds });

    return SuccessResponse(res, { 
        message: "Promo code is valid", 
        promoCode: {
            code: promoCode.code,
            discountPercentage: promoCode.discountAmount 
        } 
    });
};
