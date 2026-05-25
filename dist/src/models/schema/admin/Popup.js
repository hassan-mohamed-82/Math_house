"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.popups = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.popups = (0, mysql_core_1.mysqlTable)("popups", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    image: (0, mysql_core_1.text)("image").notNull(), // base64 photo
    destination: (0, mysql_core_1.mysqlEnum)("destination", ["student", "parent", "teacher"]).notNull(),
    startDate: (0, mysql_core_1.datetime)("start_date").notNull(),
    endDate: (0, mysql_core_1.datetime)("end_date").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
