"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateAutomaticPackageBuy = exports.requestPackageBuy = exports.creditPackageBalance = void 0;
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
const getStudentForPackagePayment = async (studentId) => {
    const [student] = await connection_1.db.select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        parentphone: schema_1.Student.parentphone,
    }).from(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId)).limit(1);
    if (!student) {
        throw new Errors_1.NotFound("Student not found");
    }
    return student;
};
const getLinkedParentId = async (parentPhone) => {
    if (!parentPhone) {
        return null;
    }
    const [parent] = await connection_1.db.select({
        id: schema_1.parents.id,
    }).from(schema_1.parents).where((0, drizzle_orm_1.eq)(schema_1.parents.phoneNumber, parentPhone)).limit(1);
    return parent?.id ?? null;
};
const creditPackageBalance = async (studentId, packageId, database = connection_1.db) => {
    const [existingPackage] = await database.select({
        type: schema_1.packages.type,
        number: schema_1.packages.number,
    }).from(schema_1.packages).where((0, drizzle_orm_1.eq)(schema_1.packages.id, packageId)).limit(1);
    if (!existingPackage) {
        throw new Errors_1.NotFound("Package not found");
    }
    if (existingPackage.number <= 0) {
        throw new Errors_1.BadRequest("Package must include at least one number to be added to student's account");
    }
    switch (existingPackage.type) {
        case "live":
            await database.update(schema_1.Student)
                .set({ livebalance: (0, drizzle_orm_1.sql) `${schema_1.Student.livebalance} + ${existingPackage.number}` })
                .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
            break;
        case "exam":
            await database.update(schema_1.Student)
                .set({ exambalance: (0, drizzle_orm_1.sql) `${schema_1.Student.exambalance} + ${existingPackage.number}` })
                .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
            break;
        case "question":
            await database.update(schema_1.Student)
                .set({ questionbalance: (0, drizzle_orm_1.sql) `${schema_1.Student.questionbalance} + ${existingPackage.number}` })
                .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
            break;
        default:
            throw new Errors_1.BadRequest("Invalid package type");
    }
};
exports.creditPackageBalance = creditPackageBalance;
const requestPackageBuy = async (req, res) => {
    const { packageId, paymentMethodId, receiptImg } = req.body;
    const studentId = getAuthenticatedStudentId(req);
    if (!packageId || !paymentMethodId || !receiptImg) {
        throw new Errors_1.BadRequest("Package ID, Payment Method ID, and receipt image are required");
    }
    const [existingPackage] = await connection_1.db.select({
        id: schema_1.packages.id,
        name: schema_1.packages.name,
        price: schema_1.packages.price,
        type: schema_1.packages.type,
        number: schema_1.packages.number
    }).from(schema_1.packages).where((0, drizzle_orm_1.eq)(schema_1.packages.id, packageId)).limit(1);
    if (!existingPackage) {
        throw new Errors_1.NotFound("Package not found");
    }
    const [existingPaymentMethod] = await connection_1.db.select({
        id: schema_1.paymentMethod.id,
        name: schema_1.paymentMethod.name,
        isActive: schema_1.paymentMethod.isActive,
        type: schema_1.paymentMethod.type,
    }).from(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, paymentMethodId)).limit(1);
    if (!existingPaymentMethod) {
        throw new Errors_1.NotFound("Payment method not found");
    }
    if (!existingPaymentMethod.isActive) {
        throw new Errors_1.BadRequest("Payment method is not active");
    }
    if (existingPaymentMethod.type !== "Manual") {
        throw new Errors_1.BadRequest("Use the automatic recharge endpoint for automatic payment methods");
    }
    const [existingStudent] = await connection_1.db.select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        parentphone: schema_1.Student.parentphone,
    }).from(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId)).limit(1);
    if (!existingStudent) {
        throw new Errors_1.NotFound("Student not found");
    }
    if (!existingStudent.parentphone) {
        throw new Errors_1.BadRequest("Student does not have a parent phone number");
    }
    const [existingParent] = await connection_1.db.select({
        id: schema_1.parents.id,
    }).from(schema_1.parents).where((0, drizzle_orm_1.eq)(schema_1.parents.phoneNumber, existingStudent.parentphone)).limit(1);
    if (!existingParent) {
        throw new Errors_1.NotFound("Parent not found");
    }
    const savedReceiptImg = await (0, handleImages_1.validateAndSaveLogo)(req, receiptImg, 'payment_receipts');
    await connection_1.db.insert(schema_1.payment).values({
        studentId: studentId,
        parentId: existingParent.id,
        purpose: "purchase",
        paymentMethodId: paymentMethodId,
        amount: Number(existingPackage.price),
        receiptImg: savedReceiptImg,
        source: "student",
        packageId: packageId,
    });
    return (0, response_1.SuccessResponse)(res, {
        message: 'Package buy request created successfully',
    }, 201);
};
exports.requestPackageBuy = requestPackageBuy;
const initiateAutomaticPackageBuy = async (req, res) => {
    const { packageId, paymentMethodId } = req.body;
    const studentId = getAuthenticatedStudentId(req);
    if (!packageId || !paymentMethodId) {
        throw new Errors_1.BadRequest('Package ID and payment method ID are required');
    }
    const [existingPackage] = await connection_1.db.select({
        id: schema_1.packages.id,
        name: schema_1.packages.name,
        price: schema_1.packages.price,
    }).from(schema_1.packages).where((0, drizzle_orm_1.eq)(schema_1.packages.id, packageId)).limit(1);
    if (!existingPackage) {
        throw new Errors_1.NotFound('Package not found');
    }
    const packagePrice = Number(existingPackage.price);
    if (!Number.isFinite(packagePrice) || packagePrice <= 0) {
        throw new Errors_1.BadRequest('Package price is invalid');
    }
    const [existingPaymentMethod] = await connection_1.db.select({
        id: schema_1.paymentMethod.id,
        name: schema_1.paymentMethod.name,
        isActive: schema_1.paymentMethod.isActive,
        type: schema_1.paymentMethod.type,
    }).from(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, paymentMethodId)).limit(1);
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
    const student = await getStudentForPackagePayment(studentId);
    const parentId = await getLinkedParentId(student.parentphone);
    const paymentId = (0, crypto_1.randomUUID)();
    await connection_1.db.insert(schema_1.payment).values({
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
        const checkoutSession = await (0, paymob_1.createPaymobCheckoutSession)({
            amountCents: Math.round(packagePrice * 100),
            merchantOrderId: paymentId,
            student,
        });
        return (0, response_1.SuccessResponse)(res, {
            message: 'Automatic package payment session created successfully',
            paymentId,
            packageId,
            paymentMethod: existingPaymentMethod.name,
            checkoutUrl: checkoutSession.checkoutUrl,
            iframeUrl: checkoutSession.iframeUrl,
            paymobOrderId: checkoutSession.paymobOrderId,
            callbackUrl: checkoutSession.callbackUrl,
        }, 201);
    }
    catch (error) {
        await connection_1.db.delete(schema_1.payment).where((0, drizzle_orm_1.eq)(schema_1.payment.id, paymentId));
        throw new Errors_1.BadRequest(error?.message || 'Failed to initialize automatic package payment');
    }
};
exports.initiateAutomaticPackageBuy = initiateAutomaticPackageBuy;
