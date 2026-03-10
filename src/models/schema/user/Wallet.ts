import { mysqlTable, char, int, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "../admin/Student";
import { payment } from "../admin/payment";

export const wallet = mysqlTable("wallet", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    studentId: char("studentId", { length: 255 }).references(() => Student.id).notNull(),
    balance: int("balance").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const walletTransaction = mysqlTable("walletTransaction", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    walletId: char("walletId", { length: 255 }).references(() => wallet.id).notNull(),
    paymentId: char("paymentId", { length: 255 }).references(() => payment.id).notNull(),
    amount: int("amount").notNull(),
    type: mysqlEnum("type", ["deposit", "withdrawal"]).notNull(),
    source: mysqlEnum("source", ["Admin", "Voucher", "Student", "Parent"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});