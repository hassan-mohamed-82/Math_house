"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Student = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const category_1 = require("./category");
exports.Student = (0, mysql_core_1.mysqlTable)("student", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    firstname: (0, mysql_core_1.varchar)("first_name", { length: 255 }).notNull(),
    lastname: (0, mysql_core_1.varchar)("last_name", { length: 255 }).notNull(),
    nickname: (0, mysql_core_1.varchar)("nickname", { length: 255 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 255 }).notNull(),
    password: (0, mysql_core_1.varchar)("password", { length: 255 }).notNull(),
    phone: (0, mysql_core_1.varchar)("phone", { length: 255 }).notNull(),
    category: (0, mysql_core_1.char)("category", { length: 36 }).notNull().references(() => category_1.category.id),
    grade: (0, mysql_core_1.mysqlEnum)("grade", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]).notNull(),
    parentphone: (0, mysql_core_1.varchar)("parent_phone", { length: 255 }).notNull(),
});
