import { mysqlTable, varchar, char, timestamp, mysqlEnum, double, boolean, int } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { courses } from "../admin/courses";
import { semesters } from "../admin/semester";
import { chapters } from "../admin/chapters";
import { lessons } from "../admin/lessons";
import { payment } from "../admin/payment";
import { prices } from "../admin/prices";
import { v4 as uuidv4 } from "uuid";

export const enrolledItems = mysqlTable("enrolledItems", {
    id: char("id", { length: 255 }).primaryKey().$defaultFn(() => uuidv4()),
    studentId: char("studentId", { length: 255 }).notNull(),
    courseId: char("courseId", { length: 255 }).references(() => courses.id),
    semesterId: char("semesterId", { length: 255 }).references(() => semesters.id),
    chapterId: char("chapterId", { length: 255 }).references(() => chapters.id),
    lessonId: char("lessonId", { length: 255 }).references(() => lessons.id),
    paymentId: char("paymentId", { length: 255 }).references(() => payment.id),
    priceId: char("priceId", { length: 36 }).references(() => prices.id),
    expiresAt: timestamp("expiresAt"),
    status: mysqlEnum("status", ["active", "pending", "expired"]).default("active"),
    createdAt: timestamp("createdAt").defaultNow(),
});