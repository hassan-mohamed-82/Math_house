"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wallet = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Student_1 = require("../admin/Student");
exports.wallet = (0, mysql_core_1.mysqlTable)("wallet", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    studentId: (0, mysql_core_1.char)("studentId", { length: 255 }).references(() => Student_1.Student.id).notNull(),
    balance: (0, mysql_core_1.int)("balance").notNull().default(0),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow(),
});
