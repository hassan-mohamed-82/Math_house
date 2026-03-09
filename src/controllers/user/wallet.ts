import { Request, Response } from 'express';
import { BadRequest, NotFound, UnauthorizedError } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { db } from '../../models/connection';
import { parents, payment, paymentMethod, Student, wallet, walletTransaction } from '../../models/schema';
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import { validateAndSaveLogo } from '../../utils/handleImages';

export const rechargeWalletRequest = async (req: Request, res: Response) => {
    const { paymentMethodId, amount, receiptImg } = req.body;
    const studentId = req.user?.id;

    if (!paymentMethodId || amount === undefined || amount === null || !receiptImg) {
        throw new BadRequest("Payment method, amount, and receipt image are required");
    }

    if (!studentId) {
        throw new UnauthorizedError("Student not logged in");
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new BadRequest("Amount must be greater than zero");
    }

    const [existingPaymentMethod] = await db
        .select({ id: paymentMethod.id, isActive: paymentMethod.isActive, type: paymentMethod.type })
        .from(paymentMethod)
        .where(eq(paymentMethod.id, paymentMethodId))
        .limit(1);

    if (!existingPaymentMethod) {
        throw new NotFound("Payment method not found");
    }

    if (!existingPaymentMethod.isActive) {
        throw new BadRequest("Payment method is not active");
    }

    const [student] = await db
        .select({ id: Student.id, parentphone: Student.parentphone })
        .from(Student)
        .where(eq(Student.id, studentId))
        .limit(1);

    if (!student) {
        throw new NotFound('Student not found');
    }

    if (!student.parentphone) {
        throw new NotFound("You don't have a parent account linked to your student account");
    }

    const [parent] = await db
        .select({ id: parents.id })
        .from(parents)
        .where(eq(parents.phoneNumber, student.parentphone))
        .limit(1);

    if (!parent) {
        throw new NotFound("You don't have a parent account linked to your student account");
    }

    const [existingWallet] = await db
        .select({ id: wallet.id })
        .from(wallet)
        .where(eq(wallet.studentId, studentId))
        .limit(1);

    if (!existingWallet) {
        throw new NotFound('Wallet not found');
    }

    const savedReceiptImg = await validateAndSaveLogo(req, receiptImg, 'payment_receipts');

    const Id = crypto.randomUUID();

    const [createdPayment] = await db.insert(payment).values({
        id: Id,
        amount: parsedAmount,
        paymentMethodId,
        studentId,
        parentId: parent.id,
        receiptImg: savedReceiptImg,
        source: 'student',
        purpose: 'wallet_recharge',
    });

    await db.insert(walletTransaction).values({
        walletId: existingWallet.id,
        paymentId: Id,
        amount: parsedAmount,
        type: "deposit",
        source: "Student"
    });
    
    return SuccessResponse(res, {
        message: 'Wallet recharge request created successfully',
    }, 201);
};

export const getWalletTransactions = async (req: Request, res: Response) => {
    const studentId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string | undefined)?.trim();

    if (!studentId) {
        throw new UnauthorizedError("Student not logged in");
    }

    const [existingWallet] = await db
        .select({ id: wallet.id })
        .from(wallet)
        .where(eq(wallet.studentId, studentId))
        .limit(1);

    if (!existingWallet) {
        throw new NotFound('Wallet not found');
    }

    const searchCondition = search
        ? or(
            like(walletTransaction.paymentId, `%${search}%`),
            like(walletTransaction.type, `%${search}%`),
            like(walletTransaction.source, `%${search}%`),
            like(payment.status, `%${search}%`),
            sql`cast(${walletTransaction.amount} as char) like ${`%${search}%`}`
        )
        : undefined;

    const whereCondition = and(
        eq(walletTransaction.walletId, existingWallet.id),
        eq(wallet.studentId, studentId),
        searchCondition,
    );

    const [totalTransactions] = await db
        .select({ count: count() })
        .from(walletTransaction)
        .innerJoin(wallet, eq(walletTransaction.walletId, wallet.id))
        .leftJoin(payment, eq(walletTransaction.paymentId, payment.id))
        .where(whereCondition);

    const total = totalTransactions.count;
    const totalPages = Math.ceil(total / limit);

    const transactions = await db
        .select({
            id: walletTransaction.id,
            amount: walletTransaction.amount,
            type: walletTransaction.type,
            source: walletTransaction.source,
            createdAt: walletTransaction.createdAt,
            paymentId: walletTransaction.paymentId,
            paymentStatus: payment.status,
            paymentReceiptImg: payment.receiptImg,
        })
        .from(walletTransaction)
        .innerJoin(wallet, eq(walletTransaction.walletId, wallet.id))
        .leftJoin(payment, eq(walletTransaction.paymentId, payment.id))
        .where(whereCondition)
        .orderBy(desc(walletTransaction.createdAt))
        .limit(limit)
        .offset(offset);

    return SuccessResponse(res, {
        message: 'Wallet transactions retrieved successfully',
        transactions,
        pagination: {
            total,
            page,
            limit,
            totalPages,
        },
    });
};