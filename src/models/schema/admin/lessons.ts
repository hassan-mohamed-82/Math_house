import { mysqlTable, varchar, char, timestamp, double, int } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { courses } from "./courses";
import { category } from "./category";
import { teachers } from "./teacher";
import { chapters } from "./chapters";

export const lessons = mysqlTable("lessons", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    categoryId: char("category_id", { length: 255 }).notNull().references(() => category.id),
    courseId: char("course_id", { length: 255 }).notNull().references(() => courses.id),
    chapterId: char("chapter_id", { length: 255 }).notNull().references(() => chapters.id),
    description: varchar("description", { length: 255 }),
    image: varchar("image", { length: 255 }),

    teacherId: char("teacher_id", { length: 255 }).notNull().references(() => teachers.id),
    order: int("order").notNull(),
    preRequisition: varchar("pre_requisition", { length: 255 }),
    whatYouGain: varchar("what_you_gain", { length: 255 }),

    // Pricing
    price: double("price").notNull(),
    discount: double("discount").default(0),
    totalPrice: double("total_amount").generatedAlwaysAs(sql`price - COALESCE(discount, 0)`),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const lessonIdeas = mysqlTable("lesson_ideas", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    idea: varchar("idea", { length: 255 }).notNull(),
    lessonId: char("lesson_id", { length: 255 }).notNull().references(() => lessons.id),
    ideaOrder: int("idea_order").notNull(),
    pdf: varchar("pdf", { length: 255 }),
    video: varchar("video", { length: 255 }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});