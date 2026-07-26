"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payment = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const paymentMethod_1 = require("./paymentMethod");
const Student_1 = require("./Student");
const parent_1 = require("./parent");
const Package_1 = require("./Package");
const promoCodes_1 = require("./promoCodes");
exports.payment = (0, mysql_core_1.mysqlTable)("payment", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    amount: (0, mysql_core_1.int)("amount").notNull(),
    paymentMethodId: (0, mysql_core_1.char)("paymentMethodId", { length: 36 }).notNull().references(() => paymentMethod_1.paymentMethod.id, { onDelete: "cascade" }),
    studentId: (0, mysql_core_1.char)("studentId", { length: 36 }).references(() => Student_1.Student.id, { onDelete: "cascade" }),
    parentId: (0, mysql_core_1.char)("parentId", { length: 255 }).references(() => parent_1.parents.id, { onDelete: "cascade" }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "completed", "rejected"]).notNull().default("pending"),
    receiptImg: (0, mysql_core_1.char)("receiptImg", { length: 255 }),
    source: (0, mysql_core_1.mysqlEnum)("source", ["student", "parent"]).notNull(),
    purpose: (0, mysql_core_1.mysqlEnum)("purpose", ["wallet_recharge", "purchase"]).notNull(),
    packageId: (0, mysql_core_1.char)("packageId", { length: 36 }).references(() => Package_1.packages.id, { onDelete: "cascade" }),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => promoCodes_1.promoCodes.id, { onDelete: "set null" }),
    includedAnswers: (0, mysql_core_1.boolean)("includedAnswers").default(false).notNull(),
    reason: (0, mysql_core_1.char)("reason", { length: 255 }),
    isDeleted: (0, mysql_core_1.boolean)("isDeleted").default(false).notNull(),
    deletedAt: (0, mysql_core_1.timestamp)("deletedAt"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
