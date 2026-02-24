import { mysqlTable, text, char, timestamp, int, varchar, date } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { courses } from "./courses";
import { packages } from "./Package";
import { Student } from "./Student";

export const promoCodes = mysqlTable("promoCodes", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoName: varchar("promoName", { length: 255 }).notNull(),
    code: varchar("code", { length: 255 }).notNull(),
    discountAmount: int("discountAmount").notNull(),
    startDate: date("startDate").notNull(),
    endDate: date("endDate").notNull(),
    numberOfUsages: int("numberOfUsages").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const promoCodesCourses = mysqlTable("promoCodesCourses", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id).notNull(),
    courseId: char("courseId", { length: 255 }).references(() => courses.id).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});

export const promoCodesPackages = mysqlTable("promoCodesPackages", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id).notNull(),
    packageId: char("packageId", { length: 255 }).references(() => packages.id).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});

export const promoCodesUsers = mysqlTable("promoCodesUsers", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id).notNull(),
    userId: char("userId", { length: 255 }).references(() => Student.id).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});