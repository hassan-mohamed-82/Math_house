import { mysqlTable, varchar, char, timestamp, mysqlEnum, json } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { roles } from "./roles";
import { Permission } from "../../../types/custom";
import { category, courses } from "../../schema";

export const admins = mysqlTable("admins", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    avatar: varchar("avatar", { length: 500 }),
    categoryId: char("category_id", { length: 36 }).references(() => category.id),
    courseId: char("course_id", { length: 36 }).references(() => courses.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

