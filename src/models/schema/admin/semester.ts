import { mysqlTable, varchar, char, timestamp, double } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
// import { category } from "./category";
import { courses } from "./courses";

export const semesters = mysqlTable("semesters", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    courseId: char("course_id", { length: 255 }).notNull().references(() => courses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});