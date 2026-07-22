"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courses = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const category_1 = require("./category");
exports.courses = (0, mysql_core_1.mysqlTable)("courses", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 255 }).notNull().references(() => category_1.category.id, { onDelete: "cascade" }),
    // semesterId: char("semester_id", { length: 255 }).references(() => semesters.id, { onDelete: "cascade" }),
    description: (0, mysql_core_1.varchar)("description", { length: 255 }),
    image: (0, mysql_core_1.varchar)("image", { length: 255 }),
    preRequisition: (0, mysql_core_1.varchar)("pre_requisition", { length: 255 }),
    whatYouGain: (0, mysql_core_1.varchar)("what_you_gain", { length: 255 }),
    isHaveSemester: (0, mysql_core_1.boolean)("is_have_semester").default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
