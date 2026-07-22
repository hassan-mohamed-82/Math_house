"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletTransaction = exports.wallet = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const Student_1 = require("../admin/Student");
const payment_1 = require("../admin/payment");
const uuid_1 = require("uuid");
exports.wallet = (0, mysql_core_1.mysqlTable)("wallet", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => (0, uuid_1.v4)()),
    studentId: (0, mysql_core_1.char)("studentId", { length: 255 }).references(() => Student_1.Student.id, { onDelete: "cascade" }).notNull(),
    balance: (0, mysql_core_1.int)("balance").notNull().default(0),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow(),
});
exports.walletTransaction = (0, mysql_core_1.mysqlTable)("walletTransaction", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => (0, uuid_1.v4)()),
    walletId: (0, mysql_core_1.char)("walletId", { length: 255 }).references(() => exports.wallet.id, { onDelete: "cascade" }).notNull(),
    paymentId: (0, mysql_core_1.char)("paymentId", { length: 255 }).references(() => payment_1.payment.id, { onDelete: "cascade" }),
    amount: (0, mysql_core_1.int)("amount").notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["deposit", "withdrawal"]).notNull(),
    source: (0, mysql_core_1.mysqlEnum)("source", ["Admin", "Voucher", "Student", "Parent"]).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
