"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizQuestions = exports.quizzes = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const category_1 = require("./category");
const courses_1 = require("./courses");
const chapters_1 = require("./chapters");
const lessons_1 = require("./lessons");
const questions_1 = require("./questions");
exports.quizzes = (0, mysql_core_1.mysqlTable)("quizzes", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    durationHours: (0, mysql_core_1.int)("duration_hours").default(0),
    durationMinutes: (0, mysql_core_1.int)("duration_minutes").default(0),
    totalScore: (0, mysql_core_1.int)("total_score").default(100),
    passScore: (0, mysql_core_1.int)("pass_score").default(50),
    quizOrder: (0, mysql_core_1.int)("quiz_order").default(0),
    isActive: (0, mysql_core_1.boolean)("is_active").default(false),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 255 }).references(() => category_1.category.id),
    courseId: (0, mysql_core_1.char)("course_id", { length: 255 }).references(() => courses_1.courses.id),
    chapterId: (0, mysql_core_1.char)("chapter_id", { length: 255 }).references(() => chapters_1.chapters.id),
    lessonId: (0, mysql_core_1.char)("lesson_id", { length: 255 }).references(() => lessons_1.lessons.id),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.quizQuestions = (0, mysql_core_1.mysqlTable)("quiz_questions", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    quizId: (0, mysql_core_1.char)("quiz_id", { length: 255 }).notNull().references(() => exports.quizzes.id),
    questionId: (0, mysql_core_1.char)("question_id", { length: 255 }).notNull().references(() => questions_1.questions.id),
    questionOrder: (0, mysql_core_1.int)("question_order").default(0),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
