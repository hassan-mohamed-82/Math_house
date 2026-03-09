"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRechargeRequests = exports.replyToRechargeRequest = void 0;
const Errors_1 = require("../../Errors");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const replyToRechargeRequest = async (req, res) => {
    const { paymentId } = req.params;
    const { action } = req.body;
    if (!paymentId) {
        throw new Errors_1.BadRequest("Payment ID is required");
    }
    if (!action || !['approve', 'reject'].includes(action)) {
        throw new Errors_1.BadRequest("Action must be either 'approve' or 'reject'");
    }
    const [existingPayment] = await connection_1.db
        .select({ id: schema_1.payment.id, status: schema_1.payment.status, amount: schema_1.payment.amount, studentId: schema_1.payment.studentId })
        .from(schema_1.payment)
        .where((0, drizzle_orm_1.eq)(schema_1.payment.id, paymentId))
        .limit(1);
    if (!existingPayment) {
        throw new Errors_1.BadRequest("Payment request not found");
    }
    if (existingPayment.status !== 'pending') {
        throw new Errors_1.BadRequest("Only pending payment requests can be processed");
    }
    const newStatus = action === 'approve' ? 'completed' : 'rejected';
    await connection_1.db
        .update(schema_1.payment)
        .set({ status: newStatus })
        .where((0, drizzle_orm_1.eq)(schema_1.payment.id, paymentId));
    if (newStatus === 'completed') {
        const amountToAdd = existingPayment.amount;
        const studentId = existingPayment.studentId;
        if (!studentId) {
            throw new Errors_1.BadRequest("Associated student not found for this payment");
        }
        if (amountToAdd <= 0) {
            throw new Errors_1.BadRequest("Amount must be greater than zero to add to wallet");
        }
        const [existingWallet] = await connection_1.db
            .select()
            .from(schema_1.wallet)
            .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId))
            .limit(1);
        if (!existingWallet) {
            throw new Errors_1.BadRequest("Wallet not found for this student");
        }
        await connection_1.db.update(schema_1.wallet)
            .set({ balance: (0, drizzle_orm_1.sql) `${schema_1.wallet.balance} + ${amountToAdd}` })
            .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId));
    }
    return (0, response_1.SuccessResponse)(res, { message: `Payment request has been ${newStatus}` });
};
exports.replyToRechargeRequest = replyToRechargeRequest;
const getRechargeRequests = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();
    const searchCondition = search
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.payment.id, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.payment.studentId, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.firstname, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.lastname, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.nickname, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.email, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.phone, `%${search}%`))
        : undefined;
    const whereCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payment.purpose, 'wallet_recharge'), searchCondition);
    const [totalRechargeRequests] = await connection_1.db
        .select({ count: (0, drizzle_orm_1.count)() })
        .from(schema_1.payment)
        .leftJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.payment.studentId, schema_1.Student.id))
        .where(whereCondition);
    const total = totalRechargeRequests.count;
    const totalPages = Math.ceil(total / limit);
    const rechargeRequests = await connection_1.db
        .select({
        id: schema_1.payment.id,
        amount: schema_1.payment.amount,
        status: schema_1.payment.status,
        createdAt: schema_1.payment.createdAt,
        studentId: schema_1.payment.studentId,
        receiptImg: schema_1.payment.receiptImg,
        source: schema_1.payment.source,
        purpose: schema_1.payment.purpose,
        student: {
            id: schema_1.Student.id,
            firstname: schema_1.Student.firstname,
            lastname: schema_1.Student.lastname,
            nickname: schema_1.Student.nickname,
            email: schema_1.Student.email,
            phone: schema_1.Student.phone,
        },
    })
        .from(schema_1.payment)
        .leftJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.payment.studentId, schema_1.Student.id))
        .where(whereCondition)
        .limit(limit)
        .offset(offset)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.payment.createdAt));
    const groupedRechargeRequests = {
        pending: rechargeRequests.filter((request) => request.status === 'pending'),
        accepted: rechargeRequests.filter((request) => request.status === 'completed'),
        rejected: rechargeRequests.filter((request) => request.status === 'rejected'),
    };
    return (0, response_1.SuccessResponse)(res, {
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
exports.getRechargeRequests = getRechargeRequests;
