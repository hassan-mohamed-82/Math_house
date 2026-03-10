import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { BadRequest, NotFound, UnauthorizedError } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { db } from '../../models/connection';
import { parents, payment, paymentMethod, Student, wallet, walletTransaction } from '../../models/schema';
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import { validateAndSaveLogo } from '../../utils/handleImages';
import { createPaymobCheckoutSession, extractPaymobCallbackPayload, verifyPaymobHmac } from '../../utils/paymob';
import { creditPackageBalance } from './payment';

const getAuthenticatedStudentId = (req: Request) => {
    const studentId = req.user?.id;

    if (!studentId) {
        throw new UnauthorizedError('Student not logged in');
    }

    return studentId;
};

const getStudentForWalletRecharge = async (studentId: string) => {
    const [student] = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            email: Student.email,
            phone: Student.phone,
            parentphone: Student.parentphone,
        })
        .from(Student)
        .where(eq(Student.id, studentId))
        .limit(1);

    if (!student) {
        throw new NotFound('Student not found');
    }

    return student;
};

const getLinkedParentId = async (parentPhone: string | null) => {
    if (!parentPhone) {
        return null;
    }

    const [parent] = await db
        .select({ id: parents.id })
        .from(parents)
        .where(eq(parents.phoneNumber, parentPhone))
        .limit(1);

    return parent?.id ?? null;
};

const ensureWalletExists = async (studentId: string) => {
    const [existingWallet] = await db
        .select({ id: wallet.id, balance: wallet.balance })
        .from(wallet)
        .where(eq(wallet.studentId, studentId))
        .limit(1);

    if (existingWallet) {
        return existingWallet;
    }

    await db.insert(wallet).values({
        studentId,
        balance: 0,
    });

    const [createdWallet] = await db
        .select({ id: wallet.id, balance: wallet.balance })
        .from(wallet)
        .where(eq(wallet.studentId, studentId))
        .limit(1);

    if (!createdWallet) {
        throw new NotFound('Wallet not found');
    }

    return createdWallet;
};

const creditWalletForPayment = async (paymentId: string, studentId: string, amount: number) => {
    const studentWallet = await ensureWalletExists(studentId);

    const [existingTransaction] = await db
        .select({ id: walletTransaction.id })
        .from(walletTransaction)
        .where(eq(walletTransaction.paymentId, paymentId))
        .limit(1);

    if (existingTransaction) {
        return { alreadyProcessed: true, walletId: studentWallet.id };
    }

    await db
        .update(wallet)
        .set({ balance: sql`${wallet.balance} + ${amount}` })
        .where(eq(wallet.id, studentWallet.id));

    await db.insert(walletTransaction).values({
        walletId: studentWallet.id,
        paymentId,
        amount,
        type: 'deposit',
        source: 'Student',
    });

    return { alreadyProcessed: false, walletId: studentWallet.id };
};

