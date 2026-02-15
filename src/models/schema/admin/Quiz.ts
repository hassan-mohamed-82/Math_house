import { mysqlTable, varchar, char, timestamp, int, boolean, text } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { category } from "./category";
import { courses } from "./courses";
import { chapters } from "./chapters";
import { lessons } from "./lessons";
import { questions } from "./questions";

export const quizzes = mysqlTable("quizzes", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    durationHours: int("duration_hours").default(0),
    durationMinutes: int("duration_minutes").default(0),
    totalScore: int("total_score").default(100),
    passScore: int("pass_score").default(50),
    quizOrder: int("quiz_order").default(0),
    isActive: boolean("is_active").default(false),
    categoryId: char("category_id", { length: 255 }).references(() => category.id),
    courseId: char("course_id", { length: 255 }).references(() => courses.id),
    chapterId: char("chapter_id", { length: 255 }).references(() => chapters.id),
    lessonId: char("lesson_id", { length: 255 }).references(() => lessons.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const quizQuestions = mysqlTable("quiz_questions", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    quizId: char("quiz_id", { length: 255 }).notNull().references(() => quizzes.id),
    questionId: char("question_id", { length: 255 }).notNull().references(() => questions.id),
    questionOrder: int("question_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
});