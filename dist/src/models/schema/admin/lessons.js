"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lessonIdeas = exports.lessons = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const courses_1 = require("./courses");
const category_1 = require("./category");
const teacher_1 = require("./teacher");
const chapters_1 = require("./chapters");
exports.lessons = (0, mysql_core_1.mysqlTable)("lessons", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    categoryId: (0, mysql_core_1.char)("category_id", { length: 255 }).notNull().references(() => category_1.category.id),
    courseId: (0, mysql_core_1.char)("course_id", { length: 255 }).notNull().references(() => courses_1.courses.id),
    chapterId: (0, mysql_core_1.char)("chapter_id", { length: 255 }).notNull().references(() => chapters_1.chapters.id),
    description: (0, mysql_core_1.varchar)("description", { length: 255 }),
    image: (0, mysql_core_1.varchar)("image", { length: 255 }),
    teacherId: (0, mysql_core_1.char)("teacher_id", { length: 255 }).notNull().references(() => teacher_1.teachers.id),
    order: (0, mysql_core_1.int)("order").notNull(),
    preRequisition: (0, mysql_core_1.varchar)("pre_requisition", { length: 255 }),
    whatYouGain: (0, mysql_core_1.varchar)("what_you_gain", { length: 255 }),
    // Pricing
    price: (0, mysql_core_1.double)("price").notNull(),
    discount: (0, mysql_core_1.double)("discount").default(0),
    totalPrice: (0, mysql_core_1.double)("total_amount").generatedAlwaysAs((0, drizzle_orm_1.sql) `price - COALESCE(discount, 0)`),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.lessonIdeas = (0, mysql_core_1.mysqlTable)("lesson_ideas", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    idea: (0, mysql_core_1.varchar)("idea", { length: 255 }).notNull(),
    lessonId: (0, mysql_core_1.char)("lesson_id", { length: 255 }).notNull().references(() => exports.lessons.id),
    ideaOrder: (0, mysql_core_1.int)("idea_order").notNull(),
    pdf: (0, mysql_core_1.varchar)("pdf", { length: 255 }),
    video: (0, mysql_core_1.varchar)("video", { length: 255 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
