"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryById = exports.getAllCategory = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const Student_1 = require("../../models/schema/admin/Student");
const grade_1 = require("../../models/schema/admin/grade");
const getAllCategory = async (req, res) => {
    const studentId = req.user?.id;
    if (!studentId)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    const [student] = await connection_1.db
        .select({ categoryId: Student_1.Student.category, gradeId: Student_1.Student.grade })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (!student)
        throw new BadRequest_1.BadRequest("Student not found");
    // Get the category ID that corresponds to the student's grade
    const [studentGradeInfo] = await connection_1.db
        .select({ categoryId: grade_1.grade.categoryId })
        .from(grade_1.grade)
        .where((0, drizzle_orm_1.eq)(grade_1.grade.id, student.gradeId));
    const categories = await connection_1.db.select().from(schema_1.category);
    const categoryMap = new Map();
    const parentIds = new Set();
    categories.forEach(cat => {
        categoryMap.set(cat.id, cat);
        if (cat.parentCategoryId) {
            parentIds.add(cat.parentCategoryId);
        }
    });
    const isDescendant = (catId, targetAncestorId) => {
        let current = categoryMap.get(catId);
        while (current?.parentCategoryId) {
            if (current.parentCategoryId === targetAncestorId)
                return true;
            current = categoryMap.get(current.parentCategoryId);
        }
        return false;
    };
    const allowedSubcategoryIds = studentGradeInfo ? [studentGradeInfo.categoryId] : [];
    const filteredCategories = categories.filter(cat => {
        // Return the student's main category
        if (cat.id === student.categoryId)
            return true;
        // Return the sub-category that matches the student's grade
        if (allowedSubcategoryIds.includes(cat.id) && isDescendant(cat.id, student.categoryId)) {
            return true;
        }
        return false;
    });
    const data = filteredCategories.map(cat => {
        const ancestors = [];
        let current = cat;
        let level = 1;
        while (current.parentCategoryId) {
            const parent = categoryMap.get(current.parentCategoryId);
            if (parent) {
                ancestors.push({ id: parent.id, name: parent.name, level: level++ });
                current = parent;
            }
            else {
                break;
            }
        }
        const isLeaf = !parentIds.has(cat.id);
        return {
            ...cat,
            ancestors,
            isLeaf
        };
    });
    return (0, response_1.SuccessResponse)(res, { message: "Categories fetched successfully", data }, 200);
};
exports.getAllCategory = getAllCategory;
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Category id is required");
    }
    const categories = await connection_1.db.select().from(schema_1.category);
    const existingCategory = categories.find((c) => c.id === id);
    if (!existingCategory) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    const categoryMap = new Map();
    categories.forEach((cat) => categoryMap.set(cat.id, cat));
    const ancestors = [];
    let current = existingCategory;
    let level = 1;
    while (current.parentCategoryId) {
        const parent = categoryMap.get(current.parentCategoryId);
        if (parent) {
            ancestors.push({ id: parent.id, name: parent.name, level: level++ });
            current = parent;
        }
        else {
            break;
        }
    }
    const data = {
        ...existingCategory,
        ancestors,
    };
    return (0, response_1.SuccessResponse)(res, { message: "Category fetched successfully", data }, 200);
};
exports.getCategoryById = getCategoryById;
