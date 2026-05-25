"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grade = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const category_1 = require("./category");
const uuid_1 = require("uuid");
exports.grade = (0, mysql_core_1.mysqlTable)("grade", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().notNull().$defaultFn(() => (0, uuid_1.v4)()),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    nameAr: (0, mysql_core_1.varchar)("name_ar", { length: 255 }).notNull(),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 36 }).notNull().references(() => category_1.category.id),
    parentCategoryId: (0, mysql_core_1.char)("parent_category_id", { length: 36 }).references(() => category_1.category.id),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
    uniqueGradeName: (0, mysql_core_1.uniqueIndex)("unique_grade_name_per_category").on(table.name, table.categoryId),
    uniqueGradeNameAr: (0, mysql_core_1.uniqueIndex)("unique_grade_name_ar_per_category").on(table.nameAr, table.categoryId),
}));
