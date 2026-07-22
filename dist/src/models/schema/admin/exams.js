"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveExam = exports.SectionQuestions = exports.ExamSections = exports.Exams = exports.examType = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const questions_1 = require("./questions");
const rawScore_1 = require("./rawScore");
const courses_1 = require("./courses");
const examCodes_1 = require("./examCodes");
const sections_1 = require("./sections");
exports.examType = (0, mysql_core_1.mysqlEnum)("exam_type", ["static", "adaptive"]).notNull();
exports.Exams = (0, mysql_core_1.mysqlTable)("exams", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.varchar)("description", { length: 255 }),
    duration: (0, mysql_core_1.int)("duration").notNull(), // Duration in minutes
    totalScore: (0, mysql_core_1.int)("total_score").notNull(),
    passScore: (0, mysql_core_1.int)("pass_score").notNull(),
    rawScoreId: (0, mysql_core_1.char)("raw_score_id", { length: 255 }).notNull().references(() => rawScore_1.rawScore.id, { onDelete: "cascade" }),
    isActive: (0, mysql_core_1.boolean)("is_active").notNull().default(true),
    examType: exports.examType,
    // Details
    courseId: (0, mysql_core_1.char)("course_id", { length: 255 }).notNull().references(() => courses_1.courses.id, { onDelete: "cascade" }),
    year: (0, mysql_core_1.int)("year").notNull(),
    Month: (0, mysql_core_1.mysqlEnum)("month", ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]).notNull(),
    codeId: (0, mysql_core_1.char)("code_id", { length: 255 }).notNull().references(() => examCodes_1.examCodes.id, { onDelete: "cascade" }),
    // Calculators allowed for this exam (subset of CALCULATOR_TYPES)
    calculators: (0, mysql_core_1.json)("calculators").$type().default([]),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.ExamSections = (0, mysql_core_1.mysqlTable)("exam_sections", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    sectionId: (0, mysql_core_1.char)("section_id", { length: 255 }).notNull().references(() => sections_1.Sections.id, { onDelete: "cascade" }),
    sectionOrder: (0, mysql_core_1.int)("section_order").notNull(),
    examId: (0, mysql_core_1.char)("exam_id", { length: 255 }).notNull().references(() => exports.Exams.id, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.SectionQuestions = (0, mysql_core_1.mysqlTable)("section_questions", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    questionOrder: (0, mysql_core_1.int)("question_order").notNull(),
    sectionId: (0, mysql_core_1.char)("section_id", { length: 255 }).notNull().references(() => exports.ExamSections.id, { onDelete: "cascade" }),
    questionId: (0, mysql_core_1.char)("question_id", { length: 255 }).notNull().references(() => questions_1.questions.id, { onDelete: "cascade" }),
    score: (0, mysql_core_1.int)("score").notNull().default(0),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.AdaptiveExam = (0, mysql_core_1.mysqlTable)("adaptive_exam", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    examId: (0, mysql_core_1.char)("exam_id", { length: 255 }).notNull().references(() => exports.Exams.id, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
