// import { Request, Response } from "express";
// import { promoCodes, promoCodesCourses, promoCodesPackages, courses, packages, promoCodesUsers, promoCodesCurrency, Currency, promoCodesAllowedStudents, Student } from "../../models/schema";
// import { count,inArray, eq } from "drizzle-orm";
// import { db } from "../../models/connection";
// import { BadRequest } from "../../Errors/BadRequest";
// import { NotFound } from "../../Errors/NotFound";
// import { SuccessResponse } from "../../utils/response";


// export const createPromoCode = async (req: Request, res: Response) => {
//     const { promoName,
//         code,
//         discountAmount,
//         courseIds,
//         packageIds,
//         currencyIds,
//         startDate,
//         endDate,
//         numberOfUsages,
//         type,
//         studentIds } = req.body;

//     if (!promoName || !code || !discountAmount || !type || !startDate || !endDate || !numberOfUsages) {
//         throw new BadRequest("promoName, code, discountAmount, type, startDate, endDate and numberOfUsages are required");
//     }

//     if (courseIds && !Array.isArray(courseIds)) {
//         throw new BadRequest("courseIds must be an array");
//     }
//     if (packageIds && !Array.isArray(packageIds)) {
//         throw new BadRequest("packageIds must be an array");
//     }
//     if (currencyIds && !Array.isArray(currencyIds)) {
//         throw new BadRequest("currencyIds must be an array");
//     }

//     if (type !== "generic" && type !== "restricted") {
//         throw new BadRequest("Invalid promocode type, Must be either 'generic' or 'restricted'");
//     }

//     if (type === "restricted" && (!studentIds || studentIds.length === 0)) {
//         throw new BadRequest("studentIds must be provided and non-empty for a restricted promo code");
//     }

//     if (type === "generic" && studentIds && studentIds.length > 0) {
//         throw new BadRequest("studentIds should not be provided for a generic promo code");
//     }

//     if (startDate > endDate) {
//         throw new BadRequest("Start date should be less than end date");
//     }

//     if (discountAmount < 0) {
//         throw new BadRequest("Discount amount should be greater than 0");
//     }

//     if (numberOfUsages < 0) {
//         throw new BadRequest("Number of usages should be greater than 0");
//     }

//     const [coursesList, packagesList, currenciesList, studentsList, existingPromoCode] = await Promise.all([
//         (courseIds && courseIds.length > 0)
//             ? db.select({ id: courses.id }).from(courses).where(inArray(courses.id, courseIds))
//             : Promise.resolve([]),
//         (packageIds && packageIds.length > 0)
//             ? db.select({ id: packages.id }).from(packages).where(inArray(packages.id, packageIds))
//             : Promise.resolve([]),
//         (currencyIds && currencyIds.length > 0)
//             ? db.select({ id: Currency.id }).from(Currency).where(inArray(Currency.id, currencyIds))
//             : Promise.resolve([]),
//         type === "restricted"
//             ? db.select({ id: Student.id }).from(Student).where(inArray(Student.id, studentIds))
//             : Promise.resolve([]),
//         db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1)
//     ]);

//     if (existingPromoCode && existingPromoCode.length > 0) {
//         throw new BadRequest("Promo code already exists");
//     }

//     if (courseIds && courseIds.length > 0) {
//         const validCourseIds = new Set(coursesList.map(c => c.id));
//         for (const cId of courseIds) {
//             if (!validCourseIds.has(cId)) {
//                 throw new NotFound(`Course not found: ${cId}`);
//             }
//         }
//     }

//     if (packageIds && packageIds.length > 0) {
//         const validPackageIds = new Set(packagesList.map(p => p.id));
//         for (const pId of packageIds) {
//             if (!validPackageIds.has(pId)) {
//                 throw new NotFound(`Package not found: ${pId}`);
//             }
//         }
//     }

//     if (currencyIds && currencyIds.length > 0) {
//         const validCurrencyIds = new Set(currenciesList.map(c => c.id));
//         for (const cId of currencyIds) {
//             if (!validCurrencyIds.has(cId)) {
//                 throw new NotFound(`Currency not found: ${cId}`);
//             }
//         }
//     }

//     if (type === "restricted") {
//         const validStudentIds = new Set(studentsList.map(s => s.id));
//         for (const sId of studentIds) {
//             if (!validStudentIds.has(sId)) {
//                 throw new NotFound(`Student not found: ${sId}`);
//             }
//         }
//     }

//     const promoCodeId = crypto.randomUUID();

//     await db.transaction(async (tx) => {
//         await tx.insert(promoCodes).values({
//             id: promoCodeId,
//             promoName,
//             code,
//             discountAmount,
//             type,
//             startDate: new Date(startDate),
//             endDate: new Date(endDate),
//             numberOfUsages,
//         });

