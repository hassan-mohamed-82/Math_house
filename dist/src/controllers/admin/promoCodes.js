"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currencySelection = exports.deletePromoCode = exports.updatePromoCode = exports.getPromocodesbyId = exports.getAllPromoCodes = exports.createPromoCode = void 0;
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../models/connection");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const createPromoCode = async (req, res) => {
    const { promoName, code, discountAmount, courseIds, packageIds, currencyIds, startDate, endDate, numberOfUsages } = req.body;
    if (!promoName || !code || !discountAmount || !courseIds || courseIds.length === 0 || !packageIds || packageIds.length === 0 || !currencyIds || currencyIds.length === 0 || !startDate || !endDate || !numberOfUsages) {
        throw new BadRequest_1.BadRequest("All fields are required and courseIds/packageIds/currencyIds must not be empty");
    }
    if (startDate > endDate) {
        throw new BadRequest_1.BadRequest("Start date should be less than end date");
    }
    if (discountAmount < 0) {
        throw new BadRequest_1.BadRequest("Discount amount should be greater than 0");
    }
    if (numberOfUsages < 0) {
        throw new BadRequest_1.BadRequest("Number of usages should be greater than 0");
    }
    const [coursesList, packagesList, currenciesList, existingPromoCode] = await Promise.all([
        connection_1.db.select().from(schema_1.courses),
        connection_1.db.select().from(schema_1.packages),
        connection_1.db.select().from(schema_1.Currency),
        connection_1.db.select().from(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.code, code)).limit(1)
    ]);
    const validCourseIds = new Set(coursesList.map(c => c.id));
    for (const cId of courseIds) {
        if (!validCourseIds.has(cId)) {
            throw new NotFound_1.NotFound(`Course not found: ${cId}`);
        }
    }
    const validPackageIds = new Set(packagesList.map(p => p.id));
    for (const pId of packageIds) {
        if (!validPackageIds.has(pId)) {
            throw new NotFound_1.NotFound(`Package not found: ${pId}`);
        }
    }
    const validCurrencyIds = new Set(currenciesList.map(c => c.id));
    for (const cId of currencyIds) {
        if (!validCurrencyIds.has(cId)) {
            throw new NotFound_1.NotFound(`Currency not found: ${cId}`);
        }
    }
    if (existingPromoCode && existingPromoCode.length > 0) {
        throw new BadRequest_1.BadRequest("Promo code already exists");
    }
    // Need uuid generated id to link relational tables
    const promoCodeId = crypto.randomUUID();
    await connection_1.db.insert(schema_1.promoCodes).values({
        id: promoCodeId,
        promoName,
        code,
        discountAmount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        numberOfUsages,
    });
    const coursesToInsert = courseIds.map((cId) => ({
        promoCodeId,
        courseId: cId
    }));
    await connection_1.db.insert(schema_1.promoCodesCourses).values(coursesToInsert);
    const packagesToInsert = packageIds.map((pId) => ({
        promoCodeId,
        packageId: pId
    }));
    await connection_1.db.insert(schema_1.promoCodesPackages).values(packagesToInsert);
    const currenciesToInsert = currencyIds.map((cId) => ({
        promoCodeId,
        currencyId: cId
    }));
    await connection_1.db.insert(schema_1.promoCodesCurrency).values(currenciesToInsert);
    return (0, response_1.SuccessResponse)(res, { message: "Promo code created successfully" }, 201);
};
exports.createPromoCode = createPromoCode;
const getAllPromoCodes = async (req, res) => {
    const promoCodesData = await connection_1.db.select({
        id: schema_1.promoCodes.id,
        promoName: schema_1.promoCodes.promoName,
        code: schema_1.promoCodes.code,
        discountAmount: schema_1.promoCodes.discountAmount,
        startDate: schema_1.promoCodes.startDate,
        endDate: schema_1.promoCodes.endDate,
        numberOfUsagesAllowed: schema_1.promoCodes.numberOfUsages,
        numberOfUsers: (0, drizzle_orm_1.count)(schema_1.promoCodesUsers.userId),
    }).from(schema_1.promoCodes)
        .leftJoin(schema_1.promoCodesUsers, (0, drizzle_orm_1.eq)(schema_1.promoCodes.id, schema_1.promoCodesUsers.promoCodeId))
        .groupBy(schema_1.promoCodes.id);
    const pcCourses = await connection_1.db.select({
        promoCodeId: schema_1.promoCodesCourses.promoCodeId,
        courseId: schema_1.courses.id,
        courseName: schema_1.courses.name
    }).from(schema_1.promoCodesCourses).innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.promoCodesCourses.courseId, schema_1.courses.id));
    const pcPackages = await connection_1.db.select({
        promoCodeId: schema_1.promoCodesPackages.promoCodeId,
        packageId: schema_1.packages.id,
        packageName: schema_1.packages.name
    }).from(schema_1.promoCodesPackages).innerJoin(schema_1.packages, (0, drizzle_orm_1.eq)(schema_1.promoCodesPackages.packageId, schema_1.packages.id));
    const pcCurrencies = await connection_1.db.select({
        promoCodeId: schema_1.promoCodesCurrency.promoCodeId,
        currencyId: schema_1.Currency.id,
        currencyName: schema_1.Currency.name,
        currencyCode: schema_1.Currency.code
    }).from(schema_1.promoCodesCurrency).innerJoin(schema_1.Currency, (0, drizzle_orm_1.eq)(schema_1.promoCodesCurrency.currencyId, schema_1.Currency.id));
    const formattedData = promoCodesData.map(pc => ({
        ...pc,
        courses: pcCourses.filter(c => c.promoCodeId === pc.id).map(c => ({ id: c.courseId, courseName: c.courseName })),
        packages: pcPackages.filter(p => p.promoCodeId === pc.id).map(p => ({ id: p.packageId, packageName: p.packageName })),
        currencies: pcCurrencies.filter(c => c.promoCodeId === pc.id).map(c => ({ id: c.currencyId, name: c.currencyName, code: c.currencyCode }))
    }));
    return (0, response_1.SuccessResponse)(res, { message: "Promo codes fetched successfully", data: formattedData }, 200);
};
exports.getAllPromoCodes = getAllPromoCodes;
const getPromocodesbyId = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Invalid promo code id");
    }
    const promoCodeRecords = await connection_1.db.select({
        id: schema_1.promoCodes.id,
        promoName: schema_1.promoCodes.promoName,
        code: schema_1.promoCodes.code,
        discountAmount: schema_1.promoCodes.discountAmount,
        startDate: schema_1.promoCodes.startDate,
        endDate: schema_1.promoCodes.endDate,
        numberOfUsagesAllowed: schema_1.promoCodes.numberOfUsages,
        numberOfUsers: (0, drizzle_orm_1.count)(schema_1.promoCodesUsers.userId),
    }).from(schema_1.promoCodes)
        .leftJoin(schema_1.promoCodesUsers, (0, drizzle_orm_1.eq)(schema_1.promoCodes.id, schema_1.promoCodesUsers.promoCodeId))
        .where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, id))
        .groupBy(schema_1.promoCodes.id).limit(1);
    if (!promoCodeRecords || promoCodeRecords.length === 0) {
        throw new NotFound_1.NotFound("Promo code not found");
    }
    const pcCourses = await connection_1.db.select({
        courseId: schema_1.courses.id,
        courseName: schema_1.courses.name
    }).from(schema_1.promoCodesCourses).innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.promoCodesCourses.courseId, schema_1.courses.id))
        .where((0, drizzle_orm_1.eq)(schema_1.promoCodesCourses.promoCodeId, id));
    const pcPackages = await connection_1.db.select({
        packageId: schema_1.packages.id,
        packageName: schema_1.packages.name
    }).from(schema_1.promoCodesPackages).innerJoin(schema_1.packages, (0, drizzle_orm_1.eq)(schema_1.promoCodesPackages.packageId, schema_1.packages.id))
        .where((0, drizzle_orm_1.eq)(schema_1.promoCodesPackages.promoCodeId, id));
    const pcCurrencies = await connection_1.db.select({
        currencyId: schema_1.Currency.id,
        currencyName: schema_1.Currency.name,
        currencyCode: schema_1.Currency.code
    }).from(schema_1.promoCodesCurrency).innerJoin(schema_1.Currency, (0, drizzle_orm_1.eq)(schema_1.promoCodesCurrency.currencyId, schema_1.Currency.id))
        .where((0, drizzle_orm_1.eq)(schema_1.promoCodesCurrency.promoCodeId, id));
    const promoCode = {
        ...promoCodeRecords[0],
        courses: pcCourses.map(c => ({ id: c.courseId, courseName: c.courseName })),
        packages: pcPackages.map(p => ({ id: p.packageId, packageName: p.packageName })),
        currencies: pcCurrencies.map(c => ({ id: c.currencyId, name: c.currencyName, code: c.currencyCode }))
    };
    return (0, response_1.SuccessResponse)(res, { message: "Promo code fetched successfully", data: promoCode }, 200);
};
exports.getPromocodesbyId = getPromocodesbyId;
const updatePromoCode = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Invalid promo code id");
    }
    const { promoName, code, discountAmount, courseIds, packageIds, currencyIds, startDate, endDate, numberOfUsages } = req.body;
    const promoCodeRecords = await connection_1.db.select().from(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, id)).limit(1);
    if (!promoCodeRecords || promoCodeRecords.length === 0) {
        throw new NotFound_1.NotFound("Promo code not found");
    }
    const promoCode = promoCodeRecords[0];
    if (code && code !== promoCode.code) {
        const existingPromoCode = await connection_1.db.select().from(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.code, code)).limit(1);
        if (existingPromoCode && existingPromoCode.length > 0) {
            throw new BadRequest_1.BadRequest("Promo code already exists");
        }
    }
    if (courseIds && courseIds.length > 0) {
        const coursesList = await connection_1.db.select().from(schema_1.courses);
        const validCourseIds = new Set(coursesList.map(c => c.id));
        for (const cId of courseIds) {
            if (!validCourseIds.has(cId)) {
                throw new NotFound_1.NotFound(`Course not found: ${cId}`);
            }
        }
    }
    if (packageIds && packageIds.length > 0) {
        const packagesList = await connection_1.db.select().from(schema_1.packages);
        const validPackageIds = new Set(packagesList.map(p => p.id));
        for (const pId of packageIds) {
            if (!validPackageIds.has(pId)) {
                throw new NotFound_1.NotFound(`Package not found: ${pId}`);
            }
        }
    }
    if (currencyIds && currencyIds.length > 0) {
        const currenciesList = await connection_1.db.select().from(schema_1.Currency);
        const validCurrencyIds = new Set(currenciesList.map(c => c.id));
        for (const cId of currencyIds) {
            if (!validCurrencyIds.has(cId)) {
                throw new NotFound_1.NotFound(`Currency not found: ${cId}`);
            }
        }
    }
    const newStartDate = startDate || promoCode.startDate;
    const newEndDate = endDate || promoCode.endDate;
    if (newStartDate > newEndDate) {
        throw new BadRequest_1.BadRequest("Start date should be less than end date");
    }
    if (discountAmount !== undefined && discountAmount < 0) {
        throw new BadRequest_1.BadRequest("Discount amount should be greater than 0");
    }
    if (numberOfUsages !== undefined && numberOfUsages < 0) {
        throw new BadRequest_1.BadRequest("Number of usages should be greater than 0");
    }
    await connection_1.db.update(schema_1.promoCodes).set({
        promoName: promoName || promoCode.promoName,
        code: code || promoCode.code,
        discountAmount: discountAmount ?? promoCode.discountAmount,
        startDate: newStartDate,
        endDate: newEndDate,
        numberOfUsages: numberOfUsages ?? promoCode.numberOfUsages,
    }).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, id));
    if (courseIds && courseIds.length > 0) {
        await connection_1.db.delete(schema_1.promoCodesCourses).where((0, drizzle_orm_1.eq)(schema_1.promoCodesCourses.promoCodeId, id));
        const coursesToInsert = courseIds.map((cId) => ({
            promoCodeId: id,
            courseId: cId
        }));
        await connection_1.db.insert(schema_1.promoCodesCourses).values(coursesToInsert);
    }
    if (packageIds && packageIds.length > 0) {
        await connection_1.db.delete(schema_1.promoCodesPackages).where((0, drizzle_orm_1.eq)(schema_1.promoCodesPackages.promoCodeId, id));
        const packagesToInsert = packageIds.map((pId) => ({
            promoCodeId: id,
            packageId: pId
        }));
        await connection_1.db.insert(schema_1.promoCodesPackages).values(packagesToInsert);
    }
    if (currencyIds && currencyIds.length > 0) {
        await connection_1.db.delete(schema_1.promoCodesCurrency).where((0, drizzle_orm_1.eq)(schema_1.promoCodesCurrency.promoCodeId, id));
        const currenciesToInsert = currencyIds.map((cId) => ({
            promoCodeId: id,
            currencyId: cId
        }));
        await connection_1.db.insert(schema_1.promoCodesCurrency).values(currenciesToInsert);
    }
    return (0, response_1.SuccessResponse)(res, { message: "Promo code updated successfully" }, 200);
};
exports.updatePromoCode = updatePromoCode;
const deletePromoCode = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Invalid promo code id");
    }
    const promoCode = await connection_1.db.select().from(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, id)).limit(1);
    if (!promoCode || promoCode.length === 0) {
        throw new NotFound_1.NotFound("Promo code not found");
    }
    // Ensure dependent records are deleted before removing the promo code
    await connection_1.db.delete(schema_1.promoCodesUsers).where((0, drizzle_orm_1.eq)(schema_1.promoCodesUsers.promoCodeId, id));
    await connection_1.db.delete(schema_1.promoCodesCourses).where((0, drizzle_orm_1.eq)(schema_1.promoCodesCourses.promoCodeId, id));
    await connection_1.db.delete(schema_1.promoCodesPackages).where((0, drizzle_orm_1.eq)(schema_1.promoCodesPackages.promoCodeId, id));
    await connection_1.db.delete(schema_1.promoCodesCurrency).where((0, drizzle_orm_1.eq)(schema_1.promoCodesCurrency.promoCodeId, id));
    await connection_1.db.delete(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Promo code deleted successfully" }, 200);
};
exports.deletePromoCode = deletePromoCode;
const currencySelection = async (req, res) => {
    const currencies = await connection_1.db.select({
        id: schema_1.Currency.id,
        name: schema_1.Currency.name,
        code: schema_1.Currency.code
    }).from(schema_1.Currency);
    return (0, response_1.SuccessResponse)(res, { message: "Currencies fetched successfully", data: currencies }, 200);
};
exports.currencySelection = currencySelection;
