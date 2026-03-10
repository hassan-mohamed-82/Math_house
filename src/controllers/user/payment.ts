import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { BadRequest, NotFound, UnauthorizedError } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { db } from '../../models/connection';
import { packages, paymentMethod, Student, parents, payment } from "../../models/schema";
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import { validateAndSaveLogo } from "../../utils/handleImages";
import { createPaymobCheckoutSession } from "../../utils/paymob";

const getAuthenticatedStudentId = (req: Request) => {
    const studentId = req.user?.id;

    if (!studentId) {
        throw new UnauthorizedError('Student not logged in');
    }

    return studentId;
};

const getStudentForPackagePayment = async (studentId: string) => {
    const [student] = await db.select({
        id: Student.id,
        firstname: Student.firstname,
        lastname: Student.lastname,
        email: Student.email,
        phone: Student.phone,
        parentphone: Student.parentphone,
    }).from(Student).where(eq(Student.id, studentId)).limit(1);

    if (!student) {
        throw new NotFound("Student not found");
    }

    return student;
};

const getLinkedParentId = async (parentPhone: string | null) => {
    if (!parentPhone) {
        return null;
    }

    const [parent] = await db.select({
        id: parents.id,
    }).from(parents).where(eq(parents.phoneNumber, parentPhone)).limit(1);

    return parent?.id ?? null;
};

export const creditPackageBalance = async (studentId: string, packageId: string, database: Pick<typeof db, 'select' | 'update'> = db) => {

    const [existingPackage] = await database.select({
        type: packages.type,
        number: packages.number,
    }).from(packages).where(eq(packages.id, packageId)).limit(1);

    if (!existingPackage) {
        throw new NotFound("Package not found");
    }

    if (existingPackage.number <= 0) {
        throw new BadRequest("Package must include at least one number to be added to student's account");
    }

    switch (existingPackage.type) {
        case "live":
            await database.update(Student)
                .set({ livebalance: sql`${Student.livebalance} + ${existingPackage.number}` })
                .where(eq(Student.id, studentId));
            break;
        case "exam":
            await database.update(Student)
                .set({ exambalance: sql`${Student.exambalance} + ${existingPackage.number}` })
                .where(eq(Student.id, studentId));
            break;
        case "question":
            await database.update(Student)
                .set({ questionbalance: sql`${Student.questionbalance} + ${existingPackage.number}` })
                .where(eq(Student.id, studentId));
            break;
        default:
            throw new BadRequest("Invalid package type");
    }
};

export const requestPackageBuy = async (req: Request, res: Response) => {

    const { packageId, paymentMethodId, receiptImg } = req.body;
    const studentId = getAuthenticatedStudentId(req);

    if (!packageId || !paymentMethodId || !receiptImg) {
        throw new BadRequest("Package ID, Payment Method ID, and receipt image are required");
    }

    const [existingPackage] = await db.select({
        id: packages.id,
        name: packages.name,
        price: packages.price,
        type: packages.type,
        number: packages.number
    }).from(packages).where(eq(packages.id, packageId)).limit(1);

    if (!existingPackage) {
        throw new NotFound("Package not found");
    }

    const [existingPaymentMethod] = await db.select({
        id: paymentMethod.id,
        name: paymentMethod.name,
        isActive: paymentMethod.isActive,
        type: paymentMethod.type,
    }).from(paymentMethod).where(eq(paymentMethod.id, paymentMethodId)).limit(1);

    if (!existingPaymentMethod) {
        throw new NotFound("Payment method not found");
    }

    if (!existingPaymentMethod.isActive) {
        throw new BadRequest("Payment method is not active");
    }

    if (existingPaymentMethod.type !== "Manual") {
        throw new BadRequest("Use the automatic recharge endpoint for automatic payment methods");
    }

    const [existingStudent] = await db.select({
        id: Student.id,
        firstname: Student.firstname,
        lastname: Student.lastname,
        email: Student.email,
        phone: Student.phone,
        parentphone: Student.parentphone,
    }).from(Student).where(eq(Student.id, studentId)).limit(1);

    if (!existingStudent) {
        throw new NotFound("Student not found");
    }

    if (!existingStudent.parentphone) {
        throw new BadRequest("Student does not have a parent phone number");
    }

    const [existingParent] = await db.select({
        id: parents.id,
    }).from(parents).where(eq(parents.phoneNumber, existingStudent.parentphone)).limit(1);
    
    if (!existingParent) {
        throw new NotFound("Parent not found");
    }

    const savedReceiptImg = await validateAndSaveLogo(req, receiptImg, 'payment_receipts');

    await db.insert(payment).values({
        studentId: studentId,
        parentId: existingParent.id,
        purpose: "purchase",
        paymentMethodId: paymentMethodId,
        amount: Number(existingPackage.price),
        receiptImg: savedReceiptImg,
        source: "student",
        packageId: packageId,
    });

    return SuccessResponse(res, {
        message: 'Package buy request created successfully',
    }, 201);
};