//         if (courseIds && courseIds.length > 0) {
//             const coursesToInsert = courseIds.map((cId: string) => ({
//                 promoCodeId,
//                 courseId: cId
//             }));
//             await tx.insert(promoCodesCourses).values(coursesToInsert);
//         }

//         if (packageIds && packageIds.length > 0) {
//             const packagesToInsert = packageIds.map((pId: string) => ({
//                 promoCodeId,
//                 packageId: pId
//             }));
//             await tx.insert(promoCodesPackages).values(packagesToInsert);
//         }

//         if (currencyIds && currencyIds.length > 0) {
//             const currenciesToInsert = currencyIds.map((cId: string) => ({
//                 promoCodeId,
//                 currencyId: cId
//             }));
//             await tx.insert(promoCodesCurrency).values(currenciesToInsert);
//         }

//         if (type === "restricted") {
//             const studentsToInsert = studentIds.map((sId: string) => ({
//                 promoCodeId,
//                 studentId: sId
//             }));
//             await tx.insert(promoCodesAllowedStudents).values(studentsToInsert);
//         }
//     });

//     return SuccessResponse(res, { message: "Promo code created successfully", promoCodeId }, 201);
// };

// export const getAllPromoCodes = async (req: Request, res: Response) => {
//     const promoCodesData = await db.select({
//         id: promoCodes.id,
//         promoName: promoCodes.promoName,
//         code: promoCodes.code,
//         discountAmount: promoCodes.discountAmount,
//         type: promoCodes.type,
//         startDate: promoCodes.startDate,
//         endDate: promoCodes.endDate,
//         numberOfUsagesAllowed: promoCodes.numberOfUsages,
//         numberOfUsers: count(promoCodesUsers.userId),
//     }).from(promoCodes)
//         .leftJoin(promoCodesUsers, eq(promoCodes.id, promoCodesUsers.promoCodeId))
//         .groupBy(promoCodes.id);

//     return SuccessResponse(res, { message: "Promo codes fetched successfully", data: promoCodesData }, 200);
// };

// export const getPromoCodebyId = async (req: Request, res: Response) => {
//     const { id } = req.params;
//     if (!id) {
//         throw new BadRequest("Invalid promo code id");
//     }
//     const promoCodeRecords = await db.select({
//         id: promoCodes.id,
//         promoName: promoCodes.promoName,
//         code: promoCodes.code,
//         discountAmount: promoCodes.discountAmount,
//         type: promoCodes.type,
//         startDate: promoCodes.startDate,
//         endDate: promoCodes.endDate,
//         numberOfUsagesAllowed: promoCodes.numberOfUsages,
//         numberOfUsers: count(promoCodesUsers.userId),
//     }).from(promoCodes)
//         .leftJoin(promoCodesUsers, eq(promoCodes.id, promoCodesUsers.promoCodeId))
//         .where(eq(promoCodes.id, id))
//         .groupBy(promoCodes.id).limit(1);

//     if (!promoCodeRecords || promoCodeRecords.length === 0) {
//         throw new NotFound("Promo code not found");
//     }

//     const pcCourses = await db.select({
//         courseId: courses.id,
//         courseName: courses.name
//     }).from(promoCodesCourses).innerJoin(courses, eq(promoCodesCourses.courseId, courses.id))
//         .where(eq(promoCodesCourses.promoCodeId, id));

//     const pcPackages = await db.select({
//         packageId: packages.id,
//         packageName: packages.name
//     }).from(promoCodesPackages).innerJoin(packages, eq(promoCodesPackages.packageId, packages.id))
//         .where(eq(promoCodesPackages.promoCodeId, id));

//     const pcCurrencies = await db.select({
//         currencyId: Currency.id,
//         currencyName: Currency.name,
//         currencyCode: Currency.code
//     }).from(promoCodesCurrency).innerJoin(Currency, eq(promoCodesCurrency.currencyId, Currency.id))
//         .where(eq(promoCodesCurrency.promoCodeId, id));

//     const pcAllowedStudents = promoCodeRecords[0].type === "restricted"
//         ? await db.select({
//             studentId: Student.id,
//             firstname: Student.firstname,
//             lastname: Student.lastname,
//             nickname: Student.nickname
//         }).from(promoCodesAllowedStudents).innerJoin(Student, eq(promoCodesAllowedStudents.studentId, Student.id))
//             .where(eq(promoCodesAllowedStudents.promoCodeId, id))
//         : [];

