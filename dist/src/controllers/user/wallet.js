"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletTransactions = exports.handlePaymobCallback = exports.initiateAutomaticWalletRecharge = exports.rechargeWalletRequest = void 0;
const crypto_1 = require("crypto");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const handleImages_1 = require("../../utils/handleImages");
const paymob_1 = require("../../utils/paymob");
const getAuthenticatedStudentId = (req) => {
    const studentId = req.user?.id;
    if (!studentId) {
        throw new Errors_1.UnauthorizedError('Student not logged in');
    }
    return studentId;
};
const getStudentForWalletRecharge = async (studentId) => {
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        parentphone: schema_1.Student.parentphone,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId))
        .limit(1);
    if (!student) {
        throw new Errors_1.NotFound('Student not found');
    }
    return student;
};
const getLinkedParentId = async (parentPhone) => {
    if (!parentPhone) {
        return null;
    }
    const [parent] = await connection_1.db
        .select({ id: schema_1.parents.id })
        .from(schema_1.parents)
        .where((0, drizzle_orm_1.eq)(schema_1.parents.phoneNumber, parentPhone))
        .limit(1);
    return parent?.id ?? null;
};
const ensureWalletExists = async (studentId) => {
    const [existingWallet] = await connection_1.db
        .select({ id: schema_1.wallet.id })
        .from(schema_1.wallet)
        .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId))
        .limit(1);
    if (existingWallet) {
        return existingWallet;
    }
    await connection_1.db.insert(schema_1.wallet).values({
        studentId,
        balance: 0,
    });
    const [createdWallet] = await connection_1.db
        .select({ id: schema_1.wallet.id })
        .from(schema_1.wallet)
        .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId))
        .limit(1);
    if (!createdWallet) {
        throw new Errors_1.NotFound('Wallet not found');
    }
    return createdWallet;
};
const creditWalletForPayment = async (paymentId, studentId, amount) => {
    const studentWallet = await ensureWalletExists(studentId);
    const [existingTransaction] = await connection_1.db
        .select({ id: schema_1.walletTransaction.id })
        .from(schema_1.walletTransaction)
        .where((0, drizzle_orm_1.eq)(schema_1.walletTransaction.paymentId, paymentId))
        .limit(1);
    if (existingTransaction) {
        return { alreadyProcessed: true, walletId: studentWallet.id };
    }
    await connection_1.db
        .update(schema_1.wallet)
        .set({ balance: (0, drizzle_orm_1.sql) `${schema_1.wallet.balance} + ${amount}` })
        .where((0, drizzle_orm_1.eq)(schema_1.wallet.id, studentWallet.id));
    await connection_1.db.insert(schema_1.walletTransaction).values({
        walletId: studentWallet.id,
        paymentId,
        amount,
        type: 'deposit',
        source: 'Student',
    });
    return { alreadyProcessed: false, walletId: studentWallet.id };
};
const rechargeWalletRequest = async (req, res) => {
    const { paymentMethodId, amount, receiptImg } = req.body;
    const studentId = getAuthenticatedStudentId(req);
    if (!paymentMethodId || amount === undefined || amount === null || !receiptImg) {
        throw new Errors_1.BadRequest("Payment method, amount, and receipt image are required");
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
    if (existingPaymentMethod.type !== 'Manual') {
        throw new Errors_1.BadRequest('Use the automatic recharge endpoint for automatic payment methods');
    }
    const student = await getStudentForWalletRecharge(studentId);
    const parentId = await getLinkedParentId(student.parentphone);
    if (!parentId) {
        throw new Errors_1.NotFound("You don't have a parent account linked to your student account");
    }
    const savedReceiptImg = await (0, handleImages_1.validateAndSaveLogo)(req, receiptImg, 'payment_receipts');
    await connection_1.db.insert(schema_1.payment).values({
        id: (0, crypto_1.randomUUID)(),
        amount: parsedAmount,
        paymentMethodId,
        studentId,
        parentId,
        receiptImg: savedReceiptImg,
        source: 'student',
        purpose: 'wallet_recharge',
    });
    return (0, response_1.SuccessResponse)(res, {
        message: 'Wallet recharge request created successfully',
    }, 201);
};
exports.rechargeWalletRequest = rechargeWalletRequest;
const initiateAutomaticWalletRecharge = async (req, res) => {
    const { paymentMethodId, amount } = req.body;
    const studentId = getAuthenticatedStudentId(req);
    if (!paymentMethodId || amount === undefined || amount === null) {
        throw new Errors_1.BadRequest('Payment method and amount are required');
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Errors_1.BadRequest('Amount must be greater than zero');
    }
    const [existingPaymentMethod] = await connection_1.db
        .select({
        id: schema_1.paymentMethod.id,
        name: schema_1.paymentMethod.name,
        isActive: schema_1.paymentMethod.isActive,
        type: schema_1.paymentMethod.type,
    })
        .from(schema_1.paymentMethod)
        .where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, paymentMethodId))
        .limit(1);
    if (!existingPaymentMethod) {
        throw new Errors_1.NotFound('Payment method not found');
    }
    if (!existingPaymentMethod.isActive) {
        throw new Errors_1.BadRequest('Payment method is not active');
    }
    if (existingPaymentMethod.type !== 'Automatic') {
        throw new Errors_1.BadRequest('Selected payment method is not an automatic payment method');
    }
    if (existingPaymentMethod.name.toLowerCase() !== 'paymob') {
        throw new Errors_1.BadRequest('Automatic payments are currently available only through Paymob');
    }
    const student = await getStudentForWalletRecharge(studentId);
    const parentId = await getLinkedParentId(student.parentphone);
    const paymentId = (0, crypto_1.randomUUID)();
    await connection_1.db.insert(schema_1.payment).values({
        id: paymentId,
        amount: parsedAmount,
        paymentMethodId,
        studentId,
        parentId,
        source: 'student',
        purpose: 'wallet_recharge',
    });
    try {
        const checkoutSession = await (0, paymob_1.createPaymobCheckoutSession)({
            amountCents: Math.round(parsedAmount * 100),
            merchantOrderId: paymentId,
            student,
        });
        return (0, response_1.SuccessResponse)(res, {
            message: 'Automatic payment session created successfully',
            paymentId,
            paymentMethod: existingPaymentMethod.name,
            checkoutUrl: checkoutSession.checkoutUrl,
            iframeUrl: checkoutSession.iframeUrl,
            paymobOrderId: checkoutSession.paymobOrderId,
            callbackUrl: checkoutSession.callbackUrl,
        }, 201);
    }
    catch (error) {
        await connection_1.db.delete(schema_1.payment).where((0, drizzle_orm_1.eq)(schema_1.payment.id, paymentId));
        throw new Errors_1.BadRequest(error?.message || 'Failed to initialize automatic payment');
    }
};
exports.initiateAutomaticWalletRecharge = initiateAutomaticWalletRecharge;
const handlePaymobCallback = async (req, res) => {
    const rawPayload = req.method === 'GET' ? req.query : req.body;
    const callbackPayload = (0, paymob_1.extractPaymobCallbackPayload)(rawPayload);
    const receivedHmac = String(rawPayload?.hmac || '');
    if (!(0, paymob_1.verifyPaymobHmac)(callbackPayload, receivedHmac)) {
        throw new Errors_1.UnauthorizedError('Invalid Paymob callback signature');
    }
    const merchantOrderId = String(callbackPayload.order?.merchant_order_id || callbackPayload.merchant_order_id || '');
    const amountCents = Number(callbackPayload.amount_cents || 0);
    const wasSuccessful = String(callbackPayload.success).toLowerCase() === 'true';
    const isPending = String(callbackPayload.pending).toLowerCase() === 'true';
    if (!merchantOrderId) {
        throw new Errors_1.BadRequest('Invalid Paymob callback payload');
    }
    const [existingPayment] = await connection_1.db
        .select({
        id: schema_1.payment.id,
        amount: schema_1.payment.amount,
        status: schema_1.payment.status,
        studentId: schema_1.payment.studentId,
        paymentMethodId: schema_1.payment.paymentMethodId,
    })
        .from(schema_1.payment)
        .where((0, drizzle_orm_1.eq)(schema_1.payment.id, merchantOrderId))
        .limit(1);
    if (!existingPayment) {
        throw new Errors_1.NotFound('Payment request not found');
    }
    const [existingPaymentMethod] = await connection_1.db
        .select({ id: schema_1.paymentMethod.id, type: schema_1.paymentMethod.type, name: schema_1.paymentMethod.name })
        .from(schema_1.paymentMethod)
        .where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, existingPayment.paymentMethodId))
        .limit(1);
    if (!existingPaymentMethod || existingPaymentMethod.type !== 'Automatic') {
        throw new Errors_1.BadRequest('Payment request is not configured for automatic payments');
    }
    if (amountCents && Math.round(existingPayment.amount * 100) !== amountCents) {
        throw new Errors_1.BadRequest('Payment amount mismatch');
    }
    if (isPending) {
        return (0, response_1.SuccessResponse)(res, {
            message: 'Payment is still pending',
            paymentId: existingPayment.id,
            status: existingPayment.status,
        });
    }
    if (!wasSuccessful) {
        await connection_1.db
            .update(schema_1.payment)
            .set({ status: 'rejected' })
            .where((0, drizzle_orm_1.eq)(schema_1.payment.id, existingPayment.id));
        return (0, response_1.SuccessResponse)(res, {
            message: 'Automatic payment was rejected',
            paymentId: existingPayment.id,
            status: 'rejected',
        });
    }
    if (!existingPayment.studentId) {
        throw new Errors_1.BadRequest('Associated student not found for this payment');
    }
    await connection_1.db
        .update(schema_1.payment)
        .set({ status: 'completed' })
        .where((0, drizzle_orm_1.eq)(schema_1.payment.id, existingPayment.id));
    await creditWalletForPayment(existingPayment.id, existingPayment.studentId, existingPayment.amount);
    return (0, response_1.SuccessResponse)(res, {
        message: 'Automatic payment completed successfully',
        paymentId: existingPayment.id,
        status: 'completed',
    });
};
exports.handlePaymobCallback = handlePaymobCallback;
const getWalletTransactions = async (req, res) => {
    const studentId = getAuthenticatedStudentId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();
    const existingWallet = await ensureWalletExists(studentId);
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
