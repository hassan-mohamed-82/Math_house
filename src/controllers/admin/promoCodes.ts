import { Request, Response } from "express";
import { promoCodes, promoCodesCourses, promoCodesPackages } from "../../models/schema";
import { count, eq } from "drizzle-orm";
import { db } from "../../models/connection";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { SuccessResponse } from "../../utils/response";
import { courses } from "../../models/schema";
import { packages } from "../../models/schema";
import { promoCodesUsers } from "../../models/schema";

export const createPromoCode = async (req: Request, res: Response) => {
    const { promoName,
        code,
        discountAmount,
        courseIds,
        packageIds,
        startDate,
        endDate,
        numberOfUsages } = req.body;

    if (!promoName || !code || !discountAmount || !courseIds || courseIds.length === 0 || !packageIds || packageIds.length === 0 || !startDate || !endDate || !numberOfUsages) {
        throw new BadRequest("All fields are required and courseIds/packageIds must not be empty");
    }

    if (startDate > endDate) {
        throw new BadRequest("Start date should be less than end date");
    }

    if (discountAmount < 0) {
        throw new BadRequest("Discount amount should be greater than 0");
    }

    if (numberOfUsages < 0) {
        throw new BadRequest("Number of usages should be greater than 0");
    }

    const [coursesList, packagesList, existingPromoCode] = await Promise.all([
        db.select().from(courses),
        db.select().from(packages),
        db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1)
    ]);

    const validCourseIds = new Set(coursesList.map(c => c.id));
    for (const cId of courseIds) {
        if (!validCourseIds.has(cId)) {
            throw new NotFound(`Course not found: ${cId}`);
        }
    }

    const validPackageIds = new Set(packagesList.map(p => p.id));
    for (const pId of packageIds) {
        if (!validPackageIds.has(pId)) {
            throw new NotFound(`Package not found: ${pId}`);
        }
    }

    if (existingPromoCode && existingPromoCode.length > 0) {
        throw new BadRequest("Promo code already exists");
    }


    // Need uuid generated id to link relational tables
    const promoCodeId = crypto.randomUUID();

    await db.insert(promoCodes).values({
        id: promoCodeId,
        promoName,
        code,
        discountAmount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        numberOfUsages,
    });

    const coursesToInsert = courseIds.map((cId: string) => ({
        promoCodeId,
        courseId: cId
    }));
    await db.insert(promoCodesCourses).values(coursesToInsert);

    const packagesToInsert = packageIds.map((pId: string) => ({
        promoCodeId,
        packageId: pId
    }));
    await db.insert(promoCodesPackages).values(packagesToInsert);

    return SuccessResponse(res, { message: "Promo code created successfully" }, 201);

};

export const getAllPromoCodes = async (req: Request, res: Response) => {
    const promoCodesData = await db.select({
        id: promoCodes.id,
        promoName: promoCodes.promoName,
        code: promoCodes.code,
        discountAmount: promoCodes.discountAmount,
        startDate: promoCodes.startDate,
        endDate: promoCodes.endDate,
        numberOfUsagesAllowed: promoCodes.numberOfUsages,
        numberOfUsers: count(promoCodesUsers.userId),
    }).from(promoCodes)
        .leftJoin(promoCodesUsers, eq(promoCodes.id, promoCodesUsers.promoCodeId))
        .groupBy(promoCodes.id);

    const pcCourses = await db.select({
        promoCodeId: promoCodesCourses.promoCodeId,
        courseId: courses.id,
        courseName: courses.name
    }).from(promoCodesCourses).innerJoin(courses, eq(promoCodesCourses.courseId, courses.id));

    const pcPackages = await db.select({
        promoCodeId: promoCodesPackages.promoCodeId,
        packageId: packages.id,
        packageName: packages.name
    }).from(promoCodesPackages).innerJoin(packages, eq(promoCodesPackages.packageId, packages.id));

    const formattedData = promoCodesData.map(pc => ({
        ...pc,
        courses: pcCourses.filter(c => c.promoCodeId === pc.id).map(c => ({ id: c.courseId, courseName: c.courseName })),
        packages: pcPackages.filter(p => p.promoCodeId === pc.id).map(p => ({ id: p.packageId, packageName: p.packageName }))
    }));

    return SuccessResponse(res, { message: "Promo codes fetched successfully", data: formattedData }, 200);
};

