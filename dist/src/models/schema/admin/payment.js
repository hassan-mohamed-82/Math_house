"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payment = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const paymentMethod_1 = require("./paymentMethod");
const Student_1 = require("./Student");
const parent_1 = require("./parent");
const mysql_core_2 = require("drizzle-orm/mysql-core");
const Package_1 = require("./Package");
exports.payment = (0, mysql_core_1.mysqlTable)("payment", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    amount: (0, mysql_core_1.int)("amount").notNull(),
    paymentMethodId: (0, mysql_core_1.char)("paymentMethodId", { length: 36 }).notNull().references(() => paymentMethod_1.paymentMethod.id),
    studentId: (0, mysql_core_1.char)("studentId", { length: 36 }).references(() => Student_1.Student.id),
    parentId: (0, mysql_core_1.char)("parentId", { length: 255 }).references(() => parent_1.parents.id),
    status: (0, mysql_core_2.mysqlEnum)("status", ["pending", "completed", "rejected"]).notNull().default("pending"),
    receiptImg: (0, mysql_core_1.char)("receiptImg", { length: 255 }),
    source: (0, mysql_core_2.mysqlEnum)("source", ["student", "parent"]).notNull(),
    purpose: (0, mysql_core_2.mysqlEnum)("purpose", ["wallet_recharge", "purchase"]).notNull(),
    packageId: (0, mysql_core_1.char)("packageId", { length: 36 }).references(() => Package_1.packages.id),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
