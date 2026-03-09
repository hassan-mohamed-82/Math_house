"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payment = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const paymentMethod_1 = require("./paymentMethod");
const Student_1 = require("./Student");
const parent_1 = require("./parent");
const mysql_core_2 = require("drizzle-orm/mysql-core");
exports.payment = (0, mysql_core_1.mysqlTable)("payment", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    amount: (0, mysql_core_1.int)("amount").notNull(),
    paymentMethodId: (0, mysql_core_1.char)("paymentMethodId", { length: 255 }).notNull().references(() => paymentMethod_1.paymentMethod.id),
    studentId: (0, mysql_core_1.char)("studentId", { length: 36 }).references(() => Student_1.Student.id),
    parentId: (0, mysql_core_1.char)("parentId", { length: 255 }).references(() => parent_1.parents.id),
    status: (0, mysql_core_2.mysqlEnum)("status", ["pending", "completed", "rejected"]).notNull().default("pending"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
