"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletTransactions = exports.rechargeWalletRequest = void 0;
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const handleImages_1 = require("../../utils/handleImages");
const rechargeWalletRequest = async (req, res) => {
    const { paymentMethodId, amount, receiptImg } = req.body;
    const studentId = req.user?.id;
    if (!paymentMethodId || amount === undefined || amount === null || !receiptImg) {
        throw new Errors_1.BadRequest("Payment method, amount, and receipt image are required");
    }
    if (!studentId) {
        throw new Errors_1.UnauthorizedError("Student not logged in");
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Errors_1.BadRequest("Amount must be greater than zero");
    }
    const [existingPaymentMethod] = await connection_1.db
        .select({ id: schema_1.paymentMethod.id, isActive: schema_1.paymentMethod.isActive, type: schema_1.paymentMethod.type })
        .from(schema_1.paymentMethod)
        .where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, paymentMethodId))
        .limit(1);
    if (!existingPaymentMethod) {
        throw new Errors_1.NotFound("Payment method not found");
    }
    if (!existingPaymentMethod.isActive) {
        throw new Errors_1.BadRequest("Payment method is not active");
    }
    const [student] = await connection_1.db
        .select({ id: schema_1.Student.id, parentphone: schema_1.Student.parentphone })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId))
        .limit(1);
    if (!student) {
        throw new Errors_1.NotFound('Student not found');
    }
    if (!student.parentphone) {
        throw new Errors_1.NotFound("You don't have a parent account linked to your student account");
    }
    const [parent] = await connection_1.db
        .select({ id: schema_1.parents.id })
        .from(schema_1.parents)
        .where((0, drizzle_orm_1.eq)(schema_1.parents.phoneNumber, student.parentphone))
        .limit(1);
    if (!parent) {
        throw new Errors_1.NotFound("You don't have a parent account linked to your student account");
    }
    const [existingWallet] = await connection_1.db
        .select({ id: schema_1.wallet.id })
        .from(schema_1.wallet)
        .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId))
        .limit(1);
    if (!existingWallet) {
        throw new Errors_1.NotFound('Wallet not found');
    }
    const savedReceiptImg = await (0, handleImages_1.validateAndSaveLogo)(req, receiptImg, 'payment_receipts');
    const Id = crypto.randomUUID();
    const [createdPayment] = await connection_1.db.insert(schema_1.payment).values({
        id: Id,
        amount: parsedAmount,
        paymentMethodId,
        studentId,
        parentId: parent.id,
        receiptImg: savedReceiptImg,
        source: 'student',
        purpose: 'wallet_recharge',
    });
    await connection_1.db.insert(schema_1.walletTransaction).values({
        walletId: existingWallet.id,
        paymentId: Id,
        amount: parsedAmount,
        type: "deposit",
        source: "Student"
    });
    return (0, response_1.SuccessResponse)(res, {
        message: 'Wallet recharge request created successfully',
    }, 201);
};
exports.rechargeWalletRequest = rechargeWalletRequest;
const getWalletTransactions = async (req, res) => {
    const studentId = req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();
    if (!studentId) {
        throw new Errors_1.UnauthorizedError("Student not logged in");
    }
    const [existingWallet] = await connection_1.db
        .select({ id: schema_1.wallet.id })
        .from(schema_1.wallet)
        .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId))
        .limit(1);
    if (!existingWallet) {
        throw new Errors_1.NotFound('Wallet not found');
    }
    const searchCondition = search
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.walletTransaction.paymentId, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.walletTransaction.type, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.walletTransaction.source, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.payment.status, `%${search}%`), (0, drizzle_orm_1.sql) `cast(${schema_1.walletTransaction.amount} as char) like ${`%${search}%`}`)
        : undefined;
    const whereCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.walletTransaction.walletId, existingWallet.id), (0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId), searchCondition);
    const [totalTransactions] = await connection_1.db
        .select({ count: (0, drizzle_orm_1.count)() })
        .from(schema_1.walletTransaction)
        .innerJoin(schema_1.wallet, (0, drizzle_orm_1.eq)(schema_1.walletTransaction.walletId, schema_1.wallet.id))
        .leftJoin(schema_1.payment, (0, drizzle_orm_1.eq)(schema_1.walletTransaction.paymentId, schema_1.payment.id))
        .where(whereCondition);
    const total = totalTransactions.count;
    const totalPages = Math.ceil(total / limit);
    const transactions = await connection_1.db
        .select({
        id: schema_1.walletTransaction.id,
        amount: schema_1.walletTransaction.amount,
        type: schema_1.walletTransaction.type,
        source: schema_1.walletTransaction.source,
        createdAt: schema_1.walletTransaction.createdAt,
        paymentId: schema_1.walletTransaction.paymentId,
        paymentStatus: schema_1.payment.status,
        paymentReceiptImg: schema_1.payment.receiptImg,
    })
        .from(schema_1.walletTransaction)
        .innerJoin(schema_1.wallet, (0, drizzle_orm_1.eq)(schema_1.walletTransaction.walletId, schema_1.wallet.id))
        .leftJoin(schema_1.payment, (0, drizzle_orm_1.eq)(schema_1.walletTransaction.paymentId, schema_1.payment.id))
        .where(whereCondition)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.walletTransaction.createdAt))
        .limit(limit)
        .offset(offset);
    return (0, response_1.SuccessResponse)(res, {
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
exports.getWalletTransactions = getWalletTransactions;
