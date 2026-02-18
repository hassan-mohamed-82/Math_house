"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packages = void 0;
// models/schema/admin/packages.ts
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const category_1 = require("./category");
const courses_1 = require("./courses");
exports.packages = (0, mysql_core_1.mysqlTable)("packages", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["exam", "question", "live"]).notNull(),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 36 }).notNull().references(() => category_1.category.id),
    courseId: (0, mysql_core_1.char)("course_id", { length: 36 }).notNull().references(() => courses_1.courses.id),
    number: (0, mysql_core_1.int)("number").notNull(), // عدد الحصص
    price: (0, mysql_core_1.decimal)("price", { precision: 10, scale: 2 }).notNull(),
    duration: (0, mysql_core_1.int)("duration").notNull(), // المدة بالأيام
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
