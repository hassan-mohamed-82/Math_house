"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrolledItems = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const courses_1 = require("../admin/courses");
const semester_1 = require("../admin/semester");
const chapters_1 = require("../admin/chapters");
const lessons_1 = require("../admin/lessons");
const payment_1 = require("../admin/payment");
const prices_1 = require("../admin/prices");
const uuid_1 = require("uuid");
exports.enrolledItems = (0, mysql_core_1.mysqlTable)("enrolledItems", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().$defaultFn(() => (0, uuid_1.v4)()),
    studentId: (0, mysql_core_1.char)("studentId", { length: 255 }).notNull(),
    courseId: (0, mysql_core_1.char)("courseId", { length: 255 }).references(() => courses_1.courses.id),
    semesterId: (0, mysql_core_1.char)("semesterId", { length: 255 }).references(() => semester_1.semesters.id),
    chapterId: (0, mysql_core_1.char)("chapterId", { length: 255 }).references(() => chapters_1.chapters.id),
    lessonId: (0, mysql_core_1.char)("lessonId", { length: 255 }).references(() => lessons_1.lessons.id),
    paymentId: (0, mysql_core_1.char)("paymentId", { length: 255 }).references(() => payment_1.payment.id),
    priceId: (0, mysql_core_1.char)("priceId", { length: 36 }).references(() => prices_1.prices.id),
    expiresAt: (0, mysql_core_1.timestamp)("expiresAt"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "pending", "expired"]).default("active"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow(),
});
