import { Request, Response } from 'express';
import { BadRequest } from '../../Errors';
import { db } from '../../models/connection';
import { payment, Student, wallet, walletTransaction } from '../../models/schema';
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import { SuccessResponse } from '../../utils/response';

export const replyToRechargeRequest = async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const { action } = req.body;

    if (!paymentId) {
        throw new BadRequest("Payment ID is required");
    }
    if (!action || !['approve', 'reject'].includes(action)) {
        throw new BadRequest("Action must be either 'approve' or 'reject'");
    }
    const [existingPayment] = await db
        .select({ id: payment.id, status: payment.status, amount: payment.amount , studentId: payment.studentId})
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