export const rechargeWalletRequest = async (req: Request, res: Response) => {
    const { paymentMethodId, amount, receiptImg } = req.body;
    const studentId = getAuthenticatedStudentId(req);

    if (!paymentMethodId || amount === undefined || amount === null || !receiptImg) {
        throw new BadRequest("Payment method, amount, and receipt image are required");
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

    if (existingPaymentMethod.type !== 'Manual') {
        throw new BadRequest('Use the automatic recharge endpoint for automatic payment methods');
    }

    const student = await getStudentForWalletRecharge(studentId);

    const parentId = await getLinkedParentId(student.parentphone);

    if (!parentId) {
        throw new NotFound("You don't have a parent account linked to your student account");
    }

    const savedReceiptImg = await validateAndSaveLogo(req, receiptImg, 'payment_receipts');

    await db.insert(payment).values({
        id: randomUUID(),
        amount: parsedAmount,
        paymentMethodId,
        studentId,
        parentId,
        receiptImg: savedReceiptImg,
        source: 'student',
        purpose: 'wallet_recharge',
    });
    
    return SuccessResponse(res, {
        message: 'Wallet recharge request created successfully',
    }, 201);
};

export const initiateAutomaticWalletRecharge = async (req: Request, res: Response) => {
    const { paymentMethodId, amount } = req.body;
    const studentId = getAuthenticatedStudentId(req);

    if (!paymentMethodId || amount === undefined || amount === null) {
        throw new BadRequest('Payment method and amount are required');
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new BadRequest('Amount must be greater than zero');
    }

    const [existingPaymentMethod] = await db
        .select({
            id: paymentMethod.id,
            name: paymentMethod.name,
            isActive: paymentMethod.isActive,
            type: paymentMethod.type,
        })
        .from(paymentMethod)
        .where(eq(paymentMethod.id, paymentMethodId))
        .limit(1);

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

    const student = await getStudentForWalletRecharge(studentId);
    const parentId = await getLinkedParentId(student.parentphone);
    const paymentId = randomUUID();

    await db.insert(payment).values({
        id: paymentId,
        amount: parsedAmount,
        paymentMethodId,
        studentId,
        parentId,
        source: 'student',
        purpose: 'wallet_recharge',
    });

    try {
        const checkoutSession = await createPaymobCheckoutSession({
            amountCents: Math.round(parsedAmount * 100),
            merchantOrderId: paymentId,
            student,
        });

        return SuccessResponse(res, {
            message: 'Automatic payment session created successfully',
            paymentId,
            paymentMethod: existingPaymentMethod.name,
            checkoutUrl: checkoutSession.checkoutUrl,
            iframeUrl: checkoutSession.iframeUrl,
            paymobOrderId: checkoutSession.paymobOrderId,
            callbackUrl: checkoutSession.callbackUrl,
        }, 201);
    } catch (error: any) {
        await db.delete(payment).where(eq(payment.id, paymentId));
        throw new BadRequest(error?.message || 'Failed to initialize automatic payment');
    }
};

export const handlePaymobCallback = async (req: Request, res: Response) => {
    const rawPayload = req.method === 'GET' ? req.query : req.body;
    const callbackPayload = extractPaymobCallbackPayload(rawPayload as Record<string, any>);
    const receivedHmac = String((rawPayload as Record<string, any>)?.hmac || '');

    if (!verifyPaymobHmac(callbackPayload, receivedHmac)) {
        throw new UnauthorizedError('Invalid Paymob callback signature');
    }

    const merchantOrderId = String(
        callbackPayload.order?.merchant_order_id || callbackPayload.merchant_order_id || ''
    );
    const amountCents = Number(callbackPayload.amount_cents || 0);
    const wasSuccessful = String(callbackPayload.success).toLowerCase() === 'true';
    const isPending = String(callbackPayload.pending).toLowerCase() === 'true';

    if (!merchantOrderId) {
        throw new BadRequest('Invalid Paymob callback payload');
    }

    const [existingPayment] = await db
        .select({
            id: payment.id,
            amount: payment.amount,
            status: payment.status,
            studentId: payment.studentId,
            paymentMethodId: payment.paymentMethodId,
            purpose: payment.purpose,
            packageId: payment.packageId,
        })
        .from(payment)
        .where(eq(payment.id, merchantOrderId))
        .limit(1);

    if (!existingPayment) {
        throw new NotFound('Payment request not found');
    }

    const [existingPaymentMethod] = await db
        .select({ id: paymentMethod.id, type: paymentMethod.type, name: paymentMethod.name })
        .from(paymentMethod)
        .where(eq(paymentMethod.id, existingPayment.paymentMethodId))
        .limit(1);

    if (!existingPaymentMethod || existingPaymentMethod.type !== 'Automatic') {
        throw new BadRequest('Payment request is not configured for automatic payments');
    }

    if (amountCents && Math.round(existingPayment.amount * 100) !== amountCents) {
        throw new BadRequest('Payment amount mismatch');
    }

    if (existingPayment.status === 'completed') {
        return SuccessResponse(res, {
            message: 'Automatic payment already completed',
            paymentId: existingPayment.id,
            status: 'completed',
        });
    }

    if (isPending) {
        return SuccessResponse(res, {
            message: 'Payment is still pending',
            paymentId: existingPayment.id,
            status: existingPayment.status,
        });
    }

    if (!wasSuccessful) {
        await db
            .update(payment)
            .set({ status: 'rejected' })
            .where(eq(payment.id, existingPayment.id));

        return SuccessResponse(res, {
            message: 'Automatic payment was rejected',
            paymentId: existingPayment.id,
            status: 'rejected',
        });
    }

    if (!existingPayment.studentId) {
        throw new BadRequest('Associated student not found for this payment');
    }

    if (existingPayment.purpose === 'wallet_recharge') {
        await db
            .update(payment)
            .set({ status: 'completed' })
            .where(eq(payment.id, existingPayment.id));

        await creditWalletForPayment(existingPayment.id, existingPayment.studentId, existingPayment.amount);
    } else if (existingPayment.purpose === 'purchase') {
        if (!existingPayment.packageId) {
            throw new BadRequest('Associated package not found for this payment');
        }

        await db.transaction(async (tx) => {
            await tx
                .update(payment)
                .set({ status: 'completed' })
                .where(eq(payment.id, existingPayment.id));

            await creditPackageBalance(existingPayment.studentId!, existingPayment.packageId!, tx);
        });
    } else {
        throw new BadRequest('Unsupported payment purpose');
    }

    return SuccessResponse(res, {
        message: 'Automatic payment completed successfully',
        paymentId: existingPayment.id,
        status: 'completed',
    });
};

export const getWalletTransactions = async (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string | undefined)?.trim();

    const existingWallet = await ensureWalletExists(studentId);

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

export const getWalletBalance = async (req: Request, res: Response) => {
    const studentId = getAuthenticatedStudentId(req);
    const existingWallet = await ensureWalletExists(studentId);

    return SuccessResponse(res, {
        message: 'Wallet balance retrieved successfully',
        balance: existingWallet.balance,
    });
};