"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teachers = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../schema");
exports.teachers = (0, mysql_core_1.mysqlTable)("teachers", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 255 }).notNull(),
    phoneNumber: (0, mysql_core_1.varchar)("phone_number", { length: 255 }).notNull(),
    password: (0, mysql_core_1.varchar)("password", { length: 255 }).notNull(),
    avatar: (0, mysql_core_1.varchar)("avatar", { length: 500 }),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 36 }).references(() => schema_1.category.id),
    courseId: (0, mysql_core_1.char)("course_id", { length: 36 }).references(() => schema_1.courses.id),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
