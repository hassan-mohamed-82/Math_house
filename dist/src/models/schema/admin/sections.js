"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sections = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.Sections = (0, mysql_core_1.mysqlTable)("sections", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    sectionName: (0, mysql_core_1.varchar)("section_name", { length: 255 }).notNull(),
    sectionDescription: (0, mysql_core_1.varchar)("section_description", { length: 255 }),
    sectionTime: (0, mysql_core_1.int)("section_time").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
