"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletTransaction = exports.wallet = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Student_1 = require("../admin/Student");
const payment_1 = require("../admin/payment");
exports.wallet = (0, mysql_core_1.mysqlTable)("wallet", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    studentId: (0, mysql_core_1.char)("studentId", { length: 255 }).references(() => Student_1.Student.id).notNull(),
    balance: (0, mysql_core_1.int)("balance").notNull().default(0),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow(),
});
exports.walletTransaction = (0, mysql_core_1.mysqlTable)("walletTransaction", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    walletId: (0, mysql_core_1.char)("walletId", { length: 255 }).references(() => exports.wallet.id).notNull(),
    paymentId: (0, mysql_core_1.char)("paymentId", { length: 255 }).references(() => payment_1.payment.id).notNull(),
    amount: (0, mysql_core_1.int)("amount").notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["deposit", "withdrawal"]).notNull(),
    source: (0, mysql_core_1.mysqlEnum)("source", ["Admin", "Voucher", "Student", "Parent"]).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
