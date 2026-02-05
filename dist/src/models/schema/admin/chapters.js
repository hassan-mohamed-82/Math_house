"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chapters = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const courses_1 = require("./courses");
const category_1 = require("./category");
exports.chapters = (0, mysql_core_1.mysqlTable)("chapters", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 255 }).notNull().references(() => category_1.category.id),
    courseId: (0, mysql_core_1.char)("course_id", { length: 255 }).notNull().references(() => courses_1.courses.id),
    description: (0, mysql_core_1.varchar)("description", { length: 255 }),
    image: (0, mysql_core_1.varchar)("image", { length: 255 }),
    // TODO: Add teacher schema and check for existing teacher
    teacherId: (0, mysql_core_1.char)("teacher_id", { length: 255 }).notNull(),
    preRequisition: (0, mysql_core_1.varchar)("pre_requisition", { length: 255 }),
    whatYouGain: (0, mysql_core_1.varchar)("what_you_gain", { length: 255 }),
    // Pricing
    duration: (0, mysql_core_1.varchar)("duration", { length: 255 }).notNull(),
    price: (0, mysql_core_1.double)("price").notNull(),
    discount: (0, mysql_core_1.double)("discount").default(0),
    totalPrice: (0, mysql_core_1.double)("total_amount").generatedAlwaysAs((0, drizzle_orm_1.sql) `price - COALESCE(discount, 0)`),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