//     const promoCode = {
//         ...promoCodeRecords[0],
//         courses: pcCourses.map(c => ({ id: c.courseId, courseName: c.courseName })),
//         packages: pcPackages.map(p => ({ id: p.packageId, packageName: p.packageName })),
//         currencies: pcCurrencies.map(c => ({ id: c.currencyId, name: c.currencyName, code: c.currencyCode })),
//         allowedStudents: pcAllowedStudents.map(s => ({ id: s.studentId, firstname: s.firstname, lastname: s.lastname, nickname: s.nickname }))
//     };

//     return SuccessResponse(res, { message: "Promo code fetched successfully", data: promoCode }, 200);
// };

// export const updatePromoCode = async (req: Request, res: Response) => {
//     const { id } = req.params;
//     if (!id) {
//         throw new BadRequest("Invalid promo code id");
//     }

//     const { promoName, code, discountAmount, courseIds, packageIds, currencyIds, startDate, endDate, numberOfUsages, type, studentIds } = req.body;

//     const promoCodeRecords = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
//     if (!promoCodeRecords || promoCodeRecords.length === 0) {
//         throw new NotFound("Promo code not found");
//     }
//     const promoCode = promoCodeRecords[0];

//     if (courseIds !== undefined && !Array.isArray(courseIds)) {
//         throw new BadRequest("courseIds must be an array");
//     }
//     if (packageIds !== undefined && !Array.isArray(packageIds)) {
//         throw new BadRequest("packageIds must be an array");
//     }
//     if (currencyIds !== undefined && !Array.isArray(currencyIds)) {
//         throw new BadRequest("currencyIds must be an array");
//     }

//     if (type !== undefined && type !== "generic" && type !== "restricted") {
//         throw new BadRequest("Invalid promocode type, Must be either 'generic' or 'restricted'");
//     }

//     const newType = type ?? promoCode.type;
//     const isTypeChanging = type !== undefined && type !== promoCode.type;
//     const isStudentsUpdateRequested = studentIds !== undefined || isTypeChanging;

//     if (isStudentsUpdateRequested) {
//         if (newType === "restricted" && (!studentIds || studentIds.length === 0)) {
//             throw new BadRequest("studentIds must be provided and non-empty for a restricted promo code");
//         }

//         if (newType === "generic" && studentIds && studentIds.length > 0) {
//             throw new BadRequest("studentIds should not be provided for a generic promo code");
//         }
//     }

//     const [existingPromoCode, coursesList, packagesList, currenciesList, studentsList] = await Promise.all([
//         (code && code !== promoCode.code)
//             ? db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1)
//             : Promise.resolve([]),
//         (courseIds !== undefined && courseIds.length > 0)
//             ? db.select({ id: courses.id }).from(courses).where(inArray(courses.id, courseIds))
//             : Promise.resolve([]),
//         (packageIds !== undefined && packageIds.length > 0)
//             ? db.select({ id: packages.id }).from(packages).where(inArray(packages.id, packageIds))
//             : Promise.resolve([]),
//         (currencyIds !== undefined && currencyIds.length > 0)
//             ? db.select({ id: Currency.id }).from(Currency).where(inArray(Currency.id, currencyIds))
//             : Promise.resolve([]),
//         (isStudentsUpdateRequested && newType === "restricted" && studentIds && studentIds.length > 0)
//             ? db.select({ id: Student.id }).from(Student).where(inArray(Student.id, studentIds))
//             : Promise.resolve([]),
//     ]);

//     if (existingPromoCode.length > 0) {
//         throw new BadRequest("Promo code already exists");
//     }

//     if (courseIds !== undefined && courseIds.length > 0) {
//         const validCourseIds = new Set(coursesList.map(c => c.id));
//         for (const cId of courseIds) {
//             if (!validCourseIds.has(cId)) {
//                 throw new NotFound(`Course not found: ${cId}`);
//             }
//         }
//     }

//     if (packageIds !== undefined && packageIds.length > 0) {
//         const validPackageIds = new Set(packagesList.map(p => p.id));
//         for (const pId of packageIds) {
//             if (!validPackageIds.has(pId)) {
//                 throw new NotFound(`Package not found: ${pId}`);
//             }
//         }
//     }

//     if (currencyIds !== undefined && currencyIds.length > 0) {
//         const validCurrencyIds = new Set(currenciesList.map(c => c.id));
//         for (const cId of currencyIds) {
//             if (!validCurrencyIds.has(cId)) {
//                 throw new NotFound(`Currency not found: ${cId}`);
//             }
//         }
//     }

