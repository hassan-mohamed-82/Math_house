import { mysqlTable, varchar, char, timestamp, mysqlEnum, double, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { category } from "./category";
import { semesters } from "./semester";

export const courses = mysqlTable("courses", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    categoryId: char("category_id", { length: 255 }).notNull().references(() => category.id),
    // semesterId: char("semester_id", { length: 255 }).references(() => semesters.id),
    description: varchar("description", { length: 255 }),
    image: varchar("image", { length: 255 }),

    preRequisition: varchar("pre_requisition", { length: 255 }),
    whatYouGain: varchar("what_you_gain", { length: 255 }),

    isHaveSemester: boolean("is_have_semester").default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});