"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courses = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const category_1 = require("./category");
const semester_1 = require("./semester");
exports.courses = (0, mysql_core_1.mysqlTable)("courses", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 255 }).notNull().references(() => category_1.category.id),
    semesterId: (0, mysql_core_1.char)("semester_id", { length: 255 }).references(() => semester_1.semesters.id),
    description: (0, mysql_core_1.varchar)("description", { length: 255 }),
    image: (0, mysql_core_1.varchar)("image", { length: 255 }),
    preRequisition: (0, mysql_core_1.varchar)("pre_requisition", { length: 255 }),
    whatYouGain: (0, mysql_core_1.varchar)("what_you_gain", { length: 255 }),
    duration: (0, mysql_core_1.varchar)("duration", { length: 255 }),
    price: (0, mysql_core_1.double)("price").notNull(),
    discount: (0, mysql_core_1.double)("discount").default(0),
    totalPrice: (0, mysql_core_1.double)("total_amount").generatedAlwaysAs((0, drizzle_orm_1.sql) `price - COALESCE(discount, 0)`),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