//     if (isStudentsUpdateRequested && newType === "restricted" && studentIds && studentIds.length > 0) {
//         const validStudentIds = new Set(studentsList.map(s => s.id));
//         for (const sId of studentIds) {
//             if (!validStudentIds.has(sId)) {
//                 throw new NotFound(`Student not found: ${sId}`);
//             }
//         }
//     }

//     const newStartDate = startDate || promoCode.startDate;
//     const newEndDate = endDate || promoCode.endDate;

//     if (newStartDate > newEndDate) {
//         throw new BadRequest("Start date should be less than end date");
//     }

//     if (discountAmount !== undefined && discountAmount < 0) {
//         throw new BadRequest("Discount amount should be greater than 0");
//     }

//     if (numberOfUsages !== undefined && numberOfUsages < 0) {
//         throw new BadRequest("Number of usages should be greater than 0");
//     }

//     await db.transaction(async (tx) => {
//         await tx.update(promoCodes).set({
//             promoName: promoName || promoCode.promoName,
//             code: code || promoCode.code,
//             discountAmount: discountAmount ?? promoCode.discountAmount,
//             type: newType,
//             startDate: new Date(newStartDate),
//             endDate: new Date(newEndDate),
//             numberOfUsages: numberOfUsages ?? promoCode.numberOfUsages,
//         }).where(eq(promoCodes.id, id));

//         if (courseIds !== undefined) {
//             await tx.delete(promoCodesCourses).where(eq(promoCodesCourses.promoCodeId, id));
//             if (courseIds.length > 0) {
//                 const coursesToInsert = courseIds.map((cId: string) => ({
//                     promoCodeId: id,
//                     courseId: cId
//                 }));
//                 await tx.insert(promoCodesCourses).values(coursesToInsert);
//             }
//         }

//         if (packageIds !== undefined) {
//             await tx.delete(promoCodesPackages).where(eq(promoCodesPackages.promoCodeId, id));
//             if (packageIds.length > 0) {
//                 const packagesToInsert = packageIds.map((pId: string) => ({
//                     promoCodeId: id,
//                     packageId: pId
//                 }));
//                 await tx.insert(promoCodesPackages).values(packagesToInsert);
//             }
//         }

//         if (currencyIds !== undefined) {
//             await tx.delete(promoCodesCurrency).where(eq(promoCodesCurrency.promoCodeId, id));
//             if (currencyIds.length > 0) {
//                 const currenciesToInsert = currencyIds.map((cId: string) => ({
//                     promoCodeId: id,
//                     currencyId: cId
//                 }));
//                 await tx.insert(promoCodesCurrency).values(currenciesToInsert);
//             }
//         }

//         if (isStudentsUpdateRequested) {
//             if (newType === "restricted" && studentIds && studentIds.length > 0) {
//                 await tx.delete(promoCodesAllowedStudents).where(eq(promoCodesAllowedStudents.promoCodeId, id));
//                 const studentsToInsert = studentIds.map((sId: string) => ({
//                     promoCodeId: id,
//                     studentId: sId
//                 }));
//                 await tx.insert(promoCodesAllowedStudents).values(studentsToInsert);
//             } else if (newType === "generic") {
//                 await tx.delete(promoCodesAllowedStudents).where(eq(promoCodesAllowedStudents.promoCodeId, id));
//             }
//         }
//     });

//     return SuccessResponse(res, { message: "Promo code updated successfully" }, 200);
// };

// export const deletePromoCode = async (req: Request, res: Response) => {
//     const { id } = req.params;
//     if (!id) {
//         throw new BadRequest("Invalid promo code id");
//     }

//     const promoCode = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
//     if (!promoCode || promoCode.length === 0) {
//         throw new NotFound("Promo code not found");
//     }

//     // promoCodesUsers, promoCodesCourses, promoCodesPackages,
//     // promoCodesCurrency, and promoCodesAllowedStudents all have
//     // onDelete: "cascade" on their promoCodeId FK — MySQL removes
//     // them automatically when the parent promoCodes row is deleted.
//     await db.delete(promoCodes).where(eq(promoCodes.id, id));

//     return SuccessResponse(res, { message: "Promo code deleted successfully" }, 200);
// };

// export const currencySelection = async (req: Request , res: Response) => {
//     const currencies = await db.select({
//         id: Currency.id,
//         name: Currency.name,
//         code: Currency.code
//     }).from(Currency);
//     return SuccessResponse(res, { message: "Currencies fetched successfully", data: currencies }, 200);
// };



import { Request, Response } from "express";
import {
    promoCodes, promoCodesCourses, promoCodesPackages, courses, packages,
    promoCodesUsers, promoCodesCurrency, Currency, promoCodesAllowedStudents, Student,
    promoCodesChapters, chapters, promoCodesLessons, lessons
} from "../../models/schema";
import { count, inArray, eq } from "drizzle-orm";
import { db } from "../../models/connection";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { SuccessResponse } from "../../utils/response";

