import { mysqlTable, char, int, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "../admin/Student";
import { payment } from "../admin/payment";
import { v4 as uuidv4 } from "uuid";

export const wallet = mysqlTable("wallet", {
    id: char("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => uuidv4()),
    studentId: char("studentId", { length: 255 }).references(() => Student.id).notNull(),
    balance: int("balance").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const walletTransaction = mysqlTable("walletTransaction", {
    id: char("id", { length: 255 }).primaryKey().notNull().$defaultFn(() => uuidv4()),
    walletId: char("walletId", { length: 255 }).references(() => wallet.id).notNull(),
    paymentId: char("paymentId", { length: 255 }).references(() => payment.id),
    amount: int("amount").notNull(),
    type: mysqlEnum("type", ["deposit", "withdrawal"]).notNull(),
    source: mysqlEnum("source", ["Admin", "Voucher", "Student", "Parent"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});