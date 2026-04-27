import { mysqlTable, varchar, char, timestamp, uniqueIndex } from "drizzle-orm/mysql-core";
import { category } from "./category";
import { v4 as uuidv4 } from "uuid";

export const grade = mysqlTable("grade", {
    id: char("id", { length: 36 }).primaryKey().notNull().$defaultFn(() => uuidv4()),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("name_ar", { length: 255 }).notNull(),
    categoryId: char("category_id", { length: 36 }).notNull().references(() => category.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
    uniqueGradeName: uniqueIndex("unique_grade_name_per_category").on(table.name, table.categoryId),
    uniqueGradeNameAr: uniqueIndex("unique_grade_name_ar_per_category").on(table.nameAr, table.categoryId),
}));