export const createPromoCode = async (req: Request, res: Response) => {
    const { promoName,
        code,
        discountAmount,
        courseIds,
        packageIds,
        currencyIds,
        chapterIds,
        lessonIds,
        startDate,
        endDate,
        numberOfUsages,
        type,
        studentIds } = req.body;

    if (!promoName || !code || !discountAmount || !type || !startDate || !endDate || !numberOfUsages) {
        throw new BadRequest("promoName, code, discountAmount, type, startDate, endDate and numberOfUsages are required");
    }

    if (courseIds && !Array.isArray(courseIds)) {
        throw new BadRequest("courseIds must be an array");
    }
    if (packageIds && !Array.isArray(packageIds)) {
        throw new BadRequest("packageIds must be an array");
    }
    if (currencyIds && !Array.isArray(currencyIds)) {
        throw new BadRequest("currencyIds must be an array");
    }
    if (chapterIds && !Array.isArray(chapterIds)) {
        throw new BadRequest("chapterIds must be an array");
    }
    if (lessonIds && !Array.isArray(lessonIds)) {
        throw new BadRequest("lessonIds must be an array");
    }

    if (type !== "generic" && type !== "restricted") {
        throw new BadRequest("Invalid promocode type, Must be either 'generic' or 'restricted'");
    }

    if (type === "restricted" && (!studentIds || studentIds.length === 0)) {
        throw new BadRequest("studentIds must be provided and non-empty for a restricted promo code");
    }

    if (type === "generic" && studentIds && studentIds.length > 0) {
        throw new BadRequest("studentIds should not be provided for a generic promo code");
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

    const [coursesList, packagesList, currenciesList, chaptersList, lessonsList, studentsList, existingPromoCode] = await Promise.all([
        (courseIds && courseIds.length > 0)
            ? db.select({ id: courses.id }).from(courses).where(inArray(courses.id, courseIds))
            : Promise.resolve([]),
        (packageIds && packageIds.length > 0)
            ? db.select({ id: packages.id }).from(packages).where(inArray(packages.id, packageIds))
            : Promise.resolve([]),
        (currencyIds && currencyIds.length > 0)
            ? db.select({ id: Currency.id }).from(Currency).where(inArray(Currency.id, currencyIds))
            : Promise.resolve([]),
        (chapterIds && chapterIds.length > 0)
            ? db.select({ id: chapters.id }).from(chapters).where(inArray(chapters.id, chapterIds))
            : Promise.resolve([]),
        (lessonIds && lessonIds.length > 0)
            ? db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.id, lessonIds))
            : Promise.resolve([]),
        type === "restricted"
            ? db.select({ id: Student.id }).from(Student).where(inArray(Student.id, studentIds))
            : Promise.resolve([]),
        db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1)
    ]);

    if (existingPromoCode && existingPromoCode.length > 0) {
        throw new BadRequest("Promo code already exists");
    }

    if (courseIds && courseIds.length > 0) {
        const validCourseIds = new Set(coursesList.map(c => c.id));
        for (const cId of courseIds) {
            if (!validCourseIds.has(cId)) {
                throw new NotFound(`Course not found: ${cId}`);
            }
        }
    }

    if (packageIds && packageIds.length > 0) {
        const validPackageIds = new Set(packagesList.map(p => p.id));
        for (const pId of packageIds) {
            if (!validPackageIds.has(pId)) {
                throw new NotFound(`Package not found: ${pId}`);
            }
        }
    }

    if (currencyIds && currencyIds.length > 0) {
        const validCurrencyIds = new Set(currenciesList.map(c => c.id));
        for (const cId of currencyIds) {
            if (!validCurrencyIds.has(cId)) {
                throw new NotFound(`Currency not found: ${cId}`);
            }
        }
    }

    if (chapterIds && chapterIds.length > 0) {
        const validChapterIds = new Set(chaptersList.map(c => c.id));
        for (const chId of chapterIds) {
            if (!validChapterIds.has(chId)) {
                throw new NotFound(`Chapter not found: ${chId}`);
            }
        }
    }

    if (lessonIds && lessonIds.length > 0) {
        const validLessonIds = new Set(lessonsList.map(l => l.id));
        for (const lId of lessonIds) {
            if (!validLessonIds.has(lId)) {
                throw new NotFound(`Lesson not found: ${lId}`);
            }
        }
    }

    if (type === "restricted") {
        const validStudentIds = new Set(studentsList.map(s => s.id));
        for (const sId of studentIds) {
            if (!validStudentIds.has(sId)) {
                throw new NotFound(`Student not found: ${sId}`);
            }
        }
    }

    const promoCodeId = crypto.randomUUID();

    await db.transaction(async (tx) => {
        await tx.insert(promoCodes).values({
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
            const coursesToInsert = courseIds.map((cId: string) => ({
                promoCodeId,
                courseId: cId
            }));
            await tx.insert(promoCodesCourses).values(coursesToInsert);
        }

        if (packageIds && packageIds.length > 0) {
            const packagesToInsert = packageIds.map((pId: string) => ({
                promoCodeId,
                packageId: pId
            }));
            await tx.insert(promoCodesPackages).values(packagesToInsert);
        }

        if (currencyIds && currencyIds.length > 0) {
            const currenciesToInsert = currencyIds.map((cId: string) => ({
                promoCodeId,
                currencyId: cId
            }));
            await tx.insert(promoCodesCurrency).values(currenciesToInsert);
        }

        if (chapterIds && chapterIds.length > 0) {
            const chaptersToInsert = chapterIds.map((chId: string) => ({
                promoCodeId,
                chapterId: chId
            }));
            await tx.insert(promoCodesChapters).values(chaptersToInsert);
        }

        if (lessonIds && lessonIds.length > 0) {
            const lessonsToInsert = lessonIds.map((lId: string) => ({
                promoCodeId,
                lessonId: lId
            }));
            await tx.insert(promoCodesLessons).values(lessonsToInsert);
        }

        if (type === "restricted") {
            const studentsToInsert = studentIds.map((sId: string) => ({
                promoCodeId,
                studentId: sId
            }));
            await tx.insert(promoCodesAllowedStudents).values(studentsToInsert);
        }
    });

    return SuccessResponse(res, { message: "Promo code created successfully", promoCodeId }, 201);
};