export const initiateAutomaticPackageBuy = async (req: Request, res: Response) => {
    const { packageId, paymentMethodId } = req.body;
    const studentId = getAuthenticatedStudentId(req);

    if (!packageId || !paymentMethodId) {
        throw new BadRequest('Package ID and payment method ID are required');
    }

    const [existingPackage] = await db.select({
        id: packages.id,
        name: packages.name,
        price: packages.price,
    }).from(packages).where(eq(packages.id, packageId)).limit(1);

    if (!existingPackage) {
        throw new NotFound('Package not found');
    }

    const packagePrice = Number(existingPackage.price);

    if (!Number.isFinite(packagePrice) || packagePrice <= 0) {
        throw new BadRequest('Package price is invalid');
    }

    const [existingPaymentMethod] = await db.select({
        id: paymentMethod.id,
        name: paymentMethod.name,
        isActive: paymentMethod.isActive,
        type: paymentMethod.type,
    }).from(paymentMethod).where(eq(paymentMethod.id, paymentMethodId)).limit(1);

    if (!existingPaymentMethod) {
        throw new NotFound('Payment method not found');
    }

    if (!existingPaymentMethod.isActive) {
        throw new BadRequest('Payment method is not active');
    }

    if (existingPaymentMethod.type !== 'Automatic') {
        throw new BadRequest('Selected payment method is not an automatic payment method');
    }

    if (existingPaymentMethod.name.toLowerCase() !== 'paymob') {
        throw new BadRequest('Automatic payments are currently available only through Paymob');
    }

    const student = await getStudentForPackagePayment(studentId);
    const parentId = await getLinkedParentId(student.parentphone);
    const paymentId = randomUUID();

    await db.insert(payment).values({
        id: paymentId,
        amount: packagePrice,
        paymentMethodId,
        studentId,
        parentId,
        source: 'student',
        purpose: 'purchase',
        packageId,
    });

    try {
        const checkoutSession = await createPaymobCheckoutSession({
            amountCents: Math.round(packagePrice * 100),
            merchantOrderId: paymentId,
            student,
        });

        return SuccessResponse(res, {
            message: 'Automatic package payment session created successfully',
            paymentId,
            packageId,
            paymentMethod: existingPaymentMethod.name,
            checkoutUrl: checkoutSession.checkoutUrl,
            iframeUrl: checkoutSession.iframeUrl,
            paymobOrderId: checkoutSession.paymobOrderId,
            callbackUrl: checkoutSession.callbackUrl,
        }, 201);
    } catch (error: any) {
        await db.delete(payment).where(eq(payment.id, paymentId));
        throw new BadRequest(error?.message || 'Failed to initialize automatic package payment');
    }
};

export const getPackageBuyHistory = async (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string | undefined)?.trim();

    const searchCondition = search
        ? or(
            like(payment.status, `%${search}%`),
            like(packages.name, `%${search}%`),
            like(packages.type, `%${search}%`),
            like(paymentMethod.name, `%${search}%`),
            like(paymentMethod.type, `%${search}%`),
            sql`cast(${payment.amount} as char) like ${`%${search}%`}`
        )
        : undefined;

    const whereCondition = and(
        eq(payment.studentId, studentId),
        eq(payment.purpose, 'purchase'),
        searchCondition,
    );

    const [totalPackageBuyHistory] = await db
        .select({ count: count() })
        .from(payment)
        .leftJoin(packages, eq(payment.packageId, packages.id))
        .leftJoin(paymentMethod, eq(payment.paymentMethodId, paymentMethod.id))
        .where(whereCondition);

    const total = totalPackageBuyHistory.count;
    const totalPages = Math.ceil(total / limit);

    const packageBuyHistory = await db
        .select({
            id: payment.id,
            amount: payment.amount,
            status: payment.status,
            createdAt: payment.createdAt,
            receiptImg: payment.receiptImg,
            source: payment.source,
            package: {
                id: packages.id,
                name: packages.name,
                type: packages.type,
                number: packages.number,
                price: packages.price,
            },
            paymentMethod: {
                id: paymentMethod.id,
                name: paymentMethod.name,
                type: paymentMethod.type,
            },
        })
        .from(payment)
        .leftJoin(packages, eq(payment.packageId, packages.id))
        .leftJoin(paymentMethod, eq(payment.paymentMethodId, paymentMethod.id))
        .where(whereCondition)
        .orderBy(desc(payment.createdAt))
        .limit(limit)
        .offset(offset);

    return SuccessResponse(res, {
        message: 'Package buy history retrieved successfully',
        history: packageBuyHistory,
        pagination: {
            total,
            page,
            limit,
            totalPages,
        },
    });
};

export const selectPaymentMethods = async (req: Request, res: Response) => {
    const paymentMethods = await db.select({
        id: paymentMethod.id,
        name: paymentMethod.name,
        type: paymentMethod.type,
        logo: paymentMethod.logo,
        isActive: paymentMethod.isActive,
    }).from(paymentMethod).where(eq(paymentMethod.isActive, true));

    return SuccessResponse(res, {
        message: 'Active payment methods retrieved successfully',
        paymentMethods,
    });
};