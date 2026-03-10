"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promoCodesCurrency = exports.promoCodesUsers = exports.promoCodesPackages = exports.promoCodesCourses = exports.promoCodes = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const courses_1 = require("./courses");
const Package_1 = require("./Package");
const Student_1 = require("./Student");
const currency_1 = require("./currency");
exports.promoCodes = (0, mysql_core_1.mysqlTable)("promoCodes", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoName: (0, mysql_core_1.varchar)("promoName", { length: 255 }).notNull(),
    code: (0, mysql_core_1.varchar)("code", { length: 255 }).notNull(),
    discountAmount: (0, mysql_core_1.int)("discountAmount").notNull(),
    startDate: (0, mysql_core_1.date)("startDate").notNull(),
    endDate: (0, mysql_core_1.date)("endDate").notNull(),
    numberOfUsages: (0, mysql_core_1.int)("numberOfUsages").notNull().default(1),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow(),
});
exports.promoCodesCourses = (0, mysql_core_1.mysqlTable)("promoCodesCourses", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id).notNull(),
    courseId: (0, mysql_core_1.char)("courseId", { length: 255 }).references(() => courses_1.courses.id).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
exports.promoCodesPackages = (0, mysql_core_1.mysqlTable)("promoCodesPackages", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id).notNull(),
    packageId: (0, mysql_core_1.char)("packageId", { length: 255 }).references(() => Package_1.packages.id).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
exports.promoCodesUsers = (0, mysql_core_1.mysqlTable)("promoCodesUsers", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id).notNull(),
    userId: (0, mysql_core_1.char)("userId", { length: 255 }).references(() => Student_1.Student.id).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow(),
});
exports.promoCodesCurrency = (0, mysql_core_1.mysqlTable)("promoCodesCurrency", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    promoCodeId: (0, mysql_core_1.char)("promoCodeId", { length: 255 }).references(() => exports.promoCodes.id).notNull(),
    currencyId: (0, mysql_core_1.char)("currencyId", { length: 255 }).references(() => currency_1.Currency.id).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