export const getAllPromoCodes = async (req: Request, res: Response) => {
    const promoCodesData = await db.select({
        id: promoCodes.id,
        promoName: promoCodes.promoName,
        code: promoCodes.code,
        discountAmount: promoCodes.discountAmount,
        type: promoCodes.type,
        startDate: promoCodes.startDate,
        endDate: promoCodes.endDate,
        numberOfUsagesAllowed: promoCodes.numberOfUsages,
        numberOfUsers: count(promoCodesUsers.userId),
    }).from(promoCodes)
        .leftJoin(promoCodesUsers, eq(promoCodes.id, promoCodesUsers.promoCodeId))
        .groupBy(promoCodes.id);

    return SuccessResponse(res, { message: "Promo codes fetched successfully", data: promoCodesData }, 200);
};

export const getPromoCodebyId = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Invalid promo code id");
    }
    const promoCodeRecords = await db.select({
        id: promoCodes.id,
        promoName: promoCodes.promoName,
        code: promoCodes.code,
        discountAmount: promoCodes.discountAmount,
        type: promoCodes.type,
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

    const [pcCourses, pcPackages, pcCurrencies, pcChapters, pcLessons] = await Promise.all([
        db.select({
            courseId: courses.id,
            courseName: courses.name
        }).from(promoCodesCourses).innerJoin(courses, eq(promoCodesCourses.courseId, courses.id))
            .where(eq(promoCodesCourses.promoCodeId, id)),

        db.select({
            packageId: packages.id,
            packageName: packages.name
        }).from(promoCodesPackages).innerJoin(packages, eq(promoCodesPackages.packageId, packages.id))
            .where(eq(promoCodesPackages.promoCodeId, id)),

        db.select({
            currencyId: Currency.id,
            currencyName: Currency.name,
            currencyCode: Currency.code
        }).from(promoCodesCurrency).innerJoin(Currency, eq(promoCodesCurrency.currencyId, Currency.id))
            .where(eq(promoCodesCurrency.promoCodeId, id)),

        db.select({
            chapterId: chapters.id,
            chapterName: chapters.name
        }).from(promoCodesChapters).innerJoin(chapters, eq(promoCodesChapters.chapterId, chapters.id))
            .where(eq(promoCodesChapters.promoCodeId, id)),

        db.select({
            lessonId: lessons.id,
            lessonName: lessons.name
        }).from(promoCodesLessons).innerJoin(lessons, eq(promoCodesLessons.lessonId, lessons.id))
            .where(eq(promoCodesLessons.promoCodeId, id)),
    ]);

    const pcAllowedStudents = promoCodeRecords[0].type === "restricted"
        ? await db.select({
            studentId: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname
        }).from(promoCodesAllowedStudents).innerJoin(Student, eq(promoCodesAllowedStudents.studentId, Student.id))
            .where(eq(promoCodesAllowedStudents.promoCodeId, id))
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

    return SuccessResponse(res, { message: "Promo code fetched successfully", data: promoCode }, 200);
};

export const updatePromoCode = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Invalid promo code id");
    }

    const { promoName, code, discountAmount, courseIds, packageIds, currencyIds, chapterIds, lessonIds, startDate, endDate, numberOfUsages, type, studentIds } = req.body;

    const promoCodeRecords = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
    if (!promoCodeRecords || promoCodeRecords.length === 0) {
        throw new NotFound("Promo code not found");
    }
    const promoCode = promoCodeRecords[0];

    if (courseIds !== undefined && !Array.isArray(courseIds)) {
        throw new BadRequest("courseIds must be an array");
    }
    if (packageIds !== undefined && !Array.isArray(packageIds)) {
        throw new BadRequest("packageIds must be an array");
    }
    if (currencyIds !== undefined && !Array.isArray(currencyIds)) {
        throw new BadRequest("currencyIds must be an array");
    }
    if (chapterIds !== undefined && !Array.isArray(chapterIds)) {
        throw new BadRequest("chapterIds must be an array");
    }
    if (lessonIds !== undefined && !Array.isArray(lessonIds)) {
        throw new BadRequest("lessonIds must be an array");
    }

    if (type !== undefined && type !== "generic" && type !== "restricted") {
        throw new BadRequest("Invalid promocode type, Must be either 'generic' or 'restricted'");
    }

    const newType = type ?? promoCode.type;
    const isTypeChanging = type !== undefined && type !== promoCode.type;
    const isStudentsUpdateRequested = studentIds !== undefined || isTypeChanging;

    if (isStudentsUpdateRequested) {
        if (newType === "restricted" && (!studentIds || studentIds.length === 0)) {
            throw new BadRequest("studentIds must be provided and non-empty for a restricted promo code");
        }

        if (newType === "generic" && studentIds && studentIds.length > 0) {
            throw new BadRequest("studentIds should not be provided for a generic promo code");
        }
    }

    const [existingPromoCode, coursesList, packagesList, currenciesList, chaptersList, lessonsList, studentsList] = await Promise.all([
        (code && code !== promoCode.code)
            ? db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1)
            : Promise.resolve([]),
        (courseIds !== undefined && courseIds.length > 0)
            ? db.select({ id: courses.id }).from(courses).where(inArray(courses.id, courseIds))
            : Promise.resolve([]),
        (packageIds !== undefined && packageIds.length > 0)
            ? db.select({ id: packages.id }).from(packages).where(inArray(packages.id, packageIds))
            : Promise.resolve([]),
        (currencyIds !== undefined && currencyIds.length > 0)
            ? db.select({ id: Currency.id }).from(Currency).where(inArray(Currency.id, currencyIds))
            : Promise.resolve([]),
        (chapterIds !== undefined && chapterIds.length > 0)
            ? db.select({ id: chapters.id }).from(chapters).where(inArray(chapters.id, chapterIds))
            : Promise.resolve([]),
        (lessonIds !== undefined && lessonIds.length > 0)
            ? db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.id, lessonIds))
            : Promise.resolve([]),
        (isStudentsUpdateRequested && newType === "restricted" && studentIds && studentIds.length > 0)
            ? db.select({ id: Student.id }).from(Student).where(inArray(Student.id, studentIds))
            : Promise.resolve([]),
    ]);

    if (existingPromoCode.length > 0) {
        throw new BadRequest("Promo code already exists");
    }

    if (courseIds !== undefined && courseIds.length > 0) {
        const validCourseIds = new Set(coursesList.map(c => c.id));
        for (const cId of courseIds) {
            if (!validCourseIds.has(cId)) {
                throw new NotFound(`Course not found: ${cId}`);
            }
        }
    }

    if (packageIds !== undefined && packageIds.length > 0) {
        const validPackageIds = new Set(packagesList.map(p => p.id));
        for (const pId of packageIds) {
            if (!validPackageIds.has(pId)) {
                throw new NotFound(`Package not found: ${pId}`);
            }
        }
    }

    if (currencyIds !== undefined && currencyIds.length > 0) {
        const validCurrencyIds = new Set(currenciesList.map(c => c.id));
        for (const cId of currencyIds) {
            if (!validCurrencyIds.has(cId)) {
                throw new NotFound(`Currency not found: ${cId}`);
            }
        }
    }

    if (chapterIds !== undefined && chapterIds.length > 0) {
        const validChapterIds = new Set(chaptersList.map(c => c.id));
        for (const chId of chapterIds) {
            if (!validChapterIds.has(chId)) {
                throw new NotFound(`Chapter not found: ${chId}`);
            }
        }
    }

    if (lessonIds !== undefined && lessonIds.length > 0) {
        const validLessonIds = new Set(lessonsList.map(l => l.id));
        for (const lId of lessonIds) {
            if (!validLessonIds.has(lId)) {
                throw new NotFound(`Lesson not found: ${lId}`);
            }
        }
    }

    if (isStudentsUpdateRequested && newType === "restricted" && studentIds && studentIds.length > 0) {
        const validStudentIds = new Set(studentsList.map(s => s.id));
        for (const sId of studentIds) {
            if (!validStudentIds.has(sId)) {
                throw new NotFound(`Student not found: ${sId}`);
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

    await db.transaction(async (tx) => {
        await tx.update(promoCodes).set({
            promoName: promoName || promoCode.promoName,
            code: code || promoCode.code,
            discountAmount: discountAmount ?? promoCode.discountAmount,
            type: newType,
            startDate: new Date(newStartDate),
            endDate: new Date(newEndDate),
            numberOfUsages: numberOfUsages ?? promoCode.numberOfUsages,
        }).where(eq(promoCodes.id, id));

        if (courseIds !== undefined) {
            await tx.delete(promoCodesCourses).where(eq(promoCodesCourses.promoCodeId, id));
            if (courseIds.length > 0) {
                const coursesToInsert = courseIds.map((cId: string) => ({
                    promoCodeId: id,
                    courseId: cId
                }));
                await tx.insert(promoCodesCourses).values(coursesToInsert);
            }
        }

        if (packageIds !== undefined) {
            await tx.delete(promoCodesPackages).where(eq(promoCodesPackages.promoCodeId, id));
            if (packageIds.length > 0) {
                const packagesToInsert = packageIds.map((pId: string) => ({
                    promoCodeId: id,
                    packageId: pId
                }));
                await tx.insert(promoCodesPackages).values(packagesToInsert);
            }
        }

        if (currencyIds !== undefined) {
            await tx.delete(promoCodesCurrency).where(eq(promoCodesCurrency.promoCodeId, id));
            if (currencyIds.length > 0) {
                const currenciesToInsert = currencyIds.map((cId: string) => ({
                    promoCodeId: id,
                    currencyId: cId
                }));
                await tx.insert(promoCodesCurrency).values(currenciesToInsert);
            }
        }

        if (chapterIds !== undefined) {
            await tx.delete(promoCodesChapters).where(eq(promoCodesChapters.promoCodeId, id));
            if (chapterIds.length > 0) {
                const chaptersToInsert = chapterIds.map((chId: string) => ({
                    promoCodeId: id,
                    chapterId: chId
                }));
                await tx.insert(promoCodesChapters).values(chaptersToInsert);
            }
        }

        if (lessonIds !== undefined) {
            await tx.delete(promoCodesLessons).where(eq(promoCodesLessons.promoCodeId, id));
            if (lessonIds.length > 0) {
                const lessonsToInsert = lessonIds.map((lId: string) => ({
                    promoCodeId: id,
                    lessonId: lId
                }));
                await tx.insert(promoCodesLessons).values(lessonsToInsert);
            }
        }

        if (isStudentsUpdateRequested) {
            if (newType === "restricted" && studentIds && studentIds.length > 0) {
                await tx.delete(promoCodesAllowedStudents).where(eq(promoCodesAllowedStudents.promoCodeId, id));
                const studentsToInsert = studentIds.map((sId: string) => ({
                    promoCodeId: id,
                    studentId: sId
                }));
                await tx.insert(promoCodesAllowedStudents).values(studentsToInsert);
            } else if (newType === "generic") {
                await tx.delete(promoCodesAllowedStudents).where(eq(promoCodesAllowedStudents.promoCodeId, id));
            }
        }
    });

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

    // promoCodesUsers, promoCodesCourses, promoCodesPackages, promoCodesCurrency,
    // promoCodesChapters, promoCodesLessons, and promoCodesAllowedStudents all
    // have onDelete: "cascade" on their promoCodeId FK — MySQL removes them
    // automatically when the parent promoCodes row is deleted.
    await db.delete(promoCodes).where(eq(promoCodes.id, id));

    return SuccessResponse(res, { message: "Promo code deleted successfully" }, 200);
};

export const currencySelection = async (req: Request, res: Response) => {
    const currencies = await db.select({
        id: Currency.id,
        name: Currency.name,
        code: Currency.code
    }).from(Currency);
    return SuccessResponse(res, { message: "Currencies fetched successfully", data: currencies }, 200);
};