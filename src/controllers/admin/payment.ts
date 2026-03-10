import { Request, Response } from 'express';
import { BadRequest } from '../../Errors';
import { db } from '../../models/connection';
import { packages, payment, paymentMethod, Student, wallet, walletTransaction } from '../../models/schema';
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import { SuccessResponse } from '../../utils/response';

export const replyToRechargeRequest = async (req: Request, res: Response) => {
    const paymentId = req.params.paymentId || req.params.id;
    const { action } = req.body;

    if (!paymentId) {
        throw new BadRequest("Payment ID is required");
    }
    if (!action || !['approve', 'reject'].includes(action)) {
        throw new BadRequest("Action must be either 'approve' or 'reject'");
    }
    const [existingPayment] = await db
        .select({
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            studentId: payment.studentId,
            paymentMethodId: payment.paymentMethodId,
        })
        .from(payment)
        .where(eq(payment.id, paymentId))
        .limit(1);
    if (!existingPayment) {
        throw new BadRequest("Payment request not found");
    }

    const [existingPaymentMethod] = await db
        .select({ type: paymentMethod.type })
        .from(paymentMethod)
        .where(eq(paymentMethod.id, existingPayment.paymentMethodId))
        .limit(1);

    if (existingPaymentMethod?.type === 'Automatic') {
        throw new BadRequest('Automatic payments should be processed through the payment gateway callback');
    }

    if (existingPayment.status !== 'pending') {
        throw new BadRequest("Only pending payment requests can be processed");
    }

    const newStatus = action === 'approve' ? 'completed' : 'rejected';

    await db
        .update(payment)
        .set({ status: newStatus })
        .where(eq(payment.id, paymentId));

    if (newStatus === 'completed') {
        const amountToAdd = existingPayment.amount;
        const studentId = existingPayment.studentId;

        if (!studentId) {
            throw new BadRequest("Associated student not found for this payment");
        }

        if (amountToAdd <= 0) {
            throw new BadRequest("Amount must be greater than zero to add to wallet");
        }

        const [existingWallet] = await db
            .select()
            .from(wallet)
            .where(eq(wallet.studentId, studentId))
            .limit(1);

        if (!existingWallet) {
            throw new BadRequest("Wallet not found for this student");
        }

        await db.update(wallet)
            .set({ balance: sql`${wallet.balance} + ${amountToAdd}` })
            .where(eq(wallet.studentId, studentId));

        const [existingWalletTransaction] = await db
            .select({ id: walletTransaction.id })
            .from(walletTransaction)
            .where(eq(walletTransaction.paymentId, paymentId))
            .limit(1);

        if (!existingWalletTransaction) {
            await db.insert(walletTransaction).values({
                walletId: existingWallet.id,
                paymentId,
                amount: amountToAdd,
                type: 'deposit',
                source: 'Student'
            });
        }
    }
    return SuccessResponse(res, { message: `Payment request has been ${newStatus}` });
};

export const getRechargeRequests = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string | undefined)?.trim();

    const searchCondition = search
        ? or(
            like(payment.id, `%${search}%`),
            like(payment.studentId, `%${search}%`),
            like(Student.firstname, `%${search}%`),
            like(Student.lastname, `%${search}%`),
            like(Student.nickname, `%${search}%`),
            like(Student.email, `%${search}%`),
            like(Student.phone, `%${search}%`)
        )
        : undefined;

    const whereCondition = and(
        eq(payment.purpose, 'wallet_recharge'),
        searchCondition,
    );

    const [totalRechargeRequests] = await db
        .select({ count: count() })
        .from(payment)
        .leftJoin(Student, eq(payment.studentId, Student.id))
        .where(whereCondition);

    const total = totalRechargeRequests.count;
    const totalPages = Math.ceil(total / limit);

    const rechargeRequests = await db
        .select({
            id: payment.id,
            amount: payment.amount,
            status: payment.status,
            createdAt: payment.createdAt,
            studentId: payment.studentId,
            receiptImg: payment.receiptImg,
            source: payment.source,
            purpose: payment.purpose,
            student: {
                id: Student.id,
                firstname: Student.firstname,
                lastname: Student.lastname,
                nickname: Student.nickname,
                email: Student.email,
                phone: Student.phone,
            },
        })
        .from(payment)
        .leftJoin(Student, eq(payment.studentId, Student.id))
        .where(whereCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(payment.createdAt));

    const groupedRechargeRequests = {
        pending: rechargeRequests.filter((request) => request.status === 'pending'),
        accepted: rechargeRequests.filter((request) => request.status === 'completed'),
        rejected: rechargeRequests.filter((request) => request.status === 'rejected'),
    };

    return SuccessResponse(res, {
        message: "Recharge requests retrieved successfully",
        data: groupedRechargeRequests,
        pagination: {
            total,
            page,
            limit,
            totalPages,
        },
    });
};

