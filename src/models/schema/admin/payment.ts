import { mysqlTable, char, int, timestamp, mysqlEnum, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { paymentMethod } from "./paymentMethod";
import { Student } from "./Student";
import { parents } from "./parent";
import { packages } from "./Package";

export const payment = mysqlTable("payment", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    amount: int("amount").notNull(),
    paymentMethodId: char("paymentMethodId", { length: 36 }).notNull().references(() => paymentMethod.id, { onDelete: "cascade" }),
    studentId: char("studentId", { length: 36 }).references(() => Student.id, { onDelete: "cascade" }),
    parentId: char("parentId", { length: 255 }).references(() => parents.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["pending", "completed", "rejected"]).notNull().default("pending"),
    receiptImg: char("receiptImg", { length: 255 }),
    source: mysqlEnum("source", ["student", "parent"]).notNull(),
    purpose: mysqlEnum("purpose", ["wallet_recharge", "purchase"]).notNull(),
    packageId: char("packageId", { length: 36 }).references(() => packages.id, { onDelete: "cascade" }),
    includedAnswers: boolean("includedAnswers").default(false).notNull(), 
    reason: char("reason", { length: 255 }),
    isDeleted: boolean("isDeleted").default(false).notNull(),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow(),
});