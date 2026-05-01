import { mysqlTable, varchar, char, timestamp, double, int } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { courses } from "./courses";
import { category } from "./category";
import { teachers } from "./teacher";
import { semesters } from "./semester";

export const chapters = mysqlTable("chapters", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    categoryId: char("category_id", { length: 255 }).notNull().references(() => category.id),
    semesterId: char("semester_id", { length: 255 }).references(() => semesters.id),
    courseId: char("course_id", { length: 255 }).notNull().references(() => courses.id),
    description: varchar("description", { length: 255 }),
    image: varchar("image", { length: 255 }),

    teacherId: char("teacher_id", { length: 255 }).notNull().references(() => teachers.id),
    order: int("order").notNull(),
    preRequisition: varchar("pre_requisition", { length: 255 }),
    whatYouGain: varchar("what_you_gain", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});