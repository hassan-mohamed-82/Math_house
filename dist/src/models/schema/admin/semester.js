"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semesters = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const category_1 = require("./category");
exports.semesters = (0, mysql_core_1.mysqlTable)("semesters", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 255 }).notNull().references(() => category_1.category.id),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
