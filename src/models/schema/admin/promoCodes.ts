import { mysqlTable, char, timestamp, int, varchar, date, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { packages } from "./Package";
import { Student } from "./Student";
import { Currency } from "./currency";
import { courses } from "./courses";
import { chapters } from "./chapters";
import { lessons } from "./lessons";



export const promoCodes = mysqlTable("promoCodes", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoName: varchar("promoName", { length: 255 }).notNull(),
    code: varchar("code", { length: 255 }).notNull().unique(),
    discountAmount: int("discountAmount").notNull(),
    type: mysqlEnum("type", ["generic", "restricted"]).notNull(),
    startDate: date("startDate").notNull(),
    endDate: date("endDate").notNull(),
    numberOfUsages: int("numberOfUsages").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});



export const promoCodesPackages = mysqlTable("promoCodesPackages", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
    packageId: char("packageId", { length: 255 }).references(() => packages.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});


export const promoCodesCourses = mysqlTable("promoCodesCourses", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
    courseId: char("courseId", { length: 255 }).references(() => courses.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});

export const promoCodesChapters = mysqlTable("promoCodesChapters", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
    chapterId: char("chapterId", { length: 255 }).references(() => chapters.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});

export const promoCodesLessons = mysqlTable("promoCodesLessons", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
    lessonId: char("lessonId", { length: 255 }).references(() => lessons.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});

export const promoCodesUsers = mysqlTable("promoCodesUsers", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
    userId: char("userId", { length: 255 }).references(() => Student.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const promoCodesCurrency = mysqlTable("promoCodesCurrency", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
    currencyId: char("currencyId", { length: 255 }).references(() => Currency.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});



// Tracks which students are pre-approved by the admin to use a specific promo code.
// If this table has NO rows for a given promo → the promo is PUBLIC (any student can use it).
// If this table HAS rows for a given promo → the promo is RESTRICTED to only those students.
export const promoCodesAllowedStudents = mysqlTable("promoCodesAllowedStudents", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    promoCodeId: char("promoCodeId", { length: 255 }).references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
    studentId: char("studentId", { length: 255 }).references(() => Student.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
});