export const replytoPackageBuyRequest = async (req: Request, res: Response) => {
    const paymentId = req.params.paymentId || req.params.id;
    const { action } = req.body;

    if (!paymentId) {
        throw new BadRequest("Payment ID is required");
    }

    if (!action || !['approve', 'reject'].includes(action)) {
        throw new BadRequest("Action must be either 'approve' or 'reject'");
    }

    const [existingPayment] = await db
        .select({
            id: payment.id,
            status: payment.status,
            studentId: payment.studentId,
            packageId: payment.packageId,
        })
        .from(payment)
        .where(eq(payment.id, paymentId))
        .limit(1);

    if (!existingPayment) {
        throw new BadRequest("Payment request not found");
    }

    if (existingPayment.status !== 'pending') {
        throw new BadRequest("Only pending payment requests can be processed");
    }

    const newStatus = action === 'approve' ? 'completed' : 'rejected';

    if (newStatus === 'rejected') {
        await db
            .update(payment)
            .set({ status: newStatus })
            .where(eq(payment.id, paymentId));

        return SuccessResponse(res, { message: `Payment request has been ${newStatus}` });
    }

    const existingPackageId = existingPayment.packageId;

    if (!existingPackageId) {
        throw new BadRequest("Associated package not found for this payment");
    }

    if (!existingPayment.studentId) {
        throw new BadRequest("Associated student not found for this payment");
    }

    const [existingPackage] = await db
        .select({
            type: packages.type,
            number: packages.number,
        })
        .from(packages)
        .where(eq(packages.id, existingPackageId))
        .limit(1);

    if (!existingPackage) {
        throw new BadRequest("Associated package not found");
    }

    const amountToAdd = existingPackage.number;
    const packageType = existingPackage.type;
    const studentId = existingPayment.studentId;

    if (amountToAdd <= 0) {
        throw new BadRequest("Package must include at least one number to be added to student's account");
    }

    await db.transaction(async (tx) => {
        await tx
            .update(payment)
            .set({ status: newStatus })
            .where(eq(payment.id, paymentId));

        switch (packageType) {
            case "live":
                await tx.update(Student)
                    .set({ livebalance: sql`${Student.livebalance} + ${amountToAdd}` })
                    .where(eq(Student.id, studentId));
                break;
            case "exam":
                await tx.update(Student)
                    .set({ exambalance: sql`${Student.exambalance} + ${amountToAdd}` })
                    .where(eq(Student.id, studentId));
                break;
            case "question":
                await tx.update(Student)
                    .set({ questionbalance: sql`${Student.questionbalance} + ${amountToAdd}` })
                    .where(eq(Student.id, studentId));
                break;
            default:
                throw new BadRequest("Invalid package type");
        }

    });

    return SuccessResponse(res, { message: "Package buy request approved successfully" });
};

export const getPackageBuyRequests = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string | undefined)?.trim();

    const searchCondition = search
        ? or(
            like(payment.studentId, `%${search}%`),
            like(Student.firstname, `%${search}%`),
            like(Student.lastname, `%${search}%`),
            like(Student.nickname, `%${search}%`),
            like(Student.email, `%${search}%`),
            like(Student.phone, `%${search}%`),
            like(packages.name, `%${search}%`)
        )
        : undefined;

    const whereCondition = and(
        eq(payment.purpose, 'purchase'),
        searchCondition,
    );

    const [totalPackageBuyRequests] = await db
        .select({ count: count() })
        .from(payment)
        .leftJoin(Student, eq(payment.studentId, Student.id))
        .leftJoin(packages, eq(payment.packageId, packages.id))
        .where(whereCondition);

    const total = totalPackageBuyRequests.count;
    const totalPages = Math.ceil(total / limit);

    const packageBuyRequests = await db
        .select({
            id: payment.id,
            amount: payment.amount,
            status: payment.status,
            createdAt: payment.createdAt,
            studentId: payment.studentId,
            receiptImg: payment.receiptImg,
            source: payment.source,
            purpose: payment.purpose,
            packageId: payment.packageId,
            student: {
                id: Student.id,
                firstname: Student.firstname,
                lastname: Student.lastname,
                nickname: Student.nickname,
                email: Student.email,
                phone: Student.phone,
            },
            package: {
                id: packages.id,
                name: packages.name,
                type: packages.type,
                number: packages.number,
                price: packages.price,
            },
        })
        .from(payment)
        .leftJoin(Student, eq(payment.studentId, Student.id))
        .leftJoin(packages, eq(payment.packageId, packages.id))
        .where(whereCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(payment.createdAt));

    const groupedPackageBuyRequests = {
        pending: packageBuyRequests.filter((request) => request.status === 'pending'),
        accepted: packageBuyRequests.filter((request) => request.status === 'completed'),
        rejected: packageBuyRequests.filter((request) => request.status === 'rejected'),
    };

    return SuccessResponse(res, {
        message: "Package buy requests retrieved successfully",
        data: groupedPackageBuyRequests,
        pagination: {
            total,
            page,
            limit,
            totalPages,
        },
    });
};