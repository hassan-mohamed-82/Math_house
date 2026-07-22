"use strict";
// import { Request, Response } from "express";
// import { promoCodes, promoCodesCourses, promoCodesPackages, courses, packages, promoCodesUsers, promoCodesCurrency, Currency, promoCodesAllowedStudents, Student } from "../../models/schema";
// import { count,inArray, eq } from "drizzle-orm";
// import { db } from "../../models/connection";
// import { BadRequest } from "../../Errors/BadRequest";
// import { NotFound } from "../../Errors/NotFound";
// import { SuccessResponse } from "../../utils/response";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currencySelection = exports.deletePromoCode = exports.updatePromoCode = exports.getPromoCodebyId = exports.getAllPromoCodes = exports.createPromoCode = void 0;
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../models/connection");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const createPromoCode = async (req, res) => {
    const { promoName, code, discountAmount, courseIds, packageIds, currencyIds, chapterIds, lessonIds, startDate, endDate, numberOfUsages, type, studentIds } = req.body;
    if (!promoName || !code || !discountAmount || !type || !startDate || !endDate || !numberOfUsages) {
        throw new BadRequest_1.BadRequest("promoName, code, discountAmount, type, startDate, endDate and numberOfUsages are required");
    }
    if (courseIds && !Array.isArray(courseIds)) {
        throw new BadRequest_1.BadRequest("courseIds must be an array");
    }
    if (packageIds && !Array.isArray(packageIds)) {
        throw new BadRequest_1.BadRequest("packageIds must be an array");
    }
    if (currencyIds && !Array.isArray(currencyIds)) {
        throw new BadRequest_1.BadRequest("currencyIds must be an array");
    }
    if (chapterIds && !Array.isArray(chapterIds)) {
        throw new BadRequest_1.BadRequest("chapterIds must be an array");
    }
    if (lessonIds && !Array.isArray(lessonIds)) {
        throw new BadRequest_1.BadRequest("lessonIds must be an array");
    }
    if (type !== "generic" && type !== "restricted") {
        throw new BadRequest_1.BadRequest("Invalid promocode type, Must be either 'generic' or 'restricted'");
    }
    if (type === "restricted" && (!studentIds || studentIds.length === 0)) {
        throw new BadRequest_1.BadRequest("studentIds must be provided and non-empty for a restricted promo code");
    }
    if (type === "generic" && studentIds && studentIds.length > 0) {
        throw new BadRequest_1.BadRequest("studentIds should not be provided for a generic promo code");
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
    const [coursesList, packagesList, currenciesList, chaptersList, lessonsList, studentsList, existingPromoCode] = await Promise.all([
        (courseIds && courseIds.length > 0)
            ? connection_1.db.select({ id: schema_1.courses.id }).from(schema_1.courses).where((0, drizzle_orm_1.inArray)(schema_1.courses.id, courseIds))
            : Promise.resolve([]),
        (packageIds && packageIds.length > 0)
            ? connection_1.db.select({ id: schema_1.packages.id }).from(schema_1.packages).where((0, drizzle_orm_1.inArray)(schema_1.packages.id, packageIds))
            : Promise.resolve([]),
        (currencyIds && currencyIds.length > 0)
            ? connection_1.db.select({ id: schema_1.Currency.id }).from(schema_1.Currency).where((0, drizzle_orm_1.inArray)(schema_1.Currency.id, currencyIds))
            : Promise.resolve([]),
        (chapterIds && chapterIds.length > 0)
            ? connection_1.db.select({ id: schema_1.chapters.id }).from(schema_1.chapters).where((0, drizzle_orm_1.inArray)(schema_1.chapters.id, chapterIds))
            : Promise.resolve([]),
        (lessonIds && lessonIds.length > 0)
            ? connection_1.db.select({ id: schema_1.lessons.id }).from(schema_1.lessons).where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds))
            : Promise.resolve([]),
        type === "restricted"
            ? connection_1.db.select({ id: schema_1.Student.id }).from(schema_1.Student).where((0, drizzle_orm_1.inArray)(schema_1.Student.id, studentIds))
            : Promise.resolve([]),
        connection_1.db.select().from(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.code, code)).limit(1)
    ]);
    if (existingPromoCode && existingPromoCode.length > 0) {
        throw new BadRequest_1.BadRequest("Promo code already exists");
    }
    if (courseIds && courseIds.length > 0) {
        const validCourseIds = new Set(coursesList.map(c => c.id));
        for (const cId of courseIds) {
            if (!validCourseIds.has(cId)) {
                throw new NotFound_1.NotFound(`Course not found: ${cId}`);
            }
        }
    }
    if (packageIds && packageIds.length > 0) {
        const validPackageIds = new Set(packagesList.map(p => p.id));
        for (const pId of packageIds) {
            if (!validPackageIds.has(pId)) {
                throw new NotFound_1.NotFound(`Package not found: ${pId}`);
            }
        }
    }
    if (currencyIds && currencyIds.length > 0) {
        const validCurrencyIds = new Set(currenciesList.map(c => c.id));
        for (const cId of currencyIds) {
            if (!validCurrencyIds.has(cId)) {
                throw new NotFound_1.NotFound(`Currency not found: ${cId}`);
            }
        }
    }
    if (chapterIds && chapterIds.length > 0) {
        const validChapterIds = new Set(chaptersList.map(c => c.id));
        for (const chId of chapterIds) {
            if (!validChapterIds.has(chId)) {
                throw new NotFound_1.NotFound(`Chapter not found: ${chId}`);
            }
        }
    }
    if (lessonIds && lessonIds.length > 0) {
        const validLessonIds = new Set(lessonsList.map(l => l.id));
        for (const lId of lessonIds) {
            if (!validLessonIds.has(lId)) {
                throw new NotFound_1.NotFound(`Lesson not found: ${lId}`);
            }
        }
    }
    if (type === "restricted") {
        const validStudentIds = new Set(studentsList.map(s => s.id));
        for (const sId of studentIds) {
            if (!validStudentIds.has(sId)) {
                throw new NotFound_1.NotFound(`Student not found: ${sId}`);
            }
        }
    }
    const promoCodeId = crypto.randomUUID();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.promoCodes).values({
            id: promoCodeId,
            promoName,
            code,
            discountAmount,
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            numberOfUsages,
        });
        if (courseIds && courseIds.length > 0) {
            const coursesToInsert = courseIds.map((cId) => ({
                promoCodeId,
                courseId: cId
            }));
            await tx.insert(schema_1.promoCodesCourses).values(coursesToInsert);
        }
        if (packageIds && packageIds.length > 0) {
            const packagesToInsert = packageIds.map((pId) => ({
                promoCodeId,
                packageId: pId
            }));
            await tx.insert(schema_1.promoCodesPackages).values(packagesToInsert);
        }
        if (currencyIds && currencyIds.length > 0) {
            const currenciesToInsert = currencyIds.map((cId) => ({
                promoCodeId,
                currencyId: cId
            }));
            await tx.insert(schema_1.promoCodesCurrency).values(currenciesToInsert);
        }
        if (chapterIds && chapterIds.length > 0) {
            const chaptersToInsert = chapterIds.map((chId) => ({
                promoCodeId,
                chapterId: chId
            }));
            await tx.insert(schema_1.promoCodesChapters).values(chaptersToInsert);
        }
        if (lessonIds && lessonIds.length > 0) {
            const lessonsToInsert = lessonIds.map((lId) => ({
                promoCodeId,
                lessonId: lId
            }));
            await tx.insert(schema_1.promoCodesLessons).values(lessonsToInsert);
        }
        if (type === "restricted") {
            const studentsToInsert = studentIds.map((sId) => ({
                promoCodeId,
                studentId: sId
            }));
            await tx.insert(schema_1.promoCodesAllowedStudents).values(studentsToInsert);
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Promo code created successfully", promoCodeId }, 201);
};
exports.createPromoCode = createPromoCode;
const getAllPromoCodes = async (req, res) => {
    const promoCodesData = await connection_1.db.select({
        id: schema_1.promoCodes.id,
        promoName: schema_1.promoCodes.promoName,
        code: schema_1.promoCodes.code,
        discountAmount: schema_1.promoCodes.discountAmount,
        type: schema_1.promoCodes.type,
        startDate: schema_1.promoCodes.startDate,
        endDate: schema_1.promoCodes.endDate,
        numberOfUsagesAllowed: schema_1.promoCodes.numberOfUsages,
        numberOfUsers: (0, drizzle_orm_1.count)(schema_1.promoCodesUsers.userId),
    }).from(schema_1.promoCodes)
        .leftJoin(schema_1.promoCodesUsers, (0, drizzle_orm_1.eq)(schema_1.promoCodes.id, schema_1.promoCodesUsers.promoCodeId))
        .groupBy(schema_1.promoCodes.id);
    return (0, response_1.SuccessResponse)(res, { message: "Promo codes fetched successfully", data: promoCodesData }, 200);
};
exports.getAllPromoCodes = getAllPromoCodes;
const getPromoCodebyId = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Invalid promo code id");
    }
    const promoCodeRecords = await connection_1.db.select({
        id: schema_1.promoCodes.id,
        promoName: schema_1.promoCodes.promoName,
        code: schema_1.promoCodes.code,
        discountAmount: schema_1.promoCodes.discountAmount,
        type: schema_1.promoCodes.type,
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
    const [pcCourses, pcPackages, pcCurrencies, pcChapters, pcLessons] = await Promise.all([
        connection_1.db.select({
            courseId: schema_1.courses.id,
            courseName: schema_1.courses.name
        }).from(schema_1.promoCodesCourses).innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.promoCodesCourses.courseId, schema_1.courses.id))
            .where((0, drizzle_orm_1.eq)(schema_1.promoCodesCourses.promoCodeId, id)),
        connection_1.db.select({
            packageId: schema_1.packages.id,
            packageName: schema_1.packages.name
        }).from(schema_1.promoCodesPackages).innerJoin(schema_1.packages, (0, drizzle_orm_1.eq)(schema_1.promoCodesPackages.packageId, schema_1.packages.id))
            .where((0, drizzle_orm_1.eq)(schema_1.promoCodesPackages.promoCodeId, id)),
        connection_1.db.select({
            currencyId: schema_1.Currency.id,
            currencyName: schema_1.Currency.name,
            currencyCode: schema_1.Currency.code
        }).from(schema_1.promoCodesCurrency).innerJoin(schema_1.Currency, (0, drizzle_orm_1.eq)(schema_1.promoCodesCurrency.currencyId, schema_1.Currency.id))
            .where((0, drizzle_orm_1.eq)(schema_1.promoCodesCurrency.promoCodeId, id)),
        connection_1.db.select({
            chapterId: schema_1.chapters.id,
            chapterName: schema_1.chapters.name
        }).from(schema_1.promoCodesChapters).innerJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.promoCodesChapters.chapterId, schema_1.chapters.id))
            .where((0, drizzle_orm_1.eq)(schema_1.promoCodesChapters.promoCodeId, id)),
        connection_1.db.select({
            lessonId: schema_1.lessons.id,
            lessonName: schema_1.lessons.name
        }).from(schema_1.promoCodesLessons).innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.promoCodesLessons.lessonId, schema_1.lessons.id))
            .where((0, drizzle_orm_1.eq)(schema_1.promoCodesLessons.promoCodeId, id)),
    ]);
    const pcAllowedStudents = promoCodeRecords[0].type === "restricted"
        ? await connection_1.db.select({
            studentId: schema_1.Student.id,
            firstname: schema_1.Student.firstname,
            lastname: schema_1.Student.lastname,
            nickname: schema_1.Student.nickname
        }).from(schema_1.promoCodesAllowedStudents).innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.promoCodesAllowedStudents.studentId, schema_1.Student.id))
            .where((0, drizzle_orm_1.eq)(schema_1.promoCodesAllowedStudents.promoCodeId, id))
        : [];
    const promoCode = {
        ...promoCodeRecords[0],
        courses: pcCourses.map(c => ({ id: c.courseId, courseName: c.courseName })),
        packages: pcPackages.map(p => ({ id: p.packageId, packageName: p.packageName })),
        currencies: pcCurrencies.map(c => ({ id: c.currencyId, name: c.currencyName, code: c.currencyCode })),
        chapters: pcChapters.map(ch => ({ id: ch.chapterId, chapterName: ch.chapterName })),
        lessons: pcLessons.map(l => ({ id: l.lessonId, lessonName: l.lessonName })),
        allowedStudents: pcAllowedStudents.map(s => ({ id: s.studentId, firstname: s.firstname, lastname: s.lastname, nickname: s.nickname }))
    };
    return (0, response_1.SuccessResponse)(res, { message: "Promo code fetched successfully", data: promoCode }, 200);
};
exports.getPromoCodebyId = getPromoCodebyId;
const updatePromoCode = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Invalid promo code id");
    }
    const { promoName, code, discountAmount, courseIds, packageIds, currencyIds, chapterIds, lessonIds, startDate, endDate, numberOfUsages, type, studentIds } = req.body;
    const promoCodeRecords = await connection_1.db.select().from(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, id)).limit(1);
    if (!promoCodeRecords || promoCodeRecords.length === 0) {
        throw new NotFound_1.NotFound("Promo code not found");
    }
    const promoCode = promoCodeRecords[0];
    if (courseIds !== undefined && !Array.isArray(courseIds)) {
        throw new BadRequest_1.BadRequest("courseIds must be an array");
    }
    if (packageIds !== undefined && !Array.isArray(packageIds)) {
        throw new BadRequest_1.BadRequest("packageIds must be an array");
    }
    if (currencyIds !== undefined && !Array.isArray(currencyIds)) {
        throw new BadRequest_1.BadRequest("currencyIds must be an array");
    }
    if (chapterIds !== undefined && !Array.isArray(chapterIds)) {
        throw new BadRequest_1.BadRequest("chapterIds must be an array");
    }
    if (lessonIds !== undefined && !Array.isArray(lessonIds)) {
        throw new BadRequest_1.BadRequest("lessonIds must be an array");
    }
    if (type !== undefined && type !== "generic" && type !== "restricted") {
        throw new BadRequest_1.BadRequest("Invalid promocode type, Must be either 'generic' or 'restricted'");
    }
    const newType = type ?? promoCode.type;
    const isTypeChanging = type !== undefined && type !== promoCode.type;
    const isStudentsUpdateRequested = studentIds !== undefined || isTypeChanging;
    if (isStudentsUpdateRequested) {
        if (newType === "restricted" && (!studentIds || studentIds.length === 0)) {
            throw new BadRequest_1.BadRequest("studentIds must be provided and non-empty for a restricted promo code");
        }
        if (newType === "generic" && studentIds && studentIds.length > 0) {
            throw new BadRequest_1.BadRequest("studentIds should not be provided for a generic promo code");
        }
    }
    const [existingPromoCode, coursesList, packagesList, currenciesList, chaptersList, lessonsList, studentsList] = await Promise.all([
        (code && code !== promoCode.code)
            ? connection_1.db.select().from(schema_1.promoCodes).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.code, code)).limit(1)
            : Promise.resolve([]),
        (courseIds !== undefined && courseIds.length > 0)
            ? connection_1.db.select({ id: schema_1.courses.id }).from(schema_1.courses).where((0, drizzle_orm_1.inArray)(schema_1.courses.id, courseIds))
            : Promise.resolve([]),
        (packageIds !== undefined && packageIds.length > 0)
            ? connection_1.db.select({ id: schema_1.packages.id }).from(schema_1.packages).where((0, drizzle_orm_1.inArray)(schema_1.packages.id, packageIds))
            : Promise.resolve([]),
        (currencyIds !== undefined && currencyIds.length > 0)
            ? connection_1.db.select({ id: schema_1.Currency.id }).from(schema_1.Currency).where((0, drizzle_orm_1.inArray)(schema_1.Currency.id, currencyIds))
            : Promise.resolve([]),
        (chapterIds !== undefined && chapterIds.length > 0)
            ? connection_1.db.select({ id: schema_1.chapters.id }).from(schema_1.chapters).where((0, drizzle_orm_1.inArray)(schema_1.chapters.id, chapterIds))
            : Promise.resolve([]),
        (lessonIds !== undefined && lessonIds.length > 0)
            ? connection_1.db.select({ id: schema_1.lessons.id }).from(schema_1.lessons).where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds))
            : Promise.resolve([]),
        (isStudentsUpdateRequested && newType === "restricted" && studentIds && studentIds.length > 0)
            ? connection_1.db.select({ id: schema_1.Student.id }).from(schema_1.Student).where((0, drizzle_orm_1.inArray)(schema_1.Student.id, studentIds))
            : Promise.resolve([]),
    ]);
    if (existingPromoCode.length > 0) {
        throw new BadRequest_1.BadRequest("Promo code already exists");
    }
    if (courseIds !== undefined && courseIds.length > 0) {
        const validCourseIds = new Set(coursesList.map(c => c.id));
        for (const cId of courseIds) {
            if (!validCourseIds.has(cId)) {
                throw new NotFound_1.NotFound(`Course not found: ${cId}`);
            }
        }
    }
    if (packageIds !== undefined && packageIds.length > 0) {
        const validPackageIds = new Set(packagesList.map(p => p.id));
        for (const pId of packageIds) {
            if (!validPackageIds.has(pId)) {
                throw new NotFound_1.NotFound(`Package not found: ${pId}`);
            }
        }
    }
    if (currencyIds !== undefined && currencyIds.length > 0) {
        const validCurrencyIds = new Set(currenciesList.map(c => c.id));
        for (const cId of currencyIds) {
            if (!validCurrencyIds.has(cId)) {
                throw new NotFound_1.NotFound(`Currency not found: ${cId}`);
            }
        }
    }
    if (chapterIds !== undefined && chapterIds.length > 0) {
        const validChapterIds = new Set(chaptersList.map(c => c.id));
        for (const chId of chapterIds) {
            if (!validChapterIds.has(chId)) {
                throw new NotFound_1.NotFound(`Chapter not found: ${chId}`);
            }
        }
    }
    if (lessonIds !== undefined && lessonIds.length > 0) {
        const validLessonIds = new Set(lessonsList.map(l => l.id));
        for (const lId of lessonIds) {
            if (!validLessonIds.has(lId)) {
                throw new NotFound_1.NotFound(`Lesson not found: ${lId}`);
            }
        }
    }
    if (isStudentsUpdateRequested && newType === "restricted" && studentIds && studentIds.length > 0) {
        const validStudentIds = new Set(studentsList.map(s => s.id));
        for (const sId of studentIds) {
            if (!validStudentIds.has(sId)) {
                throw new NotFound_1.NotFound(`Student not found: ${sId}`);
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
    await connection_1.db.transaction(async (tx) => {
        await tx.update(schema_1.promoCodes).set({
            promoName: promoName || promoCode.promoName,
            code: code || promoCode.code,
            discountAmount: discountAmount ?? promoCode.discountAmount,
            type: newType,
            startDate: new Date(newStartDate),
            endDate: new Date(newEndDate),
            numberOfUsages: numberOfUsages ?? promoCode.numberOfUsages,
        }).where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, id));
        if (courseIds !== undefined) {
            await tx.delete(schema_1.promoCodesCourses).where((0, drizzle_orm_1.eq)(schema_1.promoCodesCourses.promoCodeId, id));
            if (courseIds.length > 0) {
                const coursesToInsert = courseIds.map((cId) => ({
                    promoCodeId: id,
                    courseId: cId
                }));
                await tx.insert(schema_1.promoCodesCourses).values(coursesToInsert);
            }
        }
        if (packageIds !== undefined) {
            await tx.delete(schema_1.promoCodesPackages).where((0, drizzle_orm_1.eq)(schema_1.promoCodesPackages.promoCodeId, id));
            if (packageIds.length > 0) {
                const packagesToInsert = packageIds.map((pId) => ({
                    promoCodeId: id,
                    packageId: pId
                }));
                await tx.insert(schema_1.promoCodesPackages).values(packagesToInsert);
            }
        }
        if (currencyIds !== undefined) {
            await tx.delete(schema_1.promoCodesCurrency).where((0, drizzle_orm_1.eq)(schema_1.promoCodesCurrency.promoCodeId, id));
            if (currencyIds.length > 0) {
                const currenciesToInsert = currencyIds.map((cId) => ({
                    promoCodeId: id,
                    currencyId: cId
                }));
                await tx.insert(schema_1.promoCodesCurrency).values(currenciesToInsert);
            }
        }
        if (chapterIds !== undefined) {
            await tx.delete(schema_1.promoCodesChapters).where((0, drizzle_orm_1.eq)(schema_1.promoCodesChapters.promoCodeId, id));
            if (chapterIds.length > 0) {
                const chaptersToInsert = chapterIds.map((chId) => ({
                    promoCodeId: id,
                    chapterId: chId
                }));
                await tx.insert(schema_1.promoCodesChapters).values(chaptersToInsert);
            }
        }
        if (lessonIds !== undefined) {
            await tx.delete(schema_1.promoCodesLessons).where((0, drizzle_orm_1.eq)(schema_1.promoCodesLessons.promoCodeId, id));
            if (lessonIds.length > 0) {
                const lessonsToInsert = lessonIds.map((lId) => ({
                    promoCodeId: id,
                    lessonId: lId
                }));
                await tx.insert(schema_1.promoCodesLessons).values(lessonsToInsert);
            }
        }
        if (isStudentsUpdateRequested) {
            if (newType === "restricted" && studentIds && studentIds.length > 0) {
                await tx.delete(schema_1.promoCodesAllowedStudents).where((0, drizzle_orm_1.eq)(schema_1.promoCodesAllowedStudents.promoCodeId, id));
                const studentsToInsert = studentIds.map((sId) => ({
                    promoCodeId: id,
                    studentId: sId
                }));
                await tx.insert(schema_1.promoCodesAllowedStudents).values(studentsToInsert);
            }
            else if (newType === "generic") {
                await tx.delete(schema_1.promoCodesAllowedStudents).where((0, drizzle_orm_1.eq)(schema_1.promoCodesAllowedStudents.promoCodeId, id));
            }
        }
    });
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
    // promoCodesUsers, promoCodesCourses, promoCodesPackages, promoCodesCurrency,
    // promoCodesChapters, promoCodesLessons, and promoCodesAllowedStudents all
    // have onDelete: "cascade" on their promoCodeId FK — MySQL removes them
    // automatically when the parent promoCodes row is deleted.
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
