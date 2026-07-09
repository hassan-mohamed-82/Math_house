// models/schema/admin/packages.ts
import { mysqlTable, varchar, char, timestamp, int, decimal, mysqlEnum , boolean} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { category } from "./category";
import { courses } from "./courses";

export const packages = mysqlTable("packages", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["exam", "question", "live"]).notNull(),
    categoryId: char("category_id", { length: 36 }).notNull().references(() => category.id, { onDelete: "cascade" }),
    courseId: char("course_id", { length: 36 }).notNull().references(() => courses.id, { onDelete: "cascade" }),
    number: int("number").notNull(), // عدد الحصص
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    duration: int("duration").notNull(), // المدة بالأيام
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});