export const getPromocodesbyId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Invalid promo code id");
    }
    const promoCodeRecords = await db.select({
        id: promoCodes.id,
        promoName: promoCodes.promoName,
        code: promoCodes.code,
        discountAmount: promoCodes.discountAmount,
        startDate: promoCodes.startDate,
        endDate: promoCodes.endDate,
        numberOfUsagesAllowed: promoCodes.numberOfUsages,
        numberOfUsers: count(promoCodesUsers.userId),
    }).from(promoCodes)
        .leftJoin(promoCodesUsers, eq(promoCodes.id, promoCodesUsers.promoCodeId))
        .where(eq(promoCodes.id, id))
        .groupBy(promoCodes.id).limit(1);

    if (!promoCodeRecords || promoCodeRecords.length === 0) {
        throw new NotFound("Promo code not found");
    }

    const pcCourses = await db.select({
        courseId: courses.id,
        courseName: courses.name
    }).from(promoCodesCourses).innerJoin(courses, eq(promoCodesCourses.courseId, courses.id))
        .where(eq(promoCodesCourses.promoCodeId, id));

    const pcPackages = await db.select({
        packageId: packages.id,
        packageName: packages.name
    }).from(promoCodesPackages).innerJoin(packages, eq(promoCodesPackages.packageId, packages.id))
        .where(eq(promoCodesPackages.promoCodeId, id));

    const promoCode = {
        ...promoCodeRecords[0],
        courses: pcCourses.map(c => ({ id: c.courseId, courseName: c.courseName })),
        packages: pcPackages.map(p => ({ id: p.packageId, packageName: p.packageName }))
    };

    return SuccessResponse(res, { message: "Promo code fetched successfully", data: promoCode }, 200);
};

export const updatePromoCode = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Invalid promo code id");
    }

    const { promoName, code, discountAmount, courseIds, packageIds, startDate, endDate, numberOfUsages } = req.body;

    const promoCodeRecords = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
    if (!promoCodeRecords || promoCodeRecords.length === 0) {
        throw new NotFound("Promo code not found");
    }
    const promoCode = promoCodeRecords[0];

    if (code && code !== promoCode.code) {
        const existingPromoCode = await db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
        if (existingPromoCode && existingPromoCode.length > 0) {
            throw new BadRequest("Promo code already exists");
        }
    }

    if (courseIds && courseIds.length > 0) {
        const coursesList = await db.select().from(courses);
        const validCourseIds = new Set(coursesList.map(c => c.id));
        for (const cId of courseIds) {
            if (!validCourseIds.has(cId)) {
                throw new NotFound(`Course not found: ${cId}`);
            }
        }
    }

    if (packageIds && packageIds.length > 0) {
        const packagesList = await db.select().from(packages);
        const validPackageIds = new Set(packagesList.map(p => p.id));
        for (const pId of packageIds) {
            if (!validPackageIds.has(pId)) {
                throw new NotFound(`Package not found: ${pId}`);
            }
        }
    }

    const newStartDate = startDate || promoCode.startDate;
    const newEndDate = endDate || promoCode.endDate;

    if (newStartDate > newEndDate) {
        throw new BadRequest("Start date should be less than end date");
    }

    if (discountAmount !== undefined && discountAmount < 0) {
        throw new BadRequest("Discount amount should be greater than 0");
    }

    if (numberOfUsages !== undefined && numberOfUsages < 0) {
        throw new BadRequest("Number of usages should be greater than 0");
    }

    await db.update(promoCodes).set({
        promoName: promoName || promoCode.promoName,
        code: code || promoCode.code,
        discountAmount: discountAmount ?? promoCode.discountAmount,
        startDate: newStartDate,
        endDate: newEndDate,
        numberOfUsages: numberOfUsages ?? promoCode.numberOfUsages,
    }).where(eq(promoCodes.id, id));

    if (courseIds && courseIds.length > 0) {
        await db.delete(promoCodesCourses).where(eq(promoCodesCourses.promoCodeId, id));
        const coursesToInsert = courseIds.map((cId: string) => ({
            promoCodeId: id,
            courseId: cId
        }));
        await db.insert(promoCodesCourses).values(coursesToInsert);
    }

    if (packageIds && packageIds.length > 0) {
        await db.delete(promoCodesPackages).where(eq(promoCodesPackages.promoCodeId, id));
        const packagesToInsert = packageIds.map((pId: string) => ({
            promoCodeId: id,
            packageId: pId
        }));
        await db.insert(promoCodesPackages).values(packagesToInsert);
    }

    return SuccessResponse(res, { message: "Promo code updated successfully" }, 200);
};

export const deletePromoCode = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Invalid promo code id");
    }
    const promoCode = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
    if (!promoCode || promoCode.length === 0) {
        throw new NotFound("Promo code not found");
    }

    // Ensure dependent records are deleted before removing the promo code
    await db.delete(promoCodesUsers).where(eq(promoCodesUsers.promoCodeId, id));
    await db.delete(promoCodesCourses).where(eq(promoCodesCourses.promoCodeId, id));
    await db.delete(promoCodesPackages).where(eq(promoCodesPackages.promoCodeId, id));
    await db.delete(promoCodes).where(eq(promoCodes.id, id));

    return SuccessResponse(res, { message: "Promo code deleted successfully" }, 200);
};
