"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyToContentBuyRequest = exports.getContentBuyRequests = exports.getPackageBuyRequests = exports.replytoPackageBuyRequest = exports.getRechargeRequests = exports.replyToRechargeRequest = void 0;
const Errors_1 = require("../../Errors");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const prices_1 = require("../../models/schema/admin/prices");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const sendEmails_1 = require("../../utils/sendEmails");
const replyToRechargeRequest = async (req, res) => {
    const paymentId = req.params.paymentId || req.params.id;
    const { action, reason } = req.body;
    if (!paymentId) {
        throw new Errors_1.BadRequest("Payment ID is required");
    }
    if (!action || !['approve', 'reject'].includes(action)) {
        throw new Errors_1.BadRequest("Action must be either 'approve' or 'reject'");
    }
    const [existingPayment] = await connection_1.db
        .select({
        id: schema_1.payment.id,
        status: schema_1.payment.status,
        amount: schema_1.payment.amount,
        studentId: schema_1.payment.studentId,
        paymentMethodId: schema_1.payment.paymentMethodId,
    })
        .from(schema_1.payment)
        .where((0, drizzle_orm_1.eq)(schema_1.payment.id, paymentId))
        .limit(1);
    if (!existingPayment) {
        throw new Errors_1.BadRequest("Payment request not found");
    }
    const [existingPaymentMethod] = await connection_1.db
        .select({ type: schema_1.paymentMethod.type })
        .from(schema_1.paymentMethod)
        .where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, existingPayment.paymentMethodId))
        .limit(1);
    if (existingPaymentMethod?.type === 'Automatic') {
        throw new Errors_1.BadRequest('Automatic payments should be processed through the payment gateway callback');
    }
    if (existingPayment.status !== 'pending') {
        throw new Errors_1.BadRequest("Only pending payment requests can be processed");
    }
    const newStatus = action === 'approve' ? 'completed' : 'rejected';
    await connection_1.db
        .update(schema_1.payment)
        .set({ status: newStatus, reason: reason || null })
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
        const [existingWalletTransaction] = await connection_1.db
            .select({ id: schema_1.walletTransaction.id })
            .from(schema_1.walletTransaction)
            .where((0, drizzle_orm_1.eq)(schema_1.walletTransaction.paymentId, paymentId))
            .limit(1);
        if (!existingWalletTransaction) {
            await connection_1.db.insert(schema_1.walletTransaction).values({
                walletId: existingWallet.id,
                paymentId,
                amount: amountToAdd,
                type: 'deposit',
                source: 'Student'
            });
        }
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
        reason: schema_1.payment.reason,
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
const replytoPackageBuyRequest = async (req, res) => {
    const paymentId = req.params.paymentId || req.params.id;
    const { action, reason } = req.body;
    if (!paymentId) {
        throw new Errors_1.BadRequest("Payment ID is required");
    }
    if (!action || !['approve', 'reject'].includes(action)) {
        throw new Errors_1.BadRequest("Action must be either 'approve' or 'reject'");
    }
    const [existingPayment] = await connection_1.db
        .select({
        id: schema_1.payment.id,
        status: schema_1.payment.status,
        studentId: schema_1.payment.studentId,
        packageId: schema_1.payment.packageId,
        promoCodeId: schema_1.payment.promoCodeId,
    })
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
    if (newStatus === 'rejected') {
        await connection_1.db
            .update(schema_1.payment)
            .set({ status: newStatus, reason })
            .where((0, drizzle_orm_1.eq)(schema_1.payment.id, paymentId));
        // Notify student of rejection
        if (existingPayment.studentId) {
            const [student] = await connection_1.db
                .select({ email: schema_1.Student.email, firstname: schema_1.Student.firstname })
                .from(schema_1.Student)
                .where((0, drizzle_orm_1.eq)(schema_1.Student.id, existingPayment.studentId));
            if (student && student.email) {
                const reasonHtml = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : '';
                await (0, sendEmails_1.sendEmail)({
                    to: student.email,
                    subject: "Package Purchase Request Rejected",
                    html: `<h1>Purchase Request Rejected</h1><p>Hello ${student.firstname || 'Student'},</p><p>Unfortunately, your package purchase request has been rejected.</p>${reasonHtml}<p>Please contact support if you have any questions or try submitting a new request.</p>`
                }).catch(console.error);
            }
        }
        return (0, response_1.SuccessResponse)(res, { message: `Payment request has been ${newStatus}` });
    }
    const existingPackageId = existingPayment.packageId;
    if (!existingPackageId) {
        throw new Errors_1.BadRequest("Associated package not found for this payment");
    }
    if (!existingPayment.studentId) {
        throw new Errors_1.BadRequest("Associated student not found for this payment");
    }
    const [existingPackage] = await connection_1.db
        .select({
        type: schema_1.packages.type,
        number: schema_1.packages.number,
    })
        .from(schema_1.packages)
        .where((0, drizzle_orm_1.eq)(schema_1.packages.id, existingPackageId))
        .limit(1);
    if (!existingPackage) {
        throw new Errors_1.BadRequest("Associated package not found");
    }
    const amountToAdd = existingPackage.number;
    const packageType = existingPackage.type;
    const studentId = existingPayment.studentId;
    if (amountToAdd <= 0) {
        throw new Errors_1.BadRequest("Package must include at least one number to be added to student's account");
    }
    await connection_1.db.transaction(async (tx) => {
        await tx
            .update(schema_1.payment)
            .set({ status: newStatus, reason: reason || null })
            .where((0, drizzle_orm_1.eq)(schema_1.payment.id, paymentId));
        if (action === 'approve' && existingPayment.promoCodeId && existingPayment.studentId) {
            await tx.insert(schema_1.promoCodesUsers).values({
                promoCodeId: existingPayment.promoCodeId,
                userId: existingPayment.studentId,
            });
        }
        switch (packageType) {
            case "live":
                await tx.update(schema_1.Student)
                    .set({ livebalance: (0, drizzle_orm_1.sql) `${schema_1.Student.livebalance} + ${amountToAdd}` })
                    .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
                break;
            case "exam":
                await tx.update(schema_1.Student)
                    .set({ exambalance: (0, drizzle_orm_1.sql) `${schema_1.Student.exambalance} + ${amountToAdd}` })
                    .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
                break;
            case "question":
                await tx.update(schema_1.Student)
                    .set({ questionbalance: (0, drizzle_orm_1.sql) `${schema_1.Student.questionbalance} + ${amountToAdd}` })
                    .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
                break;
            default:
                throw new Errors_1.BadRequest("Invalid package type");
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Package buy request approved successfully" });
};
exports.replytoPackageBuyRequest = replytoPackageBuyRequest;
const getPackageBuyRequests = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();
    const searchCondition = search
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.payment.studentId, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.firstname, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.lastname, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.nickname, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.email, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.phone, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.packages.name, `%${search}%`))
        : undefined;
    const whereCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payment.purpose, 'purchase'), (0, drizzle_orm_1.isNotNull)(schema_1.payment.packageId), searchCondition);
    const [totalPackageBuyRequests] = await connection_1.db
        .select({ count: (0, drizzle_orm_1.count)() })
        .from(schema_1.payment)
        .leftJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.payment.studentId, schema_1.Student.id))
        .leftJoin(schema_1.packages, (0, drizzle_orm_1.eq)(schema_1.payment.packageId, schema_1.packages.id))
        .where(whereCondition);
    const total = totalPackageBuyRequests.count;
    const totalPages = Math.ceil(total / limit);
    const packageBuyRequests = await connection_1.db
        .select({
        id: schema_1.payment.id,
        amount: schema_1.payment.amount,
        status: schema_1.payment.status,
        createdAt: schema_1.payment.createdAt,
        studentId: schema_1.payment.studentId,
        receiptImg: schema_1.payment.receiptImg,
        source: schema_1.payment.source,
        purpose: schema_1.payment.purpose,
        packageId: schema_1.payment.packageId,
        reason: schema_1.payment.reason,
        student: {
            id: schema_1.Student.id,
            firstname: schema_1.Student.firstname,
            lastname: schema_1.Student.lastname,
            nickname: schema_1.Student.nickname,
            email: schema_1.Student.email,
            phone: schema_1.Student.phone,
        },
        package: {
            id: schema_1.packages.id,
            name: schema_1.packages.name,
            type: schema_1.packages.type,
            number: schema_1.packages.number,
            price: schema_1.packages.price,
        },
    })
        .from(schema_1.payment)
        .leftJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.payment.studentId, schema_1.Student.id))
        .leftJoin(schema_1.packages, (0, drizzle_orm_1.eq)(schema_1.payment.packageId, schema_1.packages.id))
        .where(whereCondition)
        .limit(limit)
        .offset(offset)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.payment.createdAt));
    const groupedPackageBuyRequests = {
        pending: packageBuyRequests.filter((request) => request.status === 'pending'),
        accepted: packageBuyRequests.filter((request) => request.status === 'completed'),
        rejected: packageBuyRequests.filter((request) => request.status === 'rejected'),
    };
    return (0, response_1.SuccessResponse)(res, {
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
exports.getPackageBuyRequests = getPackageBuyRequests;
const getContentBuyRequests = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();
    const searchCondition = search
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.payment.studentId, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.firstname, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.lastname, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.nickname, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.email, `%${search}%`), (0, drizzle_orm_1.like)(schema_1.Student.phone, `%${search}%`))
        : undefined;
    const whereCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payment.purpose, 'purchase'), (0, drizzle_orm_1.isNull)(schema_1.payment.packageId), searchCondition);
    const [totalContentBuyRequests] = await connection_1.db
        .select({ count: (0, drizzle_orm_1.count)() })
        .from(schema_1.payment)
        .leftJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.payment.studentId, schema_1.Student.id))
        .where(whereCondition);
    const total = totalContentBuyRequests.count;
    const totalPages = Math.ceil(total / limit);
    const contentBuyRequests = await connection_1.db
        .select({
        id: schema_1.payment.id,
        amount: schema_1.payment.amount,
        status: schema_1.payment.status,
        createdAt: schema_1.payment.createdAt,
        studentId: schema_1.payment.studentId,
        receiptImg: schema_1.payment.receiptImg,
        source: schema_1.payment.source,
        purpose: schema_1.payment.purpose,
        reason: schema_1.payment.reason,
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
    const groupedContentBuyRequests = {
        pending: contentBuyRequests.filter((request) => request.status === 'pending'),
        accepted: contentBuyRequests.filter((request) => request.status === 'completed'),
        rejected: contentBuyRequests.filter((request) => request.status === 'rejected'),
    };
    return (0, response_1.SuccessResponse)(res, {
        message: "Content buy requests retrieved successfully",
        data: groupedContentBuyRequests,
        pagination: {
            total,
            page,
            limit,
            totalPages,
        },
    });
};
exports.getContentBuyRequests = getContentBuyRequests;
const replyToContentBuyRequest = async (req, res) => {
    const paymentId = req.params.paymentId || req.params.id;
    const { action, reason } = req.body;
    if (!paymentId) {
        throw new Errors_1.BadRequest("Payment ID is required");
    }
    if (!action || !['approve', 'reject'].includes(action)) {
        throw new Errors_1.BadRequest("Action must be either 'approve' or 'reject'");
    }
    const [existingPayment] = await connection_1.db
        .select({
        id: schema_1.payment.id,
        status: schema_1.payment.status,
        studentId: schema_1.payment.studentId,
        promoCodeId: schema_1.payment.promoCodeId,
    })
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
    await connection_1.db.transaction(async (tx) => {
        await tx
            .update(schema_1.payment)
            .set({ status: newStatus, reason: reason || null })
            .where((0, drizzle_orm_1.eq)(schema_1.payment.id, paymentId));
        if (action === 'approve') {
            if (existingPayment.promoCodeId && existingPayment.studentId) {
                await tx.insert(schema_1.promoCodesUsers).values({
                    promoCodeId: existingPayment.promoCodeId,
                    userId: existingPayment.studentId,
                });
            }
            // Fetch all enrolled items for this payment to recalculate expiresAt
            // from NOW (approval date) instead of the original purchase date.
            const items = await tx
                .select({
                id: schema_1.enrolledItems.id,
                priceId: schema_1.enrolledItems.priceId,
            })
                .from(schema_1.enrolledItems)
                .where((0, drizzle_orm_1.eq)(schema_1.enrolledItems.paymentId, paymentId));
            for (const item of items) {
                let newExpiresAt = null;
                if (item.priceId) {
                    const [plan] = await tx
                        .select({ durationDays: prices_1.prices.durationDays })
                        .from(prices_1.prices)
                        .where((0, drizzle_orm_1.eq)(prices_1.prices.id, item.priceId));
                    if (plan) {
                        const days = Math.floor(Number(plan.durationDays) || 0);
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        newExpiresAt = d;
                    }
                }
                await tx
                    .update(schema_1.enrolledItems)
                    .set({
                    status: 'active',
                    ...(newExpiresAt ? { expiresAt: newExpiresAt } : {}),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.enrolledItems.id, item.id));
            }
        }
        // On reject: enrolledItems intentionally left as "pending" so the
        // student can see the rejected purchase in getMyPurchases via paymentStatus.
    });
    // Notify student by email regardless of approve or reject
    if (existingPayment.studentId) {
        const [student] = await connection_1.db
            .select({ email: schema_1.Student.email, firstname: schema_1.Student.firstname })
            .from(schema_1.Student)
            .where((0, drizzle_orm_1.eq)(schema_1.Student.id, existingPayment.studentId));
        if (student && student.email) {
            const isApproved = action === 'approve';
            const reasonHtml = (!isApproved && reason) ? `<p><strong>Reason:</strong> ${reason}</p>` : '';
            await (0, sendEmails_1.sendEmail)({
                to: student.email,
                subject: isApproved ? "Content Purchase Approved ✅" : "Content Purchase Request Rejected ❌",
                html: isApproved
                    ? `<h1>Purchase Approved</h1><p>Hello ${student.firstname || 'Student'},</p><p>Your request to purchase content has been <strong>approved</strong>. You can now access your courses and lessons.</p>`
                    : `<h1>Purchase Request Rejected</h1><p>Hello ${student.firstname || 'Student'},</p><p>Unfortunately, your content purchase request has been <strong>rejected</strong>.</p>${reasonHtml}<p>Please contact support if you have any questions or try submitting a new request.</p>`
            }).catch(console.error); // Never crash the request over an email failure
        }
    }
    return (0, response_1.SuccessResponse)(res, { message: `Content buy request has been ${newStatus}` });
};
exports.replyToContentBuyRequest = replyToContentBuyRequest;
