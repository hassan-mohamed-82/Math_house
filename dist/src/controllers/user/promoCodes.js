"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPromoCode = exports.getAvailablePromoCodes = void 0;
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const promoCodeValidation_1 = require("../../utils/promoCodeValidation");
const getAvailablePromoCodes = async (req, res) => {
    const studentId = req.user.id;
    const now = new Date();
    const availableCodes = await connection_1.db.select({
        id: schema_1.promoCodes.id,
        promoName: schema_1.promoCodes.promoName,
        code: schema_1.promoCodes.code,
        discountAmount: schema_1.promoCodes.discountAmount, // This acts as percentage
        type: schema_1.promoCodes.type,
        startDate: schema_1.promoCodes.startDate,
        endDate: schema_1.promoCodes.endDate
    })
        .from(schema_1.promoCodes)
        .leftJoin(schema_1.promoCodesAllowedStudents, (0, drizzle_orm_1.eq)(schema_1.promoCodes.id, schema_1.promoCodesAllowedStudents.promoCodeId))
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.promoCodes.type, "generic"), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.promoCodes.type, "restricted"), (0, drizzle_orm_1.eq)(schema_1.promoCodesAllowedStudents.studentId, studentId))));
    const activeCodes = availableCodes.filter(c => {
        const start = new Date(c.startDate);
        const end = new Date(c.endDate);
        // Set end time to end of day just in case
        end.setHours(23, 59, 59, 999);
        return now >= start && now <= end;
    });
    // Remove potential duplicates
    const uniqueCodes = Array.from(new Map(activeCodes.map(item => [item.id, item])).values());
    return (0, response_1.SuccessResponse)(res, { message: "Available promo codes retrieved successfully", promoCodes: uniqueCodes });
};
exports.getAvailablePromoCodes = getAvailablePromoCodes;
const checkPromoCode = async (req, res) => {
    const studentId = req.user.id;
    const { code, packageId, courseIds, chapterIds, lessonIds } = req.body;
    if (!code) {
        return res.status(400).json({ error: "Promo code is required" });
    }
    const promoCode = await (0, promoCodeValidation_1.validatePromoCode)(code, studentId, { packageId, courseIds, chapterIds, lessonIds });
    return (0, response_1.SuccessResponse)(res, {
        message: "Promo code is valid",
        promoCode: {
            code: promoCode.code,
            discountPercentage: promoCode.discountAmount
        }
    });
};
exports.checkPromoCode = checkPromoCode;
