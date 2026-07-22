"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promoCodesAllowedStudents = exports.promoCodesCurrency = exports.promoCodesUsers = exports.promoCodesLessons = exports.promoCodesChapters = exports.promoCodesCourses = exports.promoCodesPackages = exports.promoCodes = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Package_1 = require("./Package");
const Student_1 = require("./Student");
const currency_1 = require("./currency");
const courses_1 = require("./courses");
const chapters_1 = require("./chapters");
const lessons_1 = require("./lessons");
exports.promoCodes = (0, mysql_core_1.mysqlTable)("promoCodes", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoName: (0, mysql_core_1.varchar)("promoName", { length: 255 }).notNull(),
    code: (0, mysql_core_1.varchar)("code", { length: 255 }).notNull().unique(),
    discountAmount: (0, mysql_core_1.int)("discountAmount").notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["generic", "restricted"]).notNull(),
    startDate: (0, mysql_core_1.date)("startDate").notNull(),
    endDate: (0, mysql_core_1.date)("endDate").notNull(),
    numberOfUsages: (0, mysql_core_1.int)("numberOfUsages").notNull().default(1),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow(),
});
exports.promoCodesPackages = (0, mysql_core_1.mysqlTable)("promoCodesPackages", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id, { onDelete: "cascade" }).notNull(),
    packageId: (0, mysql_core_1.char)("packageId", { length: 255 }).references(() => Package_1.packages.id, { onDelete: "cascade" }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
exports.promoCodesCourses = (0, mysql_core_1.mysqlTable)("promoCodesCourses", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id, { onDelete: "cascade" }).notNull(),
    courseId: (0, mysql_core_1.char)("courseId", { length: 255 }).references(() => courses_1.courses.id, { onDelete: "cascade" }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
exports.promoCodesChapters = (0, mysql_core_1.mysqlTable)("promoCodesChapters", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id, { onDelete: "cascade" }).notNull(),
    chapterId: (0, mysql_core_1.char)("chapterId", { length: 255 }).references(() => chapters_1.chapters.id, { onDelete: "cascade" }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
exports.promoCodesLessons = (0, mysql_core_1.mysqlTable)("promoCodesLessons", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id, { onDelete: "cascade" }).notNull(),
    lessonId: (0, mysql_core_1.char)("lessonId", { length: 255 }).references(() => lessons_1.lessons.id, { onDelete: "cascade" }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
exports.promoCodesUsers = (0, mysql_core_1.mysqlTable)("promoCodesUsers", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id, { onDelete: "cascade" }).notNull(),
    userId: (0, mysql_core_1.char)("userId", { length: 255 }).references(() => Student_1.Student.id, { onDelete: "cascade" }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow(),
});
exports.promoCodesCurrency = (0, mysql_core_1.mysqlTable)("promoCodesCurrency", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id, { onDelete: "cascade" }).notNull(),
    currencyId: (0, mysql_core_1.char)("currencyId", { length: 255 }).references(() => currency_1.Currency.id, { onDelete: "cascade" }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
// Tracks which students are pre-approved by the admin to use a specific promo code.
// If this table has NO rows for a given promo → the promo is PUBLIC (any student can use it).
// If this table HAS rows for a given promo → the promo is RESTRICTED to only those students.
exports.promoCodesAllowedStudents = (0, mysql_core_1.mysqlTable)("promoCodesAllowedStudents", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id, { onDelete: "cascade" }).notNull(),
    studentId: (0, mysql_core_1.char)("studentId", { length: 255 }).references(() => Student_1.Student.id, { onDelete: "cascade" }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
