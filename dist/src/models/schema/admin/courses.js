"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courses = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.courses = (0, mysql_core_1.mysqlTable)("courses", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    mainThumbnail: (0, mysql_core_1.varchar)("main_thumbnail", { length: 255 }).notNull(),
    description: (0, mysql_core_1.varchar)("description", { length: 255 }).notNull(),
    price: (0, mysql_core_1.double)("